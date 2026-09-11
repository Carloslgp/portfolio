// src/scripts/craftRooms.ts — o comportamento das duas salas de /craft.
//
// É pouco, de propósito. As salas são texto: elas rolam com o scroll nativo
// (nada de Lenis aqui — a home é que tem dono pra isso) e não têm emenda com
// documento nenhum. O que sobra pro JavaScript é uma coisa só: acender cada
// linha quando ela chega à vista.
//
// Quem deixa as linhas apagadas é o CSS, a partir da marca html[data-craft-rows]
// que o script inline do CraftRoom.astro escreve antes do primeiro paint. Aqui
// a gente só acende — e, se por qualquer motivo não puder acender uma a uma,
// acende todas de uma vez. É a ordem certa dos dois: a página nunca fica
// devendo conteúdo por causa de um enfeite.
import { storedMotionMode } from './motion';

/** O intervalo entre duas linhas que entram no MESMO lote, em segundos.
 *
 *  Só a primeira tela tem lote: ali meia dúzia de linhas já está à vista
 *  quando o observador responde, e acender as seis no mesmo quadro é um
 *  piscar, não uma entrada. Da segunda tela em diante cada linha chega
 *  sozinha, empurrada pela rolagem — e aí a rolagem já é o escalonamento. */
const STAGGER = 0.07;

/** O teto do escalonamento, em passos. Sem ele, uma tela alta o bastante pra
 *  mostrar dez linhas faria a última esperar sete décimos parada — o que se
 *  lê como travamento, não como cadência. */
const STAGGER_CAP = 4;

/** Quanto da linha precisa estar à vista pra ela contar como chegada. Acender
 *  com um fio aparecendo na borda é gastar o movimento fora do campo de quem
 *  está lendo; um terço já põe a entrada dentro da página.
 *
 *  A medida é uma fração da LINHA, e não da tela, e isso foi uma correção: a
 *  primeira versão usava rootMargin '0px 0px -12% 0px', que recorta 12% da
 *  altura da janela e cria uma faixa cega no pé dela. Quem mora nessa faixa
 *  quando a rolagem acaba nunca acende — e quem mora lá é o RODAPÉ, que por
 *  definição é a última coisa da página. O resultado era um rodapé invisível
 *  pra sempre, sem nenhum jeito de alcançá-lo. Uma fração da própria linha não
 *  tem faixa cega: no fim da rolagem tudo que sobrou está inteiro na tela, e
 *  inteiro passa de qualquer limiar abaixo de 1.
 *
 *  (O caso que ela não cobre é uma linha mais alta que três telas, que nunca
 *  chegaria a 0.3. Estas linhas são um parágrafo ao lado de um quadro.) */
const THRESHOLD = 0.3;

export function initCraftRoom() {
  const root = document.documentElement;

  // A escolha do portão manda. Em acesso direto, onde ela ainda não existe,
  // respeitamos a preferência do sistema — o mesmo critério do craft.ts.
  const mode = storedMotionMode();
  if (mode) root.dataset.motion = mode;
  const reduced = mode === 'reduced' ||
    (!mode && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const rows = [...document.querySelectorAll<HTMLElement>('[data-craft-row]')];
  if (!rows.length) return;

  /** Entrega a página pronta, sem entrada nenhuma. */
  const showEverything = () => {
    root.removeAttribute('data-craft-rows');
    rows.forEach((row) => row.classList.add('is-in'));
  };

  if (reduced || !('IntersectionObserver' in window)) {
    showEverything();
    return;
  }

  const io = new IntersectionObserver((entries) => {
    let step = 0;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const row = entry.target as HTMLElement;

      // Uma linha entra uma vez. Sem isto ela se apagaria e reacenderia a
      // cada passada da rolagem, e uma lista de doze viraria um pisca-pisca
      // pra quem sobe e desce procurando um projeto.
      io.unobserve(row);

      if (step) {
        row.style.setProperty(
          '--row-delay',
          `${Math.min(step, STAGGER_CAP) * STAGGER}s`,
        );
      }
      step += 1;

      row.classList.add('is-in');
    }
  }, { threshold: THRESHOLD });

  rows.forEach((row) => io.observe(row));
}
