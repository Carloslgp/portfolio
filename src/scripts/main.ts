// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis e do Carousel.
import Lenis from 'lenis';
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
}
