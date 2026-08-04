// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis, do
// Carousel e da abertura do About.
import Lenis from 'lenis';
import gsap from 'gsap';
import { Carousel } from '../components/carousel/Carousel';
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

// ——— About: mesma página, aberta pelo mergulho + estilhaço ———
//
// Tudo aqui é DOM e histórico; quem faz o 3D é o Carousel. A divisão importa:
// a cena não sabe que existe um About em HTML, e este arquivo não sabe como um
// caco de vidro voa.
function initAbout(carousel: Carousel, lenis: Lenis) {
  const panel = document.querySelector<HTMLElement>('[data-about]');
  if (!panel) return;

  let open = false;
  let busy = false;   // trava a coreografia enquanto ela roda (clique duplo, hash, etc.)

  async function openAbout(push = true) {
    if (open || busy) return;
    busy = true;

    // a UI do carrossel sai antes do impacto (ver global.css .is-diving)
    document.body.classList.add('is-diving');
    await carousel.enterAbout();          // alinha → mergulha → quebra → cacos caem

    // o vidro caiu: a cena está vazia, então o canvas some e a página passa a
    // ser o About. O scrollTo(0,0) imediato evita herdar rolagem antiga.
    document.body.classList.remove('is-diving');
    document.body.classList.add('is-about');
    panel.hidden = false;
    lenis.scrollTo(0, { immediate: true });
    lenis.resize();                       // a página só ganhou altura AGORA

    // "rolar para baixo até aparecer": o conteúdo sobe pro lugar, como se a
    // página tivesse acabado de rolar até ele
    gsap.from(panel, { y: 48, opacity: 0, duration: 0.7, ease: 'power3.out' });

    if (push && location.hash !== '#about') history.pushState(null, '', '#about');
    open = true;
    busy = false;
  }

  async function closeAbout(push = true) {
    if (!open || busy) return;
    busy = true;

    await gsap.to(panel, { y: 32, opacity: 0, duration: 0.35, ease: 'power2.in' });
    panel.hidden = true;
    gsap.set(panel, { clearProps: 'all' });
    document.body.classList.remove('is-about');
    lenis.scrollTo(0, { immediate: true });

    await carousel.exitAbout();           // repõe a cena e recua a câmera

    if (push && location.hash === '#about') history.pushState(null, '', location.pathname);
    open = false;
    busy = false;
  }

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
  // não há foto na tela pra mergulhar, e forçar o mergulho seria teatro vazio
  if (location.hash === '#about') {
    carousel.enterAboutInstant();
    document.body.classList.add('is-about');
    panel.hidden = false;
    lenis.resize();
    open = true;
  }
}
