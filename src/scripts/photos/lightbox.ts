// src/scripts/photos/lightbox.ts — a foto em alta, num <dialog> nativo.
//
// Mesmo padrão do modal das músicas do About: showModal() dá foco preso,
// Esc e backdrop de graça; o conteúdo mora num filho, então "clicou no vão"
// é qualquer clique que não caiu na figura nem num botão.
//
// A abertura é FLIP: o navegador já desenhou o tile no mural, então a figura
// do modal nasce POR CIMA dele (mesmo centro e mesma caixa projetada) e anima
// até o centro da tela. Como o tubo pode inclinar a origem, X e Y são medidos
// separados; o que se vê é o tile se desprendendo da parede, não um modal.
//
// A alta resolução entra por troca de src: a figura abre com o THUMB (que já
// está decodificado — é o que o mural mostra) e a full-res substitui quando
// termina de baixar e decodificar. Sem flash de branco em momento nenhum.
import gsap from 'gsap';
import { LIGHTBOX } from './config';
import type { Photo } from './photos';

export interface LightboxHooks {
  reduced: boolean;
  /** congela/descongela o mural (gesto, física e blur) */
  freeze(): void;
  unfreeze(): void;
}

export class Lightbox {
  private dialog: HTMLDialogElement;
  private figure: HTMLElement;
  private img: HTMLImageElement;
  private titleEl: HTMLElement;
  private subEl: HTMLElement;

  private index = 0;
  private source: HTMLElement | null = null;   // o tile de origem (FLIP + foco)
  private busy = false;
  private open = false;
  private pendingFull: HTMLImageElement | null = null;
  /** ids cuja versão grande já foi pedida — o navegador guarda os bytes, aqui
   *  só se guarda a lembrança de já ter pedido (ver warmNeighbours) */
  private warmed = new Set<string>();
  /** quartos de volta que o botão de girar aplicou na foto ATUAL. Cresce sem
   *  voltar a zero de propósito: o GSAP anima até o ângulo ABSOLUTO, e trocar
   *  270 por 0 no quarto clique daria um giro inverso de três quartos. */
  private turns = 0;
  /** um giro em curso pode ser interrompido por OUTRO giro — clicar de novo
   *  antes de acabar é o uso normal do botão. Os outros gestos continuam
   *  esperando, daí este par com `busy` em vez de mais um estado solto. */
  private rotating = false;

  constructor(private photos: Photo[], root: HTMLElement, private hooks: LightboxHooks) {
    this.dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]')!;
    this.figure = this.dialog.querySelector<HTMLElement>('[data-lightbox-figure]')!;
    this.img = this.dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
    this.titleEl = this.dialog.querySelector<HTMLElement>('[data-lightbox-title]')!;
    this.subEl = this.dialog.querySelector<HTMLElement>('[data-lightbox-sub]')!;

    this.dialog.querySelector('[data-lightbox-close]')
      ?.addEventListener('click', () => this.close());
    this.dialog.querySelector('[data-lightbox-prev]')
      ?.addEventListener('click', () => this.step(-1));
    this.dialog.querySelector('[data-lightbox-next]')
      ?.addEventListener('click', () => this.step(1));
    this.dialog.querySelector('[data-lightbox-rotate]')
      ?.addEventListener('click', () => this.rotate());

