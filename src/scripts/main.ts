// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis, do
// Carousel e da abertura do About.
import Lenis from 'lenis';
import gsap from 'gsap';
import { Carousel } from '../components/carousel/Carousel';
import { ABOUT, DEPART, SECTIONS } from '../components/carousel/config';
import { SEAM_ENTRY_KEY, SEAM_OVERSCAN } from '../data/gallery';
import { setProgress, hideLoader, awaitGate } from './loading';
import { reducedMotion } from './motion';
import { registerScroll } from './scroll';

// Esta chegada à home veio de DENTRO do site? (o "‹ Voltar" do /photos, o
// botão voltar do navegador.) A distinção importa porque uma volta não é uma
// chegada: quem volta já respondeu ao portão e já viu a descida da câmera —
// re-encenar os dois transforma um passo atrás numa reabertura do site
// inteiro. Reload (F5) e visita nova contam como chegada de verdade: o portão
// pergunta e a entrada roda inteira.
function isInternalArrival(): boolean {
  const nav = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  if (nav?.type === 'back_forward') return true;   // botão do navegador
  if (nav?.type === 'reload') return false;        // F5 é recomeço, não volta
  try {
    // navegação normal: veio de outra página DESTE site (ex.: /photos)?
    return !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}

export async function bootstrap() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (!canvas) return;

  // Numa volta interna a escolha da sessão vale sem perguntar; numa chegada
  // de verdade o portão pergunta, como sempre.
  const internal = isInternalArrival();

  // O portão é armado ANTES do carregamento e só esperado depois: a pergunta
  // fica na tela enquanto as fotos baixam, então a escolha corre em paralelo e
  // não vira tempo de espera somado.
  const gate = awaitGate(internal);

  window.addEventListener('carousel:progress', (e) => {
    const { loaded, total } = (e as CustomEvent).detail;
    setProgress(total ? loaded / total : 0);
  });

  // Lenis vive aqui (um só dono). O render loop do Carousel chama lenis.raf,
  // então não precisamos de um requestAnimationFrame separado só pra ele.
  const lenis = new Lenis();

  // O modal das músicas precisa PARAR a rolagem enquanto está aberto, e não tem
  // (nem deve ter) o Lenis na mão — ver scripts/scroll.ts.
  registerScroll(lenis);

  const carousel = new Carousel();

  // A ordem aqui é a coreografia da abertura, e cada passo espera o anterior:
  await carousel.init(canvas, lenis);   // fotos, fonte e shaders — atrás da cortina
  carousel.run();                       // cena viva na pose de topo
  await gate;                           // a cortina não sai sem a escolha feita
  await hideLoader();                   // cortina sai, mostrando o anel de cima

  // câmera desce até a foto inicial — ou já nasce lá, em baixa animação E na
  // volta interna: quem está voltando do /photos já assistiu à descida, e
  // repeti-la é o que fazia o "voltar" parecer o site carregando do zero
  if (reducedMotion() || internal) carousel.revealInstant();
  else await carousel.reveal();

  // a linha do topo e os cantos (hora / frase) entram por último, com a cena já parada
  document
    .querySelectorAll('[data-intro], [data-hud]')
    .forEach((el) => el.classList.add('is-in'));

  initAbout(carousel, lenis);
  initPhotosLink(carousel);
}

// ——— Photos: página própria (/photos), aberta pelo clique no anel ———
//
// Ao contrário do About, aqui não há painel na mesma página: é navegação de
// verdade, MPA. A escolha é deliberada — sair da home destrói o render loop
// do Three.js e o Lenis sem nenhum teardown manual.
//
// A transição é uma EMENDA, e não um cross-fade entre duas telas diferentes: o
// avanço desenrola o segmento e termina com a mesma foto chapada, cobrindo a
// tela; a página de fotos abre nesse enquadramento e recua dali até o lugar
// dela na parede (ver scripts/photos/main.ts → enterFromSeam). No quadro
// da troca as duas páginas mostram a mesma imagem, então não há o que costurar:
// a emenda não se vê porque não existe. Isso vale inclusive onde não há view
// transition cross-document (Firefox), que ali degrada pra um corte seco — e um
// corte entre dois quadros idênticos é invisível.
/** Põe a foto chapada no QUADRO DA EMENDA — cobrindo a tela na proporção da
 *  FITA, centralizada — e devolve essa medida. É o estado final do avanço e o
 *  estado inicial da página de fotos: os dois documentos desenham o mesmo
 *  retângulo antes de /photos devolver a imagem à proporção natural.
 *
 *  A proporção vem do build (data-aspect), e não do naturalWidth: no pior caso
 *  a foto ainda está baixando quando alguém clica, e uma medida errada aí
 *  desmontaria justamente a emenda. */
