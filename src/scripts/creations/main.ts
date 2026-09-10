// src/scripts/creations/main.ts — a rolagem da Coleção de Criações.
//
// O que esta página promete é que o scroll É a linha do tempo: rolar devagar
// anda devagar, parar no meio para no meio, voltar desanda. Nada dispara e
// roda sozinho. Daí a arquitetura:
//
//   • UM palco de tela cheia, preso (pin) pelo total da sequência — abertura
//     mais oito criações. Não é um pin por criação: com um só, a inversão é
//     robusta por construção, "ir direto pra criação 5" é uma conta, e não há
//     espaçadores de pin se acumulando no iOS.
//   • UMA timeline mestra, pausada, com a saída da abertura e as oito
//     criações em fila, e o ScrollTrigger com `scrub` mapeando a posição do
//     scroll pro progresso dela. A unidade de tempo da mestra é a ALTURA DE
//     TELA: 1 segundo de timeline = 1 viewport de rolagem, então o `end` do
//     trigger sai direto da duração. Todos os números moram em config.ts.
//   • O texto de cada criação termina invisível e o da seguinte começa
//     invisível (ver effects.ts): entre duas há um respiro, nunca as duas
//     juntas.
//   • Atrás de tudo, o canva de fotos (field.ts) é função do mesmo tempo: rola
//     com a página, escurece durante a leitura — e é de lá que a foto de cada
//     criação vem, subindo e crescendo até a moldura, sem aparecer do nada.
//
// A decisão "palco ou versão simples" NÃO é tomada aqui: é do script inline
// no <head> da página, antes do primeiro paint (ele lê a escolha do portão de
// animação e a altura da tela e escreve html[data-creations]). Aqui só se
// confirma: se a marca não é 'stage', liga-se o indicador da versão simples e
// nada mais. E se o palco falhar ao montar, a página volta pra versão simples
// em vez de ficar presa num estado pela metade.
//
// Sem Lenis nesta página (ela não carrega o main.ts da home), então a rolagem
// é a nativa e o ScrollTrigger lê o window direto.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Effect } from '../../data/creations';
import { viewportSize } from '../viewport';
import { CLOSING, OPENING, RIBBON, SCROLL, STATIC } from './config';
import { DOCKING, slideTimeline, type Phases, type SlideParts } from './effects';
import { createField, type FieldDriver } from './field';

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, '0');