    // Esc dispara 'cancel': desvia pro fechamento animado em vez do corte
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    // clique no vão: qualquer alvo que não seja a figura, a legenda ou um botão
    this.dialog.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-lightbox-figure], [data-lightbox-caption], button')) this.close();
    });

    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.rotate(); }
    });
  }

  show(photo: Photo, sourceNode: HTMLElement) {
    if (this.open || this.busy) return;
    const index = this.photos.findIndex((p) => p.id === photo.id);
    if (index < 0) return;

    this.index = index;
    this.source = sourceNode;
    this.open = true;
    this.busy = true;
    this.hooks.freeze();

    const from = sourceNode.getBoundingClientRect();
    this.mount(photo);
    this.dialog.showModal();

    if (this.hooks.reduced) {
      this.dialog.classList.add('is-open');
      this.busy = false;
      return;
    }

    // FLIP: com o modal já no lugar final, mede-se onde a figura CAIU e ela
    // parte da caixa projetada do tile. A origem pode estar inclinada pelo tubo,
    // então a bounding box perdeu a proporção natural: X e Y entram separados.
    const to = this.figure.getBoundingClientRect();
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);

    this.dialog.classList.add('is-open');   // o backdrop atravessa em CSS
    gsap.fromTo(
      this.figure,
      { x: dx, y: dy, scaleX, scaleY },
      {
        x: 0, y: 0, scaleX: 1, scaleY: 1,
        duration: LIGHTBOX.OPEN_DUR,
        ease: LIGHTBOX.OPEN_EASE,
        onComplete: () => { this.busy = false; },
      },
    );
  }

  private close() {
    if (!this.open || this.busy) return;
    this.busy = true;

    const finish = () => {
      this.dialog.classList.remove('is-open');
      this.dialog.close();
      gsap.set(this.figure, { clearProps: 'transform' });
      this.hooks.unfreeze();
      // devolve o foco ao tile de origem — ele segue no DOM: o mural ficou
      // congelado o tempo todo, então nenhum place() o reciclou.
      // preventScroll porque o tile pode estar meio fora da janela, e o
      // "traz pra dentro da vista" padrão do foco arrastaria o mural inteiro
      // (a mesma rolagem que a guarda do infiniteCanvas desfaz).
      this.source?.focus({ preventScroll: true });
      this.source = null;
      this.open = false;
      this.busy = false;

      // A página anterior guarda um canvas WebGL inteiro no BFCache. Segurar
      // também o bitmap grande do lightbox depois do X aumenta a pressão de
      // memória e pode fazer o navegador expulsar justamente aquela home viva.
      // O thumb do mural continua no cache; aqui liberamos só o que já não está
      // mais sendo exibido (inclusive um download ainda em curso).
      this.pendingFull?.removeAttribute('src');
      this.pendingFull = null;
      this.img.removeAttribute('src');
      this.img.alt = '';
    };

    if (this.hooks.reduced) return finish();

    // o caminho de volta do FLIP — mas só se a origem ainda é a foto aberta:
    // depois de navegar com as setas, voltar pro tile de OUTRA foto leria como
    // a imagem trocando no meio do voo. Aí o fechamento vira um fade simples.
    const photo = this.photos[this.index];
    const from = this.source?.dataset.photo === photo.id
      ? this.source.getBoundingClientRect()
      : null;

    this.dialog.classList.remove('is-open');   // backdrop começa a apagar junto

    if (from) {
      const to = this.figure.getBoundingClientRect();
      gsap.to(this.figure, {
        x: from.left + from.width / 2 - (to.left + to.width / 2),
        y: from.top + from.height / 2 - (to.top + to.height / 2),
        scaleX: from.width / to.width,
        scaleY: from.height / to.height,
        duration: LIGHTBOX.CLOSE_DUR,
        ease: LIGHTBOX.CLOSE_EASE,
        onComplete: finish,
      });
    } else {
      gsap.to(this.figure, {
        opacity: 0,
        duration: LIGHTBOX.CLOSE_DUR * 0.7,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(this.figure, { clearProps: 'opacity' });
          finish();
        },
      });
    }
  }

  private step(dir: number) {
    if (!this.open || this.busy) return;
    this.index = (this.index + dir + this.photos.length) % this.photos.length;
    const photo = this.photos[this.index];

    if (this.hooks.reduced) return this.mount(photo);

    gsap.to(this.figure, {
      opacity: 0,
      duration: LIGHTBOX.SWAP_DUR,
      ease: 'power2.in',
      onComplete: () => {
        this.mount(photo);
        gsap.to(this.figure, { opacity: 1, duration: LIGHTBOX.SWAP_DUR, ease: 'power2.out' });
      },
    });
  }

  /** põe a foto `photo` na figura: thumb na hora, full quando decodificar */
  private mount(photo: Photo) {
    // foto nova, giro zerado: o ângulo é de quem está olhando ESTA foto, não
    // um estado do modal. O -50%/-50% mora aqui (e não no CSS) porque é a
    // mesma matriz que o giro vai mexer — duas fontes brigariam.
    this.turns = 0;
    gsap.set(this.img, { xPercent: -50, yPercent: -50, rotation: 0, scale: 1 });
    this.layout(photo);

    // o thumb já está decodificado (é o que o mural desenha): aparece no
    // primeiro frame, sem flash — a full entra por cima quando estiver pronta
    this.img.src = photo.thumb;
    this.img.alt = photo.alt;
    this.img.width = photo.w;
    this.img.height = photo.h;

    this.pendingFull?.removeAttribute('src');
    const full = new Image();
    this.pendingFull = full;
    full.src = photo.full;
    full.decode()
      .then(() => {
        // decodificou depois de o usuário já ter navegado adiante? descarta.
        if (!this.open || this.photos[this.index].id !== photo.id) return;
        this.img.src = photo.full;
        if (this.pendingFull === full) this.pendingFull = null;
        this.warmNeighbours();
      })
      .catch(() => {
        if (this.pendingFull === full) this.pendingFull = null;
      });   // decode() rejeita em navegação rápida; o thumb fica

    // metadados quando existem; sem eles, a legenda simplesmente não ocupa nada
    this.titleEl.textContent = photo.title ?? '';
    this.titleEl.hidden = !photo.title;
    const sub = [photo.place, photo.year].filter(Boolean).join(' · ');
    this.subEl.textContent = sub;
    this.subEl.hidden = !sub;
    this.dialog.setAttribute('aria-label', `Enlarged photo: ${photo.alt}`);
  }

  /** Escreve a caixa da FIGURA e a da IMAGEM para o giro atual.
   *
   *  As duas saem em CSS (`min` + dvw/dvh) e não em pixels: assim o modal
   *  continua respondendo a virar o celular e à barra do navegador que
   *  recolhe, sem handler de resize nenhum — que é como esta página sempre fez.
   *
   *  A divisão de trabalho entre as duas é o ponto:
   *
   *  - a IMAGEM guarda SEMPRE a medida sem giro. O giro é transform, não
   *    layout, então a caixa de layout dela nunca muda de proporção e a foto
   *    não tem como distorcer no meio do caminho;
   *  - a FIGURA usa a proporção já girada, porque ela é o bounding box do que
   *    se VÊ: é a borda que a legenda acompanha e a caixa que o FLIP de
   *    fechamento mede. */
  private layout(photo: Photo) {
    const ar = photo.w / photo.h;
    const lying = this.turns % 2 !== 0;
    const box = lying ? 1 / ar : ar;   // deitada, a proporção inverte

    // duas escritas por medida, e a segunda é a que vale: `dvh` mede a janela
    // que se ENXERGA no celular (vh conta com as barras do navegador
    // recolhidas, e a foto passava do pé da tela). Onde dvh não existe, a
    // atribuição é descartada em silêncio e sobra a primeira — ver .lightbox
    // no CSS.
    for (const [vw, vh] of [['vw', 'vh'], ['dvw', 'dvh']] as const) {
      const maxW = `${LIGHTBOX.MAX_W * 100}${vw}`;
      const maxH = `${LIGHTBOX.MAX_H * 100}${vh}`;
      // largura no máximo MAX_W do viewport E altura no máximo MAX_H — a
      // segunda entra pela divisão pela proporção
      this.figure.style.width = `min(${maxW}, calc(${maxH} * ${box}))`;
      // deitada, a imagem troca de eixo com a figura: o teto de LARGURA da
      // tela passa a limitar a ALTURA do arquivo, e vice-versa. Escrito assim,
      // o retângulo já nasce do tamanho final — o giro não precisa corrigir
      // medida nenhuma depois.
      this.img.style.width = lying
        ? `min(calc(${maxW} * ${ar}), ${maxH})`
        : `min(${maxW}, calc(${maxH} * ${ar}))`;
      this.img.style.height = lying
        ? `min(${maxW}, calc(${maxH} / ${ar}))`
        : `min(calc(${maxW} / ${ar}), ${maxH})`;
    }
    this.figure.style.height = '';   // a altura volta a sair da proporção
    this.figure.style.aspectRatio = String(box);
  }

  /** Gira a foto aberta um quarto de volta no sentido horário.
   *
   *  É só apresentação: nada é gravado, e a próxima foto — ou a próxima
   *  abertura desta — volta ao ângulo do arquivo. Serve pra foto que foi parar
   *  deitada na pasta: o mural desenha o que o arquivo diz, e as fotos daqui
   *  não têm EXIF pra corrigir a orientação sozinhas (ver data/gallery.ts).
   *
   *  O TAMANHO final é do CSS (layout()), nunca de uma conta em JS: a imagem
   *  já nasce da medida certa e o scale existe só pra SAIR da medida anterior
   *  — ele parte de onde a imagem estava e chega sempre em 1. Assim o giro é
   *  uniforme (a proporção não distorce em nenhum frame), erro de medida se
   *  desfaz no fim em vez de ficar gravado, e a foto girada continua se
   *  ajustando sozinha quando a janela muda de tamanho. */
  private rotate() {
    if (!this.open || (this.busy && !this.rotating)) return;
    const photo = this.photos[this.index];

    const box = this.figure.getBoundingClientRect();
    // largura RENDERIZADA agora: no meio de um giro interrompido a imagem está
    // em algum scale entre um e outro, e é de lá que o próximo tem que partir
    const was = this.img.offsetWidth * (Number(gsap.getProperty(this.img, 'scaleX')) || 1);

    this.turns += 1;
    this.layout(photo);

    const to = this.figure.getBoundingClientRect();
    const rotation = this.turns * 90;
    const scale = was / this.img.offsetWidth;

    if (this.hooks.reduced) return gsap.set(this.img, { rotation, scale: 1 });

    this.busy = true;
    this.rotating = true;

    // A caixa viaja em pixels e só no fim volta às strings responsivas: não há
    // o que interpolar dentro de um `min(...)`. `overwrite` porque o clique
    // repetido é o uso normal do botão — o tween novo MATA o antigo em vez de
    // disputar as mesmas propriedades com ele (e só o último devolve o modal
    // aos outros gestos, já que o onComplete do morto não roda).
    this.figure.style.aspectRatio = 'auto';
    gsap.fromTo(
      this.figure,
      { width: box.width, height: box.height },
      {
        width: to.width,
        height: to.height,
        duration: LIGHTBOX.ROTATE_DUR,
        ease: LIGHTBOX.ROTATE_EASE,
        overwrite: true,
        onComplete: () => {
          this.layout(photo);
          this.rotating = false;
          this.busy = false;
        },
      },
    );
    gsap.fromTo(
      this.img,
      { scale },
      {
        rotation,
        scale: 1,
        duration: LIGHTBOX.ROTATE_DUR,
        ease: LIGHTBOX.ROTATE_EASE,
        overwrite: true,
      },
    );
  }

  /** Pede as versões grandes das fotos VIZINHAS, pra seta ‹ › não esperar rede.
   *
   *  Quem está com o lightbox aberto tem exatamente dois destinos possíveis, e
   *  os dois são conhecidos: a anterior e a próxima. Sem isto, cada passo
   *  repetia a espera inteira — o crossfade mostrava o thumb esticado até a
   *  grande chegar.
   *
   *  Roda DEPOIS que a foto atual decodificou (é chamada de dentro do .then),
   *  e essa ordem é a coisa toda: pedir as três ao mesmo tempo faria as
   *  vizinhas disputarem banda justamente com a imagem que a pessoa está
   *  olhando. Aqui elas só usam a rede que sobrou.
   *
   *  Não guarda referência às imagens de propósito: o que interessa fica no
   *  cache HTTP do navegador, e segurar os objetos só manteria bitmaps
   *  decodificados na memória sem ninguém pra desenhá-los. */
  private warmNeighbours() {
    const n = this.photos.length;
    for (const dir of [1, -1]) {
      const photo = this.photos[(this.index + dir + n) % n];
      if (this.warmed.has(photo.id)) continue;
      this.warmed.add(photo.id);
      new Image().src = photo.full;
    }
  }
}
