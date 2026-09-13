// src/scripts/creations/main.ts — a rolagem da Coleção de Criações.
//
// O que esta página promete é que o scroll É a linha do tempo: rolar devagar
// anda devagar, parar no meio para no meio, voltar desanda. Nada dispara e
// roda sozinho (a entrada é a exceção, e acontece antes de haver o que
// rolar). Daí a arquitetura:
//
//   • UM palco de tela cheia, preso (pin) pelo total da sequência — abertura
//     mais as criações. Um pin só: a inversão é robusta por construção, "ir
//     direto pra criação 5" é uma conta (timing.ts), e não há espaçadores de
//     pin se acumulando no iOS.
//   • UMA timeline mestra, pausada, com a saída da abertura (opening.ts) e as
//     criações em fila (effects.ts), e o ScrollTrigger com `scrub` mapeando a
//     posição do scroll pro tempo dela. 1 segundo de timeline = 1 altura de
//     tela de rolagem.
//   • Atrás de tudo, o canva de fotos (field.ts) e o indicador (nav.ts) são
//     função do tempo DA MESTRA — e não do progresso do trigger, que com o
//     scrub numérico corre na frente da imagem.
//   • A rolagem é suavizada por um Lenis próprio desta página no desktop (ver
//     smooth.ts); no toque ela é a nativa. O Lenis move o próprio window, então
//     o ScrollTrigger lê o window direto.
//
// A decisão "palco ou versão simples" NÃO é tomada aqui: é do script inline
// no <head> da página, antes do primeiro paint. Aqui só se confirma: se a
// marca não é 'stage', liga-se o indicador da versão simples e nada mais. E se
// o palco falhar ao montar, a página volta pra versão simples em vez de ficar
// presa num estado pela metade.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Effect } from '../../data/creations';
import { viewportSize } from '../viewport';
import { FIELD, RESTORE, SCROLL, STATIC } from './config';
import { DOCKING, slideTimeline, type SlideParts } from './effects';
import { createField } from './field';
import { prepararEntrada } from './intro';
import { createIndicator } from './nav';
import { closingTimeline, heroTimeline } from './opening';
import { createSmooth, type Smooth } from './smooth';
import { timing, type Timing } from './timing';
import { revertSplits, splitHeading } from './type';

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, '0');

