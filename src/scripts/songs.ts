// src/scripts/songs.ts — gira o carrossel de capas e abre o modal da música.
//
// A divisão é a mesma do resto do site: este arquivo não conhece nenhum texto
// (ele sai do HTML que o Songs.astro já desenhou) e o componente não sabe onde
// cada capa para. O que passa entre os dois é um índice.
//
// Duas coisas moram aqui e em nenhum outro lugar:
//   • a POSE de cada capa — a conta que transforma "está a 2 de distância da
//     que está de frente" em translate/rotate/opacity. Fica em JS, e não em
//     classes de CSS, porque a lista tem tamanho variável: três hoje, sete
//     amanhã, sem uma regra nova por posição;
//   • o LOCK da rolagem ao abrir o modal (ver scripts/scroll.ts);
//   • o CICLO DE VIDA do player do YouTube — ele nasce quando o modal abre e
//     morre quando o modal fecha.
//
// Sem JS nada disto roda, e o que fica na tela é a tira rolável que já estava
// no documento — o mesmo caminho do carrossel de jogos.
import { lockScroll, unlockScroll } from './scroll';

/** px de folga entre toque e arrasto: acima disso o gesto foi arrasto */
const CLICK_SLOP = 6;
/** px de arrasto que valem uma troca de capa */
const DRAG_STEP = 90;
/** trava a roda lateral por um instante depois de cada passo */
const WHEEL_LOCK = 320;
/** janela em que um `click` é entendido como eco do toque já tratado */
const ECHO = 700;

// ——————————————————————————————————————————————————————————————
// o player
// ——————————————————————————————————————————————————————————————
//
// A música toca INTEIRA, e por isso ela não é nossa: quem reproduz é o YouTube,
// dentro do modal. Hospedar o arquivo aqui seria distribuir gravação alheia; o
// embed é o caminho que a licença já cobre — e de quebra a barra de posição, o
// volume e o teclado do player vêm prontos, em vez de um transporte nosso por
// cima de um <audio>.
//
// TUDO é adiado até o primeiro modal abrir: o script do YouTube, o iframe, os
// cookies. Uma página que ninguém abriu não pede nada a eles. O host é o
// youtube-nocookie.com, que é o mesmo player sem o rastreio de quem só passou.
//
// E o player MORRE no fecho do modal. Não é limpeza cosmética: o <dialog>
// fechado vira `display: none`, e um iframe escondido continua tocando — o som
// seguiria pela página sem nada na tela pra pará-lo.

/** só o que de fato usamos da API — melhor que puxar @types/youtube inteiro
 *  como dependência pra três chamadas */