export function initCreations() {
  const html = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-cc-stage]');
  const hero = document.querySelector<HTMLElement>('[data-cc-hero]');
  const slides = [...document.querySelectorAll<HTMLElement>('[data-cc-slide]')];
  const nav = document.querySelector<HTMLElement>('[data-cc-nav]');
  const items = [...document.querySelectorAll<HTMLAnchorElement>('[data-cc-nav-item]')];
  const counter = document.querySelector<HTMLElement>('[data-cc-nav-current]');
  const closing = document.querySelector<HTMLElement>('[data-cc-closing-inner]');
  if (!stage || !hero || !slides.length) return;

  // ——— o indicador ———
  //
  // Duas informações, dois canais: QUAL criação está ativa (aria-current, e
  // o contador) e QUANTO dela já passou (a variável --p, que o CSS transforma
  // na barra de progresso do traço ativo). A primeira só é escrita quando
  // muda — é DOM; a segunda muda a cada quadro de rolagem e é só uma
  // variável, barata.
  let active = -1;
  const markActive = (index: number, progress: number) => {
    if (index !== active) {
      items.forEach((item, k) => {
        if (k === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = index < 0 ? '—' : pad(index + 1);
      active = index;
    }
    if (index >= 0) items[index]?.style.setProperty('--p', progress.toFixed(3));
  };

  // ——— a versão simples ———
  //
  // As criações são blocos empilhados e a página rola normalmente. O que
  // resta ao script é dizer qual está na tela: uma faixa fina no meio do
  // viewport, e quem a cruza é a ativa. Os traços do indicador são âncoras
  // de verdade (#criacao-NN), então o salto é do navegador.
  const staticMode = () => {
    const margin = ((1 - STATIC.ACTIVE_BAND) / 2) * 100;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          markActive(slides.indexOf(entry.target as HTMLElement), 1);
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

  try {
    stageMode();
  } catch (err) {
    // O palco não montou (um efeito desconhecido, uma peça que faltou no
    // markup, um navegador sem algo que o GSAP pediu). Melhor a lista
    // empilhada do que uma tela presa mostrando nada: desfaz tudo que o GSAP
    // já escreveu inline — só as propriedades que ele toca, porque o
    // `--ratio` da moldura também é inline e precisa ficar — e troca a marca.
    console.warn('[creations] stage unavailable — falling back to the stacked layout', err);
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
    gsap.set(stage.querySelectorAll('*'), {
      clearProps: 'transform,opacity,visibility,clipPath,transformOrigin,perspective,width',
    });
    html.dataset.creations = 'static';
    staticMode();
  }

  function stageMode() {
    if (!stage || !hero) return;
    // A barra de endereço do celular encolhe e cresce ao rolar, e isso muda
    // a altura do viewport. Sem esta flag o ScrollTrigger recalcularia tudo a
    // cada mudança — um salto no meio da animação, justamente no gesto que a
    // página mais usa.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const N = slides.length;
    const SPC = SCROLL.SCREENS_PER_CREATION;
    const H = SCROLL.HERO_SCREENS;
    const total = H + N * SPC;

    // as fases em alturas de tela, normalizadas: as proporções do config não
    // precisam somar 1 pra continuarem sendo proporções
    const sum = SCROLL.PHASES.enter + SCROLL.PHASES.hold + SCROLL.PHASES.exit;
    const phases: Phases = {
      enter: (SPC * SCROLL.PHASES.enter) / sum,
      hold: (SPC * SCROLL.PHASES.hold) / sum,
      exit: (SPC * SCROLL.PHASES.exit) / sum,
    };

    const master = gsap.timeline({ paused: true });
    master.add(heroTimeline(hero, nav), 0);
    const parts = slides.map((slide, i) => {
      const p = partsOf(slide);
      if (!(p.effect in DOCKING)) throw new Error(`unknown effect "${p.effect}" on creation ${pad(i + 1)}`);
      master.add(slideTimeline(p, phases), H + i * SPC);
      return p;
    });
    master.set({}, {}, total);

    // O canva de fotos ao fundo (ver field.ts) é função do tempo da mestra,
    // recalculado a cada render dela — pela própria mestra, e não pelo
    // onUpdate do trigger, pra seguir o MESMO relógio do resto quando SCRUB
    // tem inércia. As molduras das criações são medidas aqui e remedidas no
    // refresh: é nelas que as fotos do canva se encaixam.
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
          creations: N,
          phases,
        })
      : null;
    if (driver) {
      driver.measure();
      master.eventCallback('onUpdate', () => driver.apply(master.time()));
      driver.apply(0);
    }

    // Qual criação está ativa, a partir do progresso do trigger. Antes da
    // abertura terminar não há nenhuma; depois do fim, a última fica com a
    // barra cheia e o indicador se recolhe (classe, e não GSAP: a opacidade
    // dele já é do timeline da abertura, e dois donos da mesma propriedade
    // brigam).
    const sync = (progress: number) => {
      const t = progress * total;
      if (t < H) {
        markActive(-1, 0);
      } else {
        const k = (t - H) / SPC;
        const index = Math.min(N - 1, Math.floor(k));
        markActive(index, Math.min(1, k - index));
      }
      nav?.classList.toggle('is-done', progress >= 1);
    };

    // ——— a rolagem só é LIGADA depois da entrada ———
    //
    // Antes o ScrollTrigger nascia junto com o resto e a entrada rodava por
    // cima dele. Não funcionava, e a razão é boa de saber: o ScrollTrigger faz
    // um refresh no `load`, o refresh re-renderiza a mestra no tempo 0, e a
    // mestra no tempo 0 escreve a abertura inteira visível — apagando o que a
    // entrada tinha acabado de esconder. Dois donos da mesma propriedade.
    //
    // Ligando depois, não há disputa: durante a entrada a mestra não existe
    // pra ninguém, e a página nem tem altura pra rolar (o pin é que a cria),
    // o que de quebra trava a rolagem no único momento em que ela atrapalha.
    const ligarRolagem = () => {
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      // função, e não número: a altura da tela muda (giro do celular, janela
      // redimensionada) e o invalidateOnRefresh refaz a conta e os tweens em
      // vw/vh junto
      end: () => `+=${Math.round(total * viewportSize().height)}`,
      pin: true,
      anticipatePin: 1,
      scrub: SCROLL.SCRUB,
      animation: master,
      invalidateOnRefresh: true,
      onUpdate: (self) => sync(self.progress),
      onRefresh: (self) => {
        // a tela mudou (giro, janela): as molduras estão em outro lugar
        driver?.measure();
        driver?.apply(master.time());
        sync(self.progress);
      },
    });

    // O salto do indicador: a posição de scroll que corresponde ao meio da
    // pausa de leitura da criação escolhida. O href (#criacao-NN) continua lá
    // pra quem abre em nova aba ou copia o link — por isso os modificadores
    // passam direto.
    items.forEach((item, i) => {
      item.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const t = H + i * SPC + phases.enter + phases.hold * SCROLL.JUMP_INTO_HOLD;
        const top = trigger.start + (t / total) * (trigger.end - trigger.start);
        window.scrollTo({ top, behavior: SCROLL.SMOOTH_JUMP ? 'smooth' : 'auto' });
      });
    });

    // O fechamento entra depois que o palco solta — o único trecho da página
    // que rola de verdade. O fade costura a última criação (que sai pra papel
    // vazio) com a página voltando ao normal, e como também é scrub, voltar
    // o desfaz.
    if (closing) {
      gsap.fromTo(
        closing,
        { opacity: 0, y: CLOSING.RISE },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: closing,
            start: CLOSING.START,
            end: CLOSING.END,
            scrub: SCROLL.SCRUB,
          },
        },
      );
    }
    };

    // A ENTRADA roda primeiro e a rolagem entra atrás dela. Sem entrada
    // (chegou numa página já rolada, ou não há canva), liga na hora.
    if (driver) runIntro(driver, html, hero, ligarRolagem);
    else ligarRolagem();
  }
}

