// src/scripts/main.ts — ponto de entrada client-side. Dono do Lenis e do Carousel.
import Lenis from 'lenis';
import { Carousel } from '../components/carousel/Carousel';

export async function bootstrap() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (!canvas) return;

  // Lenis vive aqui (um só dono). O render loop do Carousel chama lenis.raf,
  // então não precisamos de um requestAnimationFrame separado só pra ele.
  const lenis = new Lenis();

  const carousel = new Carousel();
  await carousel.init(canvas, lenis);
  await carousel.start();
}