type YTPlayer = { destroy(): void };
type YTApi = {
  Player: new (
    host: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number>;
      events?: { onError?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTApi> | null = null;
let player: YTPlayer | null = null;

/** carrega o script do YouTube uma vez só, na primeira abertura */
function loadApi(): Promise<YTApi> {
  if (api) return api;

  api = new Promise<YTApi>((resolve, reject) => {
    // O callback é global e tem ESTE nome porque é o script deles que o chama,
    // pelo nome, quando termina de carregar. Não há como pedir outro.
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => reject(new Error('The YouTube script failed to load'));
    document.head.appendChild(tag);
  });

  return api;
}

// O player NASCE NO TOQUE do botão de cartaz, e não na abertura do modal.
//
// A razão está no comentário do Songs.astro, junto do botão: um iframe de outra
// origem dentro do modal não recebe toque, e o play de dentro dele fica
// inalcançável no celular. Aqui o primeiro toque é num <button> nosso, e o
// player já nasce tocando — a pessoa nunca precisa acertar nada dentro do
// iframe pra música começar.
//
// `autoplay: 1` é seguro justamente por isso: ele só entra em cena no gesto de
// quem pediu, nunca na abertura do modal. Nada toca sozinho.
async function tocar(frame: HTMLElement) {
  const id = frame.dataset.songVideo;
  const slot = frame.querySelector<HTMLElement>('.song-video-slot');
  const botao = frame.querySelector<HTMLElement>('[data-song-play]');
  if (!id || !slot || player) return;           // `player` já existe: um só por vez

  let YT: YTApi;
  try {
    YT = await loadApi();
  } catch (e) {
    saidaDeEmergencia(frame, id);
    return;
  }

  // o modal pode ter fechado enquanto o script vinha da rede — sem este teste o
  // player nasceria num <dialog> já fechado e tocaria invisível
  if (!frame.closest('dialog')?.open) return;

  // O YT.Player SUBSTITUI pelo iframe o elemento que recebe. Por isso ele nunca
  // recebe o slot, e sim um filho descartável: o slot precisa sobreviver pra
  // próxima abertura.
  const alvo = document.createElement('div');
  slot.replaceChildren(alvo);
  if (botao) botao.hidden = true;

  player = new YT.Player(alvo, {
    videoId: id,
    host: 'https://www.youtube-nocookie.com',
    // rel: 0 mantém as sugestões do fim dentro do mesmo canal; modestbranding
    // tira o logo do canto
    playerVars: { rel: 0, playsinline: 1, modestbranding: 1, autoplay: 1 },
    events: {
      // Erro 101/150 é o dono do vídeo proibindo o embed — e isso pode passar a
      // valer DEPOIS de tudo conferido, sem aviso. Sem este tratamento o que
      // sobra na tela é um retângulo cinza sem explicação nenhuma.
      onError: () => saidaDeEmergencia(frame, id),
    },
  });
}

function fecharPlayer(dialog: HTMLDialogElement) {
  player?.destroy();
  player = null;

  const frame = dialog.querySelector<HTMLElement>('[data-song-video]');
  if (!frame) return;

  // o slot volta vazio (o destroy() leva o iframe, mas um fallback deixado por
  // saidaDeEmergencia continuaria ali) e o cartaz reaparece pra próxima vez
  frame.querySelector('.song-video-slot')?.replaceChildren();
  const botao = frame.querySelector<HTMLElement>('[data-song-play]');
  if (botao) botao.hidden = false;
}

/** quando o embed não vai rolar, o link é melhor que um buraco cinza */
function saidaDeEmergencia(frame: HTMLElement, id: string) {
  const a = document.createElement('a');
  a.className = 'song-video-out';
  a.href = `https://www.youtube.com/watch?v=${id}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'Listen on YouTube ↗';

  // no slot, e não na moldura inteira: o cartaz é irmão dele e sai pelo hidden,
  // senão o link nasceria escondido atrás da capa
  frame.querySelector('.song-video-slot')?.replaceChildren(a);
  const botao = frame.querySelector<HTMLElement>('[data-song-play]');
  if (botao) botao.hidden = true;
}

export function initSongs() {
  document.querySelectorAll<HTMLElement>('[data-songs]').forEach(mount);

  // Delegado: o botão do cartaz vive dentro de cada <dialog>, que fica fora do
  // carrossel, e o modal pode reabrir muitas vezes. Um handler no documento
  // atende todos sem religar nada a cada abertura.
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const frame = e.target.closest('[data-song-play]')?.closest<HTMLElement>('[data-song-video]');
    if (frame) tocar(frame);
  });
}

const pad = (n: number) => String(n).padStart(2, '0');

function mount(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-songs-stage]');
  const items = [...root.querySelectorAll<HTMLElement>('[data-songs-item]')];
  const titleEl = root.querySelector<HTMLElement>('[data-songs-title]');
  const countEl = root.querySelector<HTMLElement>('[data-songs-count]');
  const prev = root.querySelector<HTMLButtonElement>('[data-songs-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-songs-next]');
  if (!stage || !items.length || !titleEl || !countEl || !prev || !next) return;

  // A tira rolável sai de cena e o palco 3D assume. As <img> são as MESMAS —
  // nada é baixado duas vezes, só reposicionado.
  root.classList.add('is-js');

  let active = 0;

  // ——— a pose de cada capa ———
  //
  // `d` é a distância assinada até a capa de frente. Tudo abaixo é função só
  // dele: a que está de frente fica reta e acesa, as vizinhas se afastam,
  // giram de lado, afundam no eixo Z e escurecem.
  //
  // O afastamento não é linear (62%, depois +46% por passo): o primeiro salto
  // é maior pra abrir espaço em volta da capa de frente, e os seguintes são
  // menores pra fila do fundo se comprimir em vez de sair voando pela tela.
  function render() {
    items.forEach((item, i) => {
      const d = i - active;
      const far = Math.abs(d);
      const s = Math.sign(d);

      const x = far === 0 ? 0 : s * (62 + (far - 1) * 46);
      const z = -far * 90;
      const ry = far === 0 ? 0 : -s * 44;
      const scale = far === 0 ? 1 : 0.92;

      item.style.transform =
        `translateX(${x}%) translateZ(${z}px) rotateY(${ry}deg) scale(${scale})`;
      item.style.opacity = String(Math.max(0.22, 1 - far * 0.22));
      item.style.zIndex = String(items.length - far);
      item.classList.toggle('is-active', far === 0);

      // Só a capa de frente é parada de Tab: as vizinhas estão ali como
      // profundidade, e quem navega pelo teclado troca de capa nas setas da
      // legenda, não passeando por cima de uma pilha de botões.
      const btn = item.querySelector('button');
      if (btn) btn.tabIndex = far === 0 ? 0 : -1;
    });

    const card = items[active];
    titleEl.textContent = card.dataset.songsLabel ?? '';
    countEl.textContent = `${pad(active + 1)} / ${pad(items.length)}`;

    // o carrossel tem pontas: nos extremos o botão diz que não há pra onde ir
    prev.disabled = active === 0;
    next.disabled = active === items.length - 1;
  }

  function goTo(i: number) {
    const clamped = Math.min(Math.max(i, 0), items.length - 1);
    if (clamped === active) return;
    active = clamped;
    render();
  }

  const step = (dir: number) => goTo(active + dir);

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  // ——— o que um toque na capa faz ———
  //
  // Vizinha vem pra frente; a que já está de frente abre o modal. Duas ações no
  // mesmo gesto, e é o índice que decide qual — não um botão diferente.
  function activate(i: number) {
    if (i !== active) { goTo(i); return; }

    const btn = items[i].querySelector<HTMLButtonElement>('[data-songs-open]');
    const id = btn?.dataset.songsOpen;
    const dialog = id ? document.getElementById(id) : null;

    if (!btn || !(dialog instanceof HTMLDialogElement)) {
      console.warn('[songs] modal not found:', id);
      return;
    }
    openModal(dialog, btn);
  }

  /** qual capa está sob este ponto da tela (respeita o empilhamento) */
  function activateAt(x: number, y: number) {
    const item = document.elementFromPoint(x, y)?.closest('[data-songs-item]');
    const i = item ? items.indexOf(item as HTMLElement) : -1;
    if (i >= 0) activate(i);
  }

  // ——— gesto ———
  //
  // NADA de setPointerCapture aqui, e essa ausência é o que faz o clique
  // funcionar: com a captura no palco, o `mouseup` de compatibilidade também é
  // retargetado pra ele, e o navegador dispara o `click` no ancestral comum de
  // mousedown/mouseup — ou seja, no palco. O botão da capa nunca via o evento.
  //
  // Por isso o toque não é tratado no `click` do botão, mas no pointerup, com
  // um teste de ponto: é o caminho que não depende de onde o navegador decidiu
  // que o clique nasceu. O `click` do botão continua ligado, mas só pro
  // TECLADO (ver mais abaixo).
  //
  // Enquanto o dedo arrasta, a cada DRAG_STEP px a fila anda uma capa e a
  // origem é remarcada: o giro acompanha o gesto em vez de esperar a soltura.
  let dragging = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let moved = false;
  let lastPointerUp = 0;

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_SLOP) moved = true;

    const dx = e.clientX - lastX;
    if (Math.abs(dx) < DRAG_STEP) return;
    // puxar pra esquerda traz a próxima: a fila segue o dedo
    step(dx < 0 ? 1 : -1);
    lastX = e.clientX;
  };

  const onUp = (e: PointerEvent) => {
    // Os três saem da JANELA, e não do palco: sem captura, um arrasto que
    // termina fora do bloco (ou fora da aba) precisa de alguém que ainda
    // escute pra soltar o estado. E saem ANTES de qualquer return, senão um
    // gesto abandonado deixa a janela ouvindo pra sempre.
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);

    if (!dragging) return;
    dragging = false;
    lastPointerUp = performance.now();

    if (moved || e.type === 'pointercancel') return;
    activateAt(e.clientX, e.clientY);
  };

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    moved = false;
    downX = lastX = e.clientX;
    downY = e.clientY;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });

  // Só o clique do TECLADO chega a valer aqui: Enter/Espaço (e o clique
  // sintético de um leitor de tela) vêm com detail 0 e sem pointerup antes. O
  // do ponteiro já foi tratado lá em cima, e deixá-lo passar de novo abriria o
  // modal de uma vizinha que o toque tinha acabado de trazer pra frente.
  items.forEach((item, i) => {
    item.querySelector<HTMLButtonElement>('[data-songs-open]')
      ?.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        if (performance.now() - lastPointerUp < ECHO) return;
        activate(i);
      });
  });

  // Só o gesto HORIZONTAL é nosso — o vertical é da página, sempre. Este bloco
  // está no meio de um texto longo; consumir o deltaY prenderia a leitura toda
  // vez que o ponteiro passasse por cima das capas.
  let wheelLock = 0;
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();       // sem isto o gesto lateral vira "voltar página"
    const now = performance.now();
    if (now < wheelLock) return;
    wheelLock = now + WHEEL_LOCK;
    step(e.deltaX > 0 ? 1 : -1);
  }, { passive: false });

  // As setas do teclado valem com o foco em qualquer lugar do bloco (a capa da
  // frente, os botões da legenda). O modal fica FORA deste elemento, então uma
  // seta apertada com ele aberto não gira o carrossel por baixo.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else return;
    e.preventDefault();
  });

  render();
}

// ——— o modal ———
//
// `<dialog>` nativo: o Esc, o foco preso dentro e o inerte de tudo que está
// atrás são do navegador, não nossos. O que sobra pra nós é o fecho no clique
// do fundo, a rolagem da página e devolver o foco pra capa.
function openModal(dialog: HTMLDialogElement, opener: HTMLElement) {
  if (dialog.open) return;

  // guardado por id porque o `close` pode vir muito depois deste clique
  if (!opener.id) opener.id = `${dialog.id}-opener`;
  dialog.dataset.opener = opener.id;

  bindModal(dialog);
  lockScroll();
  dialog.showModal();

  // O modal nasce entre o pointerup e o click do MESMO toque. O alvo do click
  // já foi decidido antes (a capa), então ele não deveria cair no backdrop —
  // mas se cair, fecharia o modal no quadro seguinte ao de abrir, e o sintoma
  // seria "o modal não abre". O carimbo abaixo é o que descarta esse eco.
  dialog.dataset.openedAt = String(performance.now());
}

function bindModal(dialog: HTMLDialogElement) {
  if (dialog.dataset.bound) return;
  dialog.dataset.bound = 'true';

  // O `close` cobre TODAS as saídas — o X, o clique no fundo e o Esc, que não
  // passa por handler nenhum nosso.
  dialog.addEventListener('close', () => {
    unlockScroll();
    fecharPlayer(dialog);
    // o navegador costuma devolver o foco sozinho, mas não em todos — e um
    // foco perdido no <body> jogaria a próxima tecla Tab pro topo da página
    const back = dialog.dataset.opener;
    if (back) document.getElementById(back)?.focus();
  });

  // O clique no fundo chega com o próprio <dialog> como alvo: o conteúdo
  // inteiro mora num filho, então tudo que é clicável tem alvo mais fundo e
  // sobra só o backdrop aqui.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    if (performance.now() - Number(dialog.dataset.openedAt ?? 0) < 250) return;
    dialog.close();
  });

  dialog
    .querySelector('[data-songs-close]')
    ?.addEventListener('click', () => dialog.close());
}
