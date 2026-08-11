// src/scripts/shots.ts — quem decide se um vídeo do About toca.
//
// Estes vídeos substituíram um GIF animado, e a troca só vale a pena se o
// controle vier junto: um GIF não tem freio: o navegador decodifica os 75
// quadros em laço enquanto o elemento existir, esteja ele na tela ou dez mil
// pixels abaixo dela. Aqui há dois freios, e é por isso que este arquivo existe:
//
//   • o ENQUADRAMENTO — só toca o que está à vista (IntersectionObserver), e
//     pausa ao sair. Combinado com o preload="none" do markup, um visitante que
//     nunca rola até o tópico "Art" não baixa nem decodifica um byte de vídeo.
//   • o PORTÃO — quem escolheu baixa animação vê o poster e mais nada. Um laço
//     de vídeo é exatamente o tipo de movimento que aquela escolha pediu pra
//     não ver, e é o mesmo critério do reel 3D e do blur do mural.
//
// A margem de 200px é a mesma ideia do reel: começa um pouco antes de aparecer,
// pra o quadro não acender na cara de quem está rolando.
import { reducedMotion } from './motion';

export function initShotVideos() {
  const videos = document.querySelectorAll<HTMLVideoElement>('[data-shot-video]');
  if (!videos.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;

        // Baixa animação: nem toca, nem baixa. O poster já está na tela e é o
        // quadro certo — o vídeo é a versão em movimento da MESMA imagem.
        if (!entry.isIntersecting || reducedMotion()) {
          video.pause();
          continue;
        }

        // play() devolve uma Promise que rejeita quando a política de autoplay
        // do navegador barra (acontece mesmo com muted em alguns modos de
        // economia). Sem o catch isso vira um erro não tratado no console; com
        // ele, sobra o poster — que é uma degradação perfeitamente aceitável.
        video.play().catch(() => {});
      }
    },
    { rootMargin: '200px 0px' },
  );

  videos.forEach((video) => io.observe(video));
}