function seamBox(flat: HTMLImageElement): { w: number; h: number } | null {
  const aspect = Number(flat.dataset.aspect);
  if (!aspect) return null;

  // A troca de documento acontece ainda dentro da foto, não com a borda dela
  // encostada no viewport. /photos começa com exatamente a mesma sobra.
  const w = Math.max(window.innerWidth, window.innerHeight * aspect) * SEAM_OVERSCAN;
  const h = w / aspect;
  flat.style.width = `${w}px`;
  flat.style.height = `${h}px`;
  flat.style.left = `${(window.innerWidth - w) / 2}px`;
  flat.style.top = `${(window.innerHeight - h) / 2}px`;
  return { w, h };
}

function initPhotosLink(carousel: Carousel) {
  let leaving = false;   // clique duplo não pode empilhar duas navegações

  const flat = document.querySelector<HTMLImageElement>('[data-depart]');

  // A foto chapada é pedida quando o anel ENCOSTA na seção de fotos, não no
  // clique: baixar 2400px de imagem no clique seria tarde (o mergulho dura
  // menos de um segundo) e baixar no carregamento seria cedo demais — a home
  // faria todo mundo pagar por uma transição que a maioria não vai ver. Parar
  // na seção é a intenção mais barata que existe, e depois dela sobra tempo de
  // rede ocioso de sobra. O decode antecipa também a decodificação, que é o que
  // de fato apareceria como engasgo no primeiro quadro da imagem.
  const arm = () => {
    if (!flat?.dataset.src || flat.src) return;
    flat.src = flat.dataset.src;
    flat.decode?.().catch(() => {});
  };
  window.addEventListener('carousel:change', (e) => {
    if (SECTIONS[(e as CustomEvent).detail?.index]?.id === 'photos') arm();
  });

  window.addEventListener('section:open', async (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.id !== 'photos' || leaving) return;
    leaving = true;

    // baixa animação: sem mergulho — navega seco, como pediu quem escolheu.
    // Sem o marcador, a página de fotos também abre seca, sem recuo: as duas
    // pontas da emenda respondem à mesma escolha.
    if (!reducedMotion()) {
      // a HUD sai antes do impacto, com a MESMA classe do mergulho do About:
      // linha do topo e card não podem ficar boiando sobre a foto crescendo
      document.body.classList.add('is-diving');
      arm();   // clique numa foto de lado, sem passar pela seção: última chance

      // A foto chapada entra na MESMA timeline do mergulho, ancorada no fim
      // dele: é isso que faz a imagem terminar de cobrir a tela no quadro em
      // que a câmera para, e não um punhado de milissegundos depois — que é o
      // tanto que basta pra emenda virar um pisca.
      // O QUADRO DA EMENDA: a foto cobrindo a tela na proporção da fita já
      // desenrolada. /photos monta este mesmo retângulo antes de começar o
      // recuo, então a navegação troca documentos sem trocar o quadro.
      const seam = flat && seamBox(flat);

      // Quem desenha a segunda metade do avanço.
      //
      // Ela não "assume" o movimento: ela GRUDA nele. A cada quadro a foto 3D é
      // medida na tela, e a chapada é desenhada entre essa medida e o quadro da
      // emenda, com um peso que sai do zero DEVAGAR (smoothstep tem derivada
      // nula nas duas pontas). O efeito é que ela nasce exatamente do tamanho da
      // foto que está substituindo E crescendo no mesmo ritmo, e só depois se
      // desprende, em direção à tela cheia.
      //
      // A alternativa óbvia — medir a foto 3D uma vez e interpolar dali até a
      // emenda — é o que estava aqui antes, e tem um defeito que só aparece
      // medindo: as duas metades do avanço não crescem no mesmo ritmo (a 3D
      // ainda tem 1,2x pela frente, a chapada tem 1,4x em menos tempo), então a
      // troca de mãos dobrava a velocidade do zoom num quadro só. Tamanho igual
      // e velocidade diferente ainda é um tranco.
      const drawFlat = (p: number) => {
        if (!flat || !seam || p < DEPART.flatAt) return;

        const k = Math.min(1, (p - DEPART.flatAt) / (1 - DEPART.flatAt));
        const now = carousel.frontPhotoSize();       // a foto 3D NESTE quadro

        // smootherstep, e não o smoothstep comum: a derivada dele sai do zero
        // MAIS devagar (30k²(1−k)² contra 6k(1−k)), e é justo no comecinho que
        // o desprendimento aparece — a distância que falta pra tela cheia é
        // grande, então um peso que cresce rápido demais vira aceleração
        // repentina mesmo saindo do zero. O tempo perdido aqui é devolvido no
        // meio da curva, onde o avanço já está veloz e ninguém repara.
        const w = k * k * k * (k * (k * 6 - 15) + 10);

        flat.style.transform =
          `scale(${(now.w + (seam.w - now.w) * w) / seam.w}, ` +
          `${(now.h + (seam.h - now.h) * w) / seam.h})`;

        // o crossfade também por smoothstep: ele atravessa depressa a faixa do
        // meio, que é onde as duas imagens aparecem somadas — a fita é curva e
        // a chapada não, então o miolo delas nunca casa perfeitamente, e o que
        // dá pra fazer é passar rápido por ali, no ponto mais veloz do avanço
        const f = Math.min(1, k / DEPART.flatFade);
        flat.style.opacity = `${f * f * (3 - 2 * f)}`;
      };

      const tl = carousel.departInto(detail.index, drawFlat);
      tl.to({}, { duration: DEPART.hold });   // o pouso, com a tela já coberta
      await tl;

      // o recado pra página de fotos: esta chegada tem de onde continuar.
      // Quem lê (e apaga) é o script inline de lá, antes do primeiro pixel.
      try { sessionStorage.setItem(SEAM_ENTRY_KEY, '1'); } catch {}
    }
    location.href = '/photos';
  });

  // Botão VOLTAR do navegador: o Chrome pode servir a home direto do BFCache,
  // congelada exatamente como ela estava ao partir — câmera no meio do
  // mergulho, gesto travado, HUD apagada, e agora também a foto chapada parada
  // em cima de tudo. Este é o único lugar que sabe desfazer isso. (Na navegação
  // normal pelo "‹ Voltar" da página de fotos, a home recarrega do zero e nada
  // disto roda.)
  window.addEventListener('pageshow', (e) => {
    if (!(e as PageTransitionEvent).persisted || !leaving) return;
    leaving = false;
    document.body.classList.remove('is-diving');
    if (flat) {
      flat.style.opacity = '0';
      flat.style.transform = 'none';
    }
    carousel.cancelDeparture();
  });
}