/** As peças de uma criação, achadas pelos data-attributes do markup. A
 *  moldura é obrigatória — é nela que a foto do canva se encaixa, e é melhor
 *  falhar aqui (e cair na versão simples) do que encaixar em `null`. */
function partsOf(slide: HTMLElement): SlideParts & { frame: HTMLElement } {
  const frame = slide.querySelector<HTMLElement>('[data-cc-media]');
  if (!frame) throw new Error(`creation "${slide.id}" has no [data-cc-media]`);
  return {
    root: slide,
    frame,
    copy: [...slide.querySelectorAll<HTMLElement>('[data-cc-line]')],
    effect: slide.dataset.effect as Effect,
    from: slide.dataset.from === 'left' ? 'left' : 'right',
  };
}

/**
 * A ENTRADA: a fita se monta, se junta e se espalha, e a página fica pronta.
 *
 * É a única animação da página que roda no relógio, e o motivo é que ela
 * acontece ANTES de haver o que rolar — é o carregamento se mostrando, não um
 * trecho da página. Quem desenha continua sendo o field.ts, que não sabe o que
 * é um segundo: aqui só se empurra um número de 0 a 1 pra dentro dele.
 *
 * Duas saídas de emergência, e as duas importam mais que a animação:
 *
 *   • quem chega numa página já rolada (reload no meio, voltar do histórico)
 *     não vê entrada nenhuma. Rodá-la ali seria uma abertura no meio do texto.
 *   • qualquer sinal de impaciência — rolar, tocar, teclar, clicar — acelera a
 *     entrada em vez de cortá-la. Cortar de um quadro pro outro é um piscão;
 *     acelerar 5x chega no mesmo lugar em 0,2s e ainda se lê como movimento.
 *     Ninguém fica preso esperando um enfeite acabar.
 */