export function initCreations() {
  const html = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-cc-stage]');
  const hero = document.querySelector<HTMLElement>('[data-cc-hero]');
  const slides = [...document.querySelectorAll<HTMLElement>('[data-cc-slide]')];
  const nav = document.querySelector<HTMLElement>('[data-cc-nav]');
  const closing = document.querySelector<HTMLElement>('[data-cc-closing-inner]');
  if (!stage || !hero || !slides.length) return;

  // quem aquece as fotos é o palco; a versão simples não tem o que aquecer
  let onActive: (index: number) => void = () => {};
  const indicator = createIndicator({
    nav,
    // o número que a página escreveu em cada slide — vazio num intervalo
    labels: slides.map((slide) => slide.dataset.ccNumber ?? ''),
    sr: document.querySelector<HTMLElement>('[data-cc-nav-current]'),
    roll: document.querySelector<HTMLElement>('[data-cc-roll]'),
    onActive: (i) => onActive(i),
  });

  // ——— a versão simples ———
  //
  // As criações são blocos empilhados e a página rola normalmente. O que
  // resta ao script é dizer qual está na tela: uma faixa fina no meio do
  // viewport, e quem a cruza é a ativa.
  const staticMode = () => {
    const margin = ((1 - STATIC.ACTIVE_BAND) / 2) * 100;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          indicator.still(slides.indexOf(entry.target as HTMLElement));
        }
      },
      { rootMargin: `-${margin}% 0px -${margin}% 0px` },
    );
    slides.forEach((slide) => io.observe(slide));
  };

  if (html.dataset.creations !== 'stage') {
    staticMode();
    return;
  }

  // numa caixa, e não numa variável solta: quem a preenche é o stageMode, e
  // o TypeScript não enxerga a atribuição dentro dele no catch abaixo
  const held: { smooth: Smooth | null } = { smooth: null };
  try {
    stageMode();
  } catch (err) {
    // O palco não montou (um efeito desconhecido, uma peça que faltou no
    // markup, um navegador sem algo que o GSAP pediu). Melhor a lista
    // empilhada do que uma tela presa mostrando nada: desfaz tudo que o GSAP
    // e o SplitText já escreveram — só as propriedades que eles tocam,
    // porque o `--ratio` da moldura também é inline e precisa ficar.
    console.warn('[creations] stage unavailable — falling back to the stacked layout', err);
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
    held.smooth?.destroy();
    revertSplits();
    const touched = [
      ...stage.querySelectorAll('*'),
      ...(closing ? [closing, ...closing.querySelectorAll('*')] : []),
      ...(nav ? [nav] : []),
    ];
    gsap.set(touched, {
      clearProps: 'transform,opacity,visibility,clipPath,transformOrigin,perspective,width,--in,--out,--gap,--dock,--exit-a,--intro-title,--intro-rest,--nav-alpha,--nav-out',
    });
    html.classList.remove('is-intro');
    html.dataset.creations = 'static';
    staticMode();
  }

  function stageMode() {
    if (!stage || !hero) return;

    // A barra de endereço do celular encolhe e cresce ao rolar; sem o
    // ignoreMobileResize o ScrollTrigger recalcularia tudo a cada mudança.
    // E o refresh só acontece em resize e visibilidade, e não no 'load': a
    // geometria do pin não depende de imagem nem de fonte, e um refresh no
    // meio da fita era um tranco. O refresh que importa é o explícito, lá
    // embaixo, ANTES do primeiro quadro da entrada.
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,resize' });

    const T = timing(slides.length);

    // os títulos são divididos ANTES de as timelines serem montadas: elas
    // guardam referência às palavras
    const parts = slides.map((slide, i) => {
      const p = partsOf(slide, i);
      if (p.effect !== null && !(p.effect in DOCKING)) throw new Error(`unknown effect "${p.effect}" on slide ${pad(i + 1)}`);
      return p;
    });

    const master = gsap.timeline({ paused: true });
    master.add(heroTimeline(hero, T.H), 0);
    parts.forEach((p, i) => master.add(slideTimeline(p, T.phases), T.start(i)));
    master.set({}, {}, T.total);

    const field = stage.querySelector<HTMLElement>('[data-cc-field]');
    const driver = field
      ? createField({
          field,
          cards: [...field.querySelectorAll<HTMLElement>('[data-cc-card]')],
          featured: [...field.querySelectorAll<HTMLElement>('[data-cc-featured]')],
          frames: parts.map((p) => p.frame),
          // o vão entre as linhas do título: é a caixa em que a fita da
          // abertura corre, e o motor a mede como mede as molduras
          ribbon: hero.querySelector<HTMLElement>('[data-cc-ribbon]'),
          timing: T,
        })
      : null;
    driver?.measure();

    // ——— a galeria (fotos extras da MESMA criação, ver `gallery` em
    // data/creations.ts) ———
    //
    // As barras moram FORA do palco (ver o comentário no markup — um
    // position:fixed dentro de algo com transform não fica preso à TELA), daí
    // o document.querySelectorAll em vez do stage.querySelectorAll do resto
    // do arquivo. Só a da criação ATIVA aparece (`.is-active`, ligada abaixo
    // no mesmo `onActive` que já avisa qual criação está na tela) — a posição
    // em si troca com um tween comum, e cada quadro dele chama
    // driver.setGallery (que mora em field.ts só porque é lá que a opacidade
    // de cada foto é escrita).
    const galleryNavs = driver
      ? [...document.querySelectorAll<HTMLElement>('[data-cc-gallery-nav]')].map((navEl) => {
          const k = Number(navEl.dataset.ccGalleryNav);
          const count = Math.max(1, Number(navEl.dataset.ccGalleryCount) || 1);
          const label = navEl.querySelector<HTMLElement>('[data-cc-gallery-label]');
          const proxy = { pos: 0 };
          let current = 0;
          const goToPhoto = (index: number) => {
            current = ((index % count) + count) % count;
            if (label) label.textContent = `${current + 1} / ${count}`;
            gsap.to(proxy, {
              pos: current,
              duration: 0.4,
              ease: 'power2.inOut',
              overwrite: true,
              onUpdate: () => driver.setGallery(k, proxy.pos),
            });
          };
          navEl.querySelector('[data-cc-gallery-prev]')?.addEventListener('click', () => goToPhoto(current - 1));
          navEl.querySelector('[data-cc-gallery-next]')?.addEventListener('click', () => goToPhoto(current + 1));
          return { k, el: navEl, frame: parts[k]?.frame ?? null, x: 0, y: 0 };
        })
      : [];
    let activeGallery: (typeof galleryNavs)[number] | null = null;

    // A barra fica colada na FOTO, e não no pé da tela: longe dela ninguém
    // lia as setas como "trocar esta foto". Ela continua fixa e fora do palco
    // (ver acima), então a posição vem da moldura medida a cada quadro — a
    // moldura deriva na pausa (HOLD.CRUISE) e a barra vai junto. No desktop, logo
    // abaixo da moldura. No celular o texto vem logo abaixo da foto, então
    // ela entra por DENTRO da borda de baixo da foto em vez de cobrir o
    // título. Nas molduras que sangram a tela (full, tower), ela para no pé
    // da tela, onde já ficava.
    const phone = window.matchMedia(FIELD.MOBILE.QUERY);
    const placeGallery = () => {
      const gal = activeGallery;
      if (!gal?.frame) return;
      const r = gal.frame.getBoundingClientRect();
      const box = gal.el.getBoundingClientRect();
      const { width: vw, height: vh } = viewportSize();
      const gap = 12;
      const edge = 16;
      const wantY = phone.matches ? r.bottom - box.height - gap : r.bottom + gap;
      const y = Math.max(edge, Math.min(wantY, vh - box.height - 26));
      const x = Math.max(edge, Math.min(r.left + r.width / 2 - box.width / 2, vw - box.width - edge));
      // box já inclui o translate atual: tirar ele dá a origem da caixa do fixed
      const nx = Math.round(x - (box.left - gal.x));
      const ny = Math.round(y - (box.top - gal.y));
      if (nx === gal.x && ny === gal.y) return;
      gal.x = nx;
      gal.y = ny;
      gal.el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
    };

    held.smooth = createSmooth();
    const lenis = held.smooth?.lenis ?? null;

    // ——— aquecer as fotos ———
    //
    // Decodificar a foto no tamanho natural ANTES do encaixe. Crescendo, o
    // Chrome decodificava a mesma foto 3–4 vezes (medido) — bem na hora em
    // que ela chega. Só a atual e a próxima (ver SCROLL.DECODE_AHEAD).
    const fotos = parts.map((_, k) => stage.querySelector<HTMLImageElement>(`[data-cc-featured="${k}"] img`));
    const aquecidas = new Set<number>();
    const aquecer = (k: number) => {
      const img = fotos[k];
      if (!img || aquecidas.has(k)) return;
      aquecidas.add(k);
      img.decode?.().catch(() => aquecidas.delete(k));
    };
    onActive = (i) => {
      for (let k = Math.max(0, i); k <= i + SCROLL.DECODE_AHEAD; k++) aquecer(k);
      for (const gal of galleryNavs) gal.el.classList.toggle('is-active', gal.k === i);
      activeGallery = galleryNavs.find((gal) => gal.k === i) ?? null;
    };

    const render = () => {
      const t = master.time();
      driver?.apply(t);
      indicator.at(t, T);
      placeGallery();
      nav?.classList.toggle('is-done', t >= T.total - 1e-4);
    };
    master.eventCallback('onUpdate', render);

    // ——— voltar pro mesmo quadro ———
    //
    // A página cuida da própria restauração: a do navegador acontecia antes
    // de o pin existir, numa página ainda curta, e caía no lugar errado. A
    // posição vai em TELAS (sobrevive a uma janela redimensionada). Um link
    // pra um slide (#criacao-NN, ou o id de um intervalo) leva à pausa dele.
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch {}
    const resumeAt = pontoDeRetorno(T, slides);
    if (resumeAt === null) window.scrollTo(0, 0);

    const intro =
      resumeAt === null && driver
        ? prepararEntrada({
            driver,
            html,
            hero,
            lenis,
            onPause: () => {
              aquecer(0);
              aquecer(1);
            },
          })
        : null;

    const scrub = lenis ? SCROLL.SCRUB : SCROLL.SCRUB_TOUCH;
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      // função, e não número: a altura da tela muda (giro do celular, janela
      // redimensionada) e o invalidateOnRefresh refaz a conta e os tweens junto
      end: () => `+=${Math.round(T.total * viewportSize().height)}`,
      pin: true,
      // com o Lenis a rolagem e o update caem no mesmo tique, e antecipar o
      // pin só o faria pular; no toque nativo ele ainda vale
      anticipatePin: lenis ? 0 : 1,
      scrub,
      animation: master,
      invalidateOnRefresh: true,
      onRefresh: () => {
        // a tela mudou (giro, janela): as molduras estão em outro lugar
        driver?.measure();
        render();
      },
    });

    if (closing) closingTimeline(closing, scrub);

    const toTop = (t: number) => trigger.start + (t / T.total) * (trigger.end - trigger.start);

    /** Leva a página a um ponto sem atravessar o caminho — nem o de uma
     *  rolagem suave em curso, nem o do scrub, que sem o progress(1)
     *  atravessaria as criações do meio em câmera rápida. */
    const cutY = (y: number) => {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
      trigger.getTween()?.progress(1);
    };
    const cut = (t: number) => cutY(toTop(t));

    window.addEventListener('pagehide', () => {
      try {
        sessionStorage.setItem(RESTORE.KEY, (window.scrollY / viewportSize().height).toFixed(4));
      } catch {}
    });
    // voltando pela bfcache a página volta inteira, mas o Lenis e o
    // ScrollTrigger precisam reler onde estão
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      lenis?.resize();
      ScrollTrigger.update();
    });

    // O custo de criar o pin cai AQUI, antes do primeiro quadro da fita — e
    // não no fim dela, quando a página convida a rolar.
    ScrollTrigger.refresh();

    if (intro) {
      requestAnimationFrame(() => intro.play());
    } else {
      driver?.setIntro(1);
      html.classList.add('is-intro-done');
      if (resumeAt !== null) {
        if (resumeAt.kind === 'time') cut(resumeAt.value);
        else cutY(resumeAt.value * viewportSize().height);
      }
      render();
    }
  }
}