// ——— About: mesma página, aberta pela descida ———
//
// Tudo aqui é DOM e histórico; quem faz o 3D é o Carousel. A divisão importa:
// a cena não sabe que existe um About em HTML, e este arquivo não sabe como um
// caco de vidro voa. O que os dois compartilham é UM RELÓGIO: enterAbout()
// devolve a timeline da coreografia, e a subida do painel é pendurada nela.
//
// A ORDEM: o painel sobe DEPOIS que o estilhaço termina, não junto. Ele já
// existe desde o começo, mas parado fora da tela (y = innerHeight), então o
// vidro quebra e assenta num quadro limpo — sem o conteúdo do About passando
// por cima e lavando a cena de branco.
//
// A subida ficar na MESMA timeline (e não num gsap.to solto depois do await) é
// o que mantém o fechamento de graça: closeAbout() só roda tl.reverse(), e o
// painel desce junto com o vidro se recolhendo, na ordem inversa exata.
//
// O custo é a abertura ficar mais longa — as duas fases agora são sequenciais.
// O que não pode voltar é um vão parado no meio: a subida começa no quadro
// seguinte ao fim do vidro, então nunca há um frame em que nada se move.
function initAbout(carousel: Carousel, lenis: Lenis) {
  const panel = document.querySelector<HTMLElement>('[data-about]');
  if (!panel) return;

  let open = false;
  let busy = false;   // trava a coreografia enquanto ela roda (clique duplo, hash, etc.)
  let tl: gsap.core.Timeline | null = null;

  // A seta do pé da tela (ver index.astro → .about-hint). Ela diz uma coisa só,
  // e é literal: AINDA TEM PÁGINA EMBAIXO. Então fica enquanto isso for
  // verdade, e some quando deixa de ser — no fim do rolo, e só lá. Não é uma
  // dica de primeiro quadro: quem para no meio pra ler um tópico continua
  // vendo que a página não acabou ali.
  //
  // Como ela responde ao ESTADO (e não a um gesto), voltar a subir a traz de
  // volta sozinha. É a mesma conta nos dois lugares que a chamam, e por isso
  // ela vive numa função só.
  const hint = panel.querySelector<HTMLElement>('[data-about-hint]');
  /** px que faltam pro fim e já contam como "chegou" — o rolo suave raramente
   *  para no zero exato, e sem essa folga a seta ficaria acesa no último quadro */
  const HINT_END = 80;

  function syncHint() {
    // `limit` é o fim do rolo; `limit - scroll` é o que ainda falta. Quando a
    // página inteira cabe na tela isso já nasce em 0 — a seta não aparece, e
    // não precisa de um caso à parte pra isso. (Exige um lenis.resize() antes:
    // quem chama daqui já fez o dele; nas rolagens ele já está medido.)
    hint?.classList.toggle('is-gone', lenis.limit - lenis.scroll <= HINT_END);
  }

  // A moldura rola junto com a página e sai de cena.
  // A posição vem do lenis.scroll, e não do window.scrollY: é o valor
  // interpolado que a rolagem suave está de fato mostrando neste frame, e ler
  // dele evita ainda forçar um layout a cada evento.
  const onScroll = () => {
    carousel.setBorderScroll(lenis.scroll);
    syncHint();
  };

  // estado final sem coreografia: o deep-link (/#about), onde não há foto na
  // tela pra mergulhar, e a baixa animação, onde não se quer o mergulho
  function settleOpen() {
    document.body.classList.add('is-about');
    panel.hidden = false;
    lenis.resize();
    syncHint();
    lenis.on('scroll', onScroll);
    open = true;
  }

  async function openAbout(push = true) {
    if (open || busy) return;
    busy = true;

    if (push && location.hash !== '#about') history.pushState(null, '', '#about');

    // baixa animação: o About simplesmente está aberto. Sem mergulho de câmera,
    // sem estilhaço — a moldura aparece montada e o texto já está lá.
    if (reducedMotion()) {
      carousel.enterAboutInstant();
      settleOpen();
      busy = false;
      return;
    }

    // a UI do carrossel sai antes do impacto (ver index.astro .is-diving)
    document.body.classList.add('is-diving');

    // O painel é montado AQUI, no começo, mas parado embaixo da dobra: ele
    // precisa estar no fluxo pro GSAP medir e pro Lenis dimensionar a página,
    // e y = innerHeight garante que fique inteiro fora da tela até a hora dele.
    // is-descending segura o overflow enquanto o transform está ativo: sem ele
    // o deslocamento viraria barra de rolagem e um salto no fim.
    // visibility (e não opacity nem hidden): some de verdade da tela, mas
    // continua ocupando layout — o Lenis precisa da altura pra dimensionar a
    // página, e display: none tiraria isso do fluxo.
    gsap.set(panel, { y: window.innerHeight, visibility: 'hidden' });
    panel.hidden = false;
    document.body.classList.add('is-about', 'is-descending');
    lenis.stop();                          // a descida é automática; sem gesto por cima
    lenis.scrollTo(0, { immediate: true, force: true });  // force: o stop() acima já vale
    lenis.resize();

    tl = carousel.enterAbout();
    // Sem posição: entra na fila DEPOIS de toda a coreografia do vidro. Antes
    // isto vinha ancorado no label 'descent', que roda junto com o estilhaço —
    // e era isso que punha o conteúdo do About por cima dos cacos ainda no ar,
    // lavando a cena de branco.
    // volta a existir só no quadro em que começa a subir. Como é um .set()
    // dentro da timeline, o reverse do fechamento o desfaz sozinho: o painel
    // some de novo assim que os cacos começam a se recolher.
    tl.set(panel, { visibility: 'visible' });
    tl.to(panel, {
      y: 0,
      duration: ABOUT.descentDur,
      ease: ABOUT.descentEase,
    });
    await tl;

    // o painel já está em y:0 com scrollTop 0, então soltar o overflow aqui não
    // move nada na tela — é só devolver a rolagem pra pessoa
    gsap.set(panel, { clearProps: 'transform' });
    document.body.classList.remove('is-diving', 'is-descending');
    lenis.start();
    lenis.resize();
    syncHint();
    lenis.on('scroll', onScroll);

    open = true;
    busy = false;
  }

  // Sobe até o topo ANTES de qualquer outra coisa do fechamento, e espera
  // chegar. Duas armadilhas moram aqui:
  //   • o scrollTo do Lenis é ignorado enquanto ele está parado, então a subida
  //     tem que vir antes do stop() — ou levar force: true;
  //   • o overflow: hidden do .is-descending trava a rolagem mas NÃO zera a
  //     posição: sem esta subida a página fica onde estava e só salta pro topo
  //     no fim, quando o painel some e o documento encolhe.
  // O listener de scroll segue ligado durante a subida de propósito: a moldura
  // volta pro lugar junto com o texto, no mesmo movimento.
  function rewindToTop() {
    const from = lenis.scroll;
    if (from <= 1) return Promise.resolve();

    const reduced = reducedMotion();
    const dur = reduced
      ? 0
      : Math.min(ABOUT.rewindMax, ABOUT.rewindMin + (from / window.innerHeight) * 0.28);

    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        resolve();
      };
      // Se o onComplete não vier (aba em segundo plano, raf pausado), o
      // fechamento não pode ficar preso em busy pra sempre. O salto forçado
      // daqui também é o que desfaz o lock: por dentro ele passa pelo reset().
      const guard = window.setTimeout(() => {
        lenis.scrollTo(0, { immediate: true, force: true });
        finish();
      }, (dur + 0.4) * 1000);

      lenis.scrollTo(0, {
        force: true,          // pode haver um stop() pendente de outra fase
        lock: true,           // nada de gesto empurrando pro outro lado no meio
        immediate: reduced,
        duration: dur,
        onComplete: finish,
      });
    });
  }

  async function closeAbout(push = true) {
    if (!open || busy) return;
    busy = true;

    await rewindToTop();

    lenis.off('scroll', onScroll);
    lenis.stop();
    carousel.setBorderScroll(0);            // devolve a moldura ao lugar antes de desfazer

    // sem timeline (entrou por /#about, ou abriu em baixa animação) não há o
    // que reverter: a saída precisa ser animada aqui, no braço
    const reduced = reducedMotion();
    const manual = !tl && !reduced;

    if (!reduced) document.body.classList.add('is-diving', 'is-descending');

    if (tl) {
      // fechar é a MESMA coreografia de trás pra frente, só mais rápida: o
      // painel desce, a câmera volta pro mergulho, os cacos se recolhem na foto
      await new Promise<void>((resolve) => {
        tl!.eventCallback('onReverseComplete', () => resolve());
        tl!.timeScale(ABOUT.exitScale).reverse();
      });
    } else if (manual) {
      await gsap.to(panel, { y: window.innerHeight, duration: 0.45, ease: 'power2.in' });
    }

    tl = null;
    panel.hidden = true;
    gsap.set(panel, { clearProps: 'all' });
    document.body.classList.remove('is-about', 'is-descending');
    await carousel.exitAbout(manual);       // repõe a cena e libera o gesto
    lenis.start();

    // um frame de respiro entre sair do display:none e soltar o is-diving,
    // senão o navegador não tem estado inicial pra transicionar e a HUD pisca
    // de volta em vez de aparecer
    requestAnimationFrame(() => document.body.classList.remove('is-diving'));

    if (push && location.hash === '#about') history.pushState(null, '', location.pathname);
    open = false;
    busy = false;
  }

  // a moldura é guardada em coordenadas de tela, então mudar a proporção da
  // janela só exige reconvertê-la — não recalcular o desenho
  window.addEventListener('resize', () => {
    if (open || busy) carousel.syncFrame();
  });

  // clique numa foto do carrossel (o Carousel só avisa QUAL seção; a decisão é
  // aqui — e a de 'photos' mora em initPhotosLink, fora deste closure do About)
  window.addEventListener('section:open', (e) => {
    if ((e as CustomEvent).detail?.id === 'about') openAbout();
  });

  // qualquer link pra #about abre a seção em vez de pular a âncora — inclusive
  // o "Carlos Leonardo" da linha do topo
  document.querySelectorAll<HTMLAnchorElement>('a[href="#about"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openAbout();
    });
  });

  panel.querySelector('[data-about-close]')?.addEventListener('click', () => closeAbout());

  // voltar/avançar do navegador: o #about é o estado, então o histórico manda
  window.addEventListener('popstate', () => {
    if (location.hash === '#about') openAbout(false);
    else closeAbout(false);
  });

  // entrou direto em /#about (link compartilhado): abre já, sem a coreografia —
  // não há foto na tela pra mergulhar, e forçar o mergulho seria teatro vazio.
  // O mosaico, porém, tem que estar lá: ele É o cabeçalho da página.
  if (location.hash === '#about') {
    carousel.enterAboutInstant();
    settleOpen();
  }
}
