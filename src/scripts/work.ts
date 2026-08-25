// src/scripts/work.ts — o movimento da /work, e nada além dele.
//
// A home é dona do momento de Three.js; esta página não disputa com ela. São
// duas coisas só: cada entrada entra uma vez quando chega na tela, e a linha
// vertical se desenha de cima pra baixo conforme a página rola. Nenhuma das
// duas mexe em altura, então a página nasce e permanece do mesmo tamanho.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { storedMotionMode } from './motion';

gsap.registerPlugin(ScrollTrigger);

export function initWork() {
  // A MESMA decisão que o script inline do <head> da página já tomou (é ele
  // que põe o data-motion, cedo o bastante pro CSS não piscar). Aqui só se
  // lê o resultado: recalcular abriria a porta pros dois discordarem.
  const reduced = document.documentElement.dataset.motion === 'reduced';

  // Baixa animação não é uma animação mais curta: é animação NENHUMA. O
  // conteúdo já está no estado final — o [data-reveal] que o esconde só existe
  // quando o head armou a revelação — então sair aqui é a página inteira
  // pronta, sem transform, sem desenho de linha, sem ScrollTrigger vivo.
  if (reduced) return;

  const ctx = gsap.context(() => {
    // ——— a linha que se desenha ———
    //
    // Um scrub por segmento: o trilho apagado por baixo já dá a cronologia
    // inteira, e a tinta por cima é a parte já percorrida. O `end` é o fim da
    // lista passando pelo meio da tela, e não pelo topo — desenhar até o
    // último nó e não até o fim do último card faria a linha parar visivelmente
    // antes do texto acabar.
    document.querySelectorAll<HTMLElement>('[data-spine]').forEach((spine) => {
      const timeline = spine.parentElement;
      if (!timeline) return;

      // ——— os nós acendem quando a tinta passa por eles ———
      //
      // Eles nascem vazados e só enchem no instante em que a linha desenhada
      // alcança a altura de cada um — a cronologia é uma linha sendo
      // percorrida, e um ponto que já chega pintado se adianta ao próprio
      // percurso.
      //
      // Isto anda de carona no MESMO ScrollTrigger que desenha a linha, e não
      // num gatilho por nó. É o que garante que os dois não possam divergir:
      // a conta é literalmente `o progresso da tinta já passou deste ponto?`,
      // lida do mesmo número que escala a barra. Um gatilho por nó teria
      // start/end próprios e sairia de sincronia no primeiro ajuste de curva.
      const nodes = [...timeline.querySelectorAll<HTMLElement>('.node')];
      let marks: number[] = [];
      const lit: boolean[] = nodes.map(() => false);

      // offsetTop, e NÃO getBoundingClientRect: a revelação mantém um
      // `y: 12` nos nós enquanto entram, e o rect leria essa posição
      // deslocada. O offset ignora transform e devolve o lugar de repouso.
      //
      // E ele é SOMADO subindo a cadeia de offsetParent até a linha, em vez de
      // lido de uma vez: `.entry` é position: relative, então o offsetParent
      // de um nó é o próprio card, e o offsetTop cru dava a distância até o
      // topo do card (uns 15px) em lugar da distância até o topo da linha.
      // Com isso toda marca caía perto de zero e os nós acendiam todos juntos,
      // no primeiro quadro — que é justamente o defeito que isto veio corrigir.
      const offsetWithin = (el: HTMLElement, ancestor: HTMLElement) => {
        let y = 0;
        let node: HTMLElement | null = el;
        while (node && node !== ancestor) {
          y += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return y;
      };

      const measure = () => {
        const height = timeline.offsetHeight || 1;
        marks = nodes.map(
          (n) => (offsetWithin(n, timeline) + n.offsetHeight / 2) / height,
        );
      };

      gsap.fromTo(
        spine,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: timeline,
            start: 'top 78%',
            // 'bottom bottom' — a borda de baixo da linha encontrando a borda
            // de baixo da tela. O ponto importa: ele é ALCANÇÁVEL sempre,
            // porque existe página depois da última linha do tempo (a nota do
            // /craft e o respiro do rodapé), então essa borda cruza o fim da
            // tela antes de a rolagem acabar.
            //
            // O 'bottom 55%' que estava aqui pedia a borda de baixo no meio da
            // tela, e no último segmento não havia rolagem que chegasse lá: o
            // progresso empacava em 0.87 e o nó do bloco condensado, que fica
            // em 0.92, ficava vazado pra sempre. Um fim que a página não
            // alcança é um fim que nunca acontece.
            end: 'bottom bottom',
            scrub: 0.4,
            onRefresh: measure,
            onUpdate: (self) => {
              for (let i = 0; i < nodes.length; i++) {
                const on = self.progress >= marks[i];
                // só escreve na mudança: o onUpdate roda a cada quadro de
                // rolagem, e reescrever a classe igual a cada vez é trabalho
                // de estilo jogado fora
                if (lit[i] === on) continue;
                lit[i] = on;
                nodes[i].classList.toggle('is-lit', on);
              }
            },
          },
        },
      );
    });

    // ——— as entradas ———
    //
    // O stagger é entre os FILHOS de uma entrada (título, datas, parágrafo,
    // tópicos, chips), nunca entre entradas: um disparo por página faria a
    // lista inteira cair de uma vez, que é o efeito de página carregando, não
    // o de uma linha sendo percorrida.
    document.querySelectorAll<HTMLElement>('[data-entry]').forEach((entry) => {
      const parts = entry.querySelectorAll('[data-reveal]');
      if (!parts.length) return;

      gsap.fromTo(
        parts,
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.06,
          // once: a entrada é um acontecimento, não um estado — quem rola de
          // volta pra reler não quer o texto se remontando na frente.
          scrollTrigger: { trigger: entry, start: 'top 88%', once: true },
        },
      );
    });
  });

  // ——— desmontagem ———
  //
  // O §8 pede reverter em "transições de página do Astro", mas este site não
  // tem router SPA: a navegação é MPA de verdade e quem costura as páginas é a
  // view transition NATIVA do navegador (@view-transition, no global.css).
  // Então não existe astro:before-swap pra ouvir — os eventos equivalentes são
  // estes dois.
  //
  //   pageswap → a página está saindo com view transition; é o último momento
  //              em que o documento antigo ainda existe.
  //   pagehide → todo o resto (voltar/avançar, fechar, navegador sem suporte).
  //
  // O revert desfaz os estilos que o GSAP escreveu; o kill tira os
  // ScrollTriggers dos ouvintes de rolagem, que é o que de fato vazaria se a
  // página voltasse viva do BFCache.
  const teardown = () => {
    ctx.revert();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  };

  window.addEventListener('pageswap', teardown, { once: true });
  window.addEventListener('pagehide', teardown, { once: true });
}
