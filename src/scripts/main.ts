// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis, do
// Carousel e da abertura do About.
import Lenis from 'lenis';
import gsap from 'gsap';
import { Carousel } from '../components/carousel/Carousel';
import { ABOUT } from '../components/carousel/config';
import { setProgress, hideLoader, awaitGate } from './loading';
import { reducedMotion } from './motion';

export async function bootstrap() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (!canvas) return;

  // O portão é armado ANTES do carregamento e só esperado depois: a pergunta
  // fica na tela enquanto as fotos baixam, então a escolha corre em paralelo e
  // não vira tempo de espera somado.
  const gate = awaitGate();

  window.addEventListener('carousel:progress', (e) => {
    const { loaded, total } = (e as CustomEvent).detail;
    setProgress(total ? loaded / total : 0);
  });

  // Lenis vive aqui (um só dono). O render loop do Carousel chama lenis.raf,
  // então não precisamos de um requestAnimationFrame separado só pra ele.
  const lenis = new Lenis();

  const carousel = new Carousel();

  // A ordem aqui é a coreografia da abertura, e cada passo espera o anterior:
  await carousel.init(canvas, lenis);   // fotos, fonte e shaders — atrás da cortina
  carousel.run();                       // cena viva na pose de topo
  await gate;                           // a cortina não sai sem a escolha feita
  await hideLoader();                   // cortina sai, mostrando o anel de cima

  // câmera desce até a foto inicial — ou já nasce lá, em baixa animação
  if (reducedMotion()) carousel.revealInstant();
  else await carousel.reveal();

  // a linha do topo e os cantos (hora / frase) entram por último, com a cena já parada
  document
    .querySelectorAll('[data-intro], [data-hud]')
    .forEach((el) => el.classList.add('is-in'));

  initAbout(carousel, lenis);
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

  // A moldura rola junto com a página e sai de cena.
  // A posição vem do lenis.scroll, e não do window.scrollY: é o valor
  // interpolado que a rolagem suave está de fato mostrando neste frame, e ler
  // dele evita ainda forçar um layout a cada evento.
  const onScroll = () => carousel.setBorderScroll(lenis.scroll);

  // estado final sem coreografia: o deep-link (/#about), onde não há foto na
  // tela pra mergulhar, e a baixa animação, onde não se quer o mergulho
  function settleOpen() {
    document.body.classList.add('is-about');
    panel.hidden = false;
    lenis.resize();
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

  // clique numa foto do carrossel (o Carousel só avisa QUAL seção; a decisão é aqui)
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
