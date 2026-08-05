// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis, do
// Carousel e da abertura do About.
import Lenis from 'lenis';
import gsap from 'gsap';
import { Carousel } from '../components/carousel/Carousel';
import { ABOUT } from '../components/carousel/config';
import { setProgress, hideLoader } from './loading';

export async function bootstrap() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (!canvas) return;

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
  await hideLoader();                   // cortina sai, mostrando o anel de cima
  await carousel.reveal();              // câmera desce até a foto inicial

  // a linha do topo entra por último, com a cena já parada
  document.querySelector('[data-intro]')?.classList.add('is-in');

  initAbout(carousel, lenis);
}

// ——— About: mesma página, aberta pela descida ———
//
// Tudo aqui é DOM e histórico; quem faz o 3D é o Carousel. A divisão importa:
// a cena não sabe que existe um About em HTML, e este arquivo não sabe como um
// caco de vidro voa. O que os dois compartilham é UM RELÓGIO: enterAbout()
// devolve a timeline da coreografia com o label 'descent', e é nele que a
// subida do painel se pendura.
//
// A ordem aqui é o ponto todo da coisa. Antes o painel só existia DEPOIS que o
// estilhaço acabava, e aquele corte era lido como carregamento. Agora ele entra
// no começo, já deslocado pra fora da tela, e sobe enquanto o vidro ainda está
// assentando — nenhum frame em que nada se move, e nada de opacidade, que é o
// que faz uma coisa parecer "chegando" em vez de "rolando".
function initAbout(carousel: Carousel, lenis: Lenis) {
  const panel = document.querySelector<HTMLElement>('[data-about]');
  if (!panel) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let open = false;
  let busy = false;   // trava a coreografia enquanto ela roda (clique duplo, hash, etc.)
  let tl: gsap.core.Timeline | null = null;

  // A moldura rola junto com a página e sai de cena.
  // A posição vem do lenis.scroll, e não do window.scrollY: é o valor
  // interpolado que a rolagem suave está de fato mostrando neste frame, e ler
  // dele evita ainda forçar um layout a cada evento.
  const onScroll = () => carousel.setBorderScroll(lenis.scroll);

  // estado final sem coreografia: deep-link e prefers-reduced-motion
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

    if (reduced) {
      carousel.enterAboutInstant();
      settleOpen();
      busy = false;
      return;
    }

    // a UI do carrossel sai antes do impacto (ver index.astro .is-diving)
    document.body.classList.add('is-diving');

    // O painel entra AQUI, no começo — só que empurrado pra baixo da dobra.
    // is-descending segura o overflow enquanto o transform está ativo: sem ele
    // o deslocamento viraria barra de rolagem e um salto no fim.
    gsap.set(panel, { y: window.innerHeight });
    panel.hidden = false;
    document.body.classList.add('is-about', 'is-descending');
    lenis.stop();                          // a descida é automática; sem gesto por cima
    lenis.scrollTo(0, { immediate: true });
    lenis.resize();

    tl = carousel.enterAbout();
    tl.to(panel, {
      y: 0,
      duration: ABOUT.descentDur,
      ease: ABOUT.descentEase,
    }, 'descent');
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

  async function closeAbout(push = true) {
    if (!open || busy) return;
    busy = true;

    lenis.off('scroll', onScroll);
    lenis.stop();
    lenis.scrollTo(0, { immediate: true });
    carousel.setBorderScroll(0);            // devolve a moldura ao lugar antes de desfazer

    // sem timeline (entrou por /#about) não há o que reverter: a saída precisa
    // ser animada aqui, no braço
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