/** Pra onde a página volta ao carregar, se não for o topo: a pausa do slide
 *  do link (#criacao-NN, ou o id de um intervalo) ou a posição guardada ao
 *  sair (reload, voltar do histórico), em telas. O slide é achado pelo id, e
 *  não pelo número da âncora: um intervalo ocupa um lugar na rolagem sem ter
 *  número, então a "criação 15" já não é o 15º slide. */
function pontoDeRetorno(T: Timing, slides: HTMLElement[]): { kind: 'time' | 'screens'; value: number } | null {
  const target = location.hash.slice(1);
  if (target) {
    const i = slides.findIndex((slide) => slide.id === target);
    if (i >= 0 && i < T.n) return { kind: 'time', value: T.holdOf(i) };
  }
  try {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (entry && (entry.type === 'reload' || entry.type === 'back_forward')) {
      const saved = Number(sessionStorage.getItem(RESTORE.KEY));
      if (Number.isFinite(saved) && saved > RESTORE.MIN_T) return { kind: 'screens', value: saved };
    }
  } catch {}
  return null;
}

/** As peças de um slide, achadas pelos data-attributes do markup. Numa
 *  criação a moldura é obrigatória — é nela que a foto do canva se encaixa, e
 *  é melhor falhar aqui (e cair na versão simples) do que encaixar em `null`.
 *  Um intervalo ([data-cc-interlude]) não tem moldura nem efeito. O título é
 *  dividido em palavras aqui (ver type.ts). */
function partsOf(
  slide: HTMLElement,
  index: number,
): SlideParts & { frame: HTMLElement | null } {
  const q = (sel: string) => slide.querySelector<HTMLElement>(sel);
  const interlude = slide.hasAttribute('data-cc-interlude');
  const frame = q('[data-cc-media]');
  if (!frame && !interlude) throw new Error(`creation "${slide.id}" has no [data-cc-media]`);
  const title = q('[data-cc-title]');
  return {
    root: slide,
    frame,
    copyBox: q('[data-cc-copy]'),
    kicker: q('[data-cc-kicker]'),
    words: title ? splitHeading(title) : [],
    desc: q('[data-cc-desc]'),
    link: q('[data-cc-link]'),
    folio: document.querySelector<HTMLElement>(`[data-cc-folio="${index}"]`),
    effect: interlude ? null : (slide.dataset.effect as Effect),
    from: slide.dataset.from === 'left' ? 'left' : 'right',
  };
}