function runIntro(
  driver: FieldDriver,
  html: HTMLElement,
  hero: HTMLElement,
  aoTerminar: () => void,
) {
  if (window.scrollY > 4) {
    driver.setIntro(1);
    aoTerminar();
    return;
  }

  // A tela da entrada tem DUAS coisas: o título e a fita. Mais nada.
  //
  // O rótulo, o parágrafo de abertura e a dica de rolagem entram só no fim,
  // quando as fotos já se espalharam. Não é preciosismo: com os três na tela a
  // curva divide atenção com três blocos de texto e deixa de ser o assunto —
  // e a dica convidando a rolar enquanto a entrada roda é um convite pra
  // perder justamente o que ela está mostrando. Vazia, a tela tem uma coisa
  // pra olhar, que é o ponto.
  const q = (sel: string) => hero.querySelector<HTMLElement>(sel);
  const titulo = q('[data-cc-hero-title]');
  const resto = [q('[data-cc-hero-kicker]'), q('[data-cc-hero-lead]'), q('[data-cc-hero-hint]')]
    .filter((el): el is HTMLElement => Boolean(el));

  const D = RIBBON.SECONDS;
  const state = { i: 0 };
  driver.setIntro(0);
  html.classList.add('is-intro');
  gsap.set(resto, { opacity: 0 });
  if (titulo) gsap.set(titulo, { opacity: 0 });

  const tween = gsap.timeline({
    onComplete: () => {
      driver.setIntro(1);
      html.classList.remove('is-intro');
      html.classList.add('is-intro-done');
      sinais.forEach((s) => window.removeEventListener(s, apressar));
      aoTerminar();
    },
  });

  tween.to(
    state,
    {
      i: 1,
      duration: D,
      ease: 'none',
      onUpdate: () => {
        driver.setIntro(state.i);
        // o vão entre as linhas do título se fecha junto com o estouro: as
        // fotos saem dali e o título se junta atrás delas, no mesmo gesto
        if (state.i >= RIBBON.JUNTA) html.classList.add('is-intro-done');
      },
    },
    0,
  );

  // o título aparece junto com as primeiras fotos, não antes: ele e a curva
  // nascem na mesma hora, como na referência
  if (titulo) tween.to(titulo, { opacity: 1, duration: D * 0.24, ease: 'power1.out' }, 0);

  // e o resto da abertura entra quando as fotos saem do caminho
  tween.to(resto, { opacity: 1, duration: D * 0.3, ease: 'power1.out' }, D * RIBBON.JUNTA);

  const apressar = () => tween.timeScale(5);
  const sinais = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  sinais.forEach((s) => window.addEventListener(s, apressar, { passive: true, once: true }));
}

/** A saída da abertura, em HERO_SCREENS alturas de tela. Cada peça some na
 *  sua janela (ver OPENING no config); o indicador lateral entra pela
 *  variável --nav-alpha, que o CSS usa como opacidade — assim a classe
 *  `is-done` do fim da sequência pode apagá-lo sem disputar a propriedade
 *  com o GSAP. */
function heroTimeline(hero: HTMLElement, nav: HTMLElement | null): gsap.core.Timeline {
  const H = SCROLL.HERO_SCREENS;
  const tl = gsap.timeline();
  const at = (pair: readonly [number, number]) => ({ at: pair[0] * H, dur: pair[1] * H });

  const hint = hero.querySelector<HTMLElement>('[data-cc-hero-hint]');
  const title = hero.querySelector<HTMLElement>('[data-cc-hero-title]');
  const soft = [
    hero.querySelector<HTMLElement>('[data-cc-hero-kicker]'),
    hero.querySelector<HTMLElement>('[data-cc-hero-lead]'),
  ].filter((el): el is HTMLElement => Boolean(el));

  if (hint) {
    const w = at(OPENING.HINT);
    tl.fromTo(hint, { opacity: 1 }, { opacity: 0, duration: w.dur, ease: 'none' }, w.at);
  }
  if (soft.length) {
    const w = at(OPENING.SOFT);
    tl.fromTo(
      soft,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -OPENING.SOFT_LIFT, duration: w.dur, ease: 'power1.in' },
      w.at,
    );
  }
  if (title) {
    const w = at(OPENING.TITLE);
    tl.fromTo(
      title,
      // centro, e não a esquerda: a abertura passou a ser uma composição
      // centrada (a fita corre entre as duas linhas), então crescer a partir
      // da borda esquerda arrastaria o título pro lado enquanto some
      { opacity: 1, scale: 1, y: 0, transformOrigin: 'center center' },
      {
        opacity: 0,
        scale: OPENING.TITLE_SCALE,
        y: `-${OPENING.TITLE_LIFT_VH}vh`,
        duration: w.dur,
        ease: 'power1.in',
      },
      w.at,
    );
  }
  {
    const w = at(OPENING.BLOCK);
    tl.fromTo(
      hero,
      { autoAlpha: 1 },
      { autoAlpha: 0, duration: w.dur, ease: 'none', immediateRender: false },
      w.at,
    );
  }
  if (nav) {
    const w = at(OPENING.NAV);
    tl.fromTo(
      nav,
      { '--nav-alpha': 0 },
      { '--nav-alpha': 1, duration: w.dur, ease: 'none', immediateRender: true },
      w.at,
    );
  }
  tl.set({}, {}, H);
  return tl;
}
