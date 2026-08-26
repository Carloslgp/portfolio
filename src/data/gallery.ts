// src/data/gallery.ts — o contrato de BUILD entre a home e a página de fotos.
//
// A transição home → /photos é uma EMENDA: o último quadro da home e o
// primeiro do mural são a mesma foto, em tela cheia, no mesmo enquadramento.
// Isso só funciona se as duas páginas apontarem para o MESMO arquivo gerado —
// se cada uma pedisse a sua variante ao getImage com opções próprias, sairiam
// dois arquivos com hashes diferentes, e a página nova baixaria de novo, do
// zero, exatamente o que a anterior acabou de mostrar. Com as mesmas opções o
// Astro devolve a mesma URL, e a foto já chega decodificada no cache.
//
// Por isso as opções de variante e a geometria da emenda moram aqui e não no
// frontmatter de cada página: elas são um acordo entre duas páginas, não
// detalhe de uma delas.
import { ARC_WIDTH, HEIGHT } from '../components/carousel/config';

/** A foto da emenda, pelo nome do arquivo em src/assets/photos/.
 *
 *  `anjo.jpg` é a MESMA foto do segmento "Photos" do anel
 *  (public/textures/photos.jpg), com uma diferença gravada nos pixels: o giro
 *  de 90° que o Segment.ts faz por conta própria em toda textura da fita
 *  (`texture.rotation = -π/2`). Sem esse giro assado aqui, a mesma foto
 *  apareceria em pé no anel e deitada no mural — e a emenda, que vive de os
 *  dois enquadramentos serem idênticos, viraria um tombo de 90°.
 *
 *  (Eram duas diferenças: a textura do anel dependia do navegador aplicar o
 *  EXIF, que este arquivo já trazia aplicado. Hoje as duas pontas têm o giro
 *  nos pixels e nenhuma tem metadado — ver components/carousel/config.ts.)
 *
 *  Trocar a foto do anel pede regerar este arquivo: sharp → .rotate(90) sobre
 *  a textura nova. */
export const SEAM_PHOTO = 'anjo.jpg';

/** As DUAS variantes que o mural desenha, e por que são duas.
 *
 *  Quanta fonte um tile pede sai de uma conta só: a altura da linha, vezes o
 *  quanto a foto é deitada, vezes quantos pixels reais o canvas desenha por
 *  pixel de CSS. E a altura da linha depende da TELA (photos/config.ts →
 *  MURAL.ROW_HEIGHT_VW): 300px do tablet pra cima, ~175px num celular em pé.
 *
 *  Daí os dois números, medidos sobre esta pasta:
 *
 *    • celular EM PÉ — linha de 175px. Mesmo a foto mais deitada daqui (2.17:1)
 *      pede 760px. Os 800 cobrem a pasta inteira, e é por isso que o telefone
 *      não paga nada pela variante grande: ela nunca é pedida ali.
 *
 *    • tela grande (desktop, tablet, celular DEITADO) — linha de 300px. Aí uma
 *      16:9 pede 1067px e a mais larga pede 1300. Os 800 cobriam 40 das 56: as
 *      em pé, que fazem tile estreito. Toda foto deitada saía esticada, e
 *      quanto melhor a tela, mais aparecia.
 *
 *  Por que não um número só pra todo mundo: 1200 pra todos dobra o que se baixa
 *  na primeira tela (medido: 6,2 → 12,2 MB no celular) pra entregar detalhe que
 *  o telefone não tem onde mostrar. Quem escolhe é a tela — ver
 *  photos/resolution.ts, que refaz esta conta no cliente.
 *
 *  A grande sai com 3 pontos a menos de qualidade. Não é economia às cegas: em
 *  foto, mais pixels com um pouco menos de bit por pixel se lê melhor que o
 *  contrário — o artefato do WebP fica menor que o borrão da ampliação. */
export const THUMB = { width: 800, format: 'webp', quality: 75 } as const;
export const THUMB_WIDE = { width: 1400, format: 'webp', quality: 72 } as const;

/** A variante grande: o lightbox, e a foto da emenda em tela cheia nas duas
 *  pontas da transição. */
export const FULL = { width: 2400, format: 'webp', quality: 80 } as const;

/** Quanto além do viewport a foto atravessa a troca de página.
 *
 *  Mesmo com a superfície já plana, deixar a borda exatamente na janela cria
 *  uma linha sensível a arredondamento subpixel entre documentos. Esta sobra é
 *  só 6%: o bastante para a emenda acontecer dentro da foto sem voltar ao zoom
 *  extremo da primeira solução. */
export const SEAM_OVERSCAN = 1.06;

/** Proporção em que a foto existe NA FITA. O segmento usa o comprimento de
 *  arco como largura, portanto é um pouco mais largo que o arquivo original.
 *  A emenda conserva esta proporção nos dois documentos; /photos a devolve à
 *  proporção natural enquanto recua até o ladrilho. */
export const SEAM_ASPECT = ARC_WIDTH / HEIGHT;

/** A chave do sessionStorage que avisa a página de fotos que esta chegada veio
 *  do mergulho no anel — e que, portanto, ela deve abrir NA foto da emenda e
 *  recuar dali. Quem escreve é a home (scripts/main.ts); quem lê e APAGA é o
 *  script inline da página de fotos, antes do primeiro pixel.
 *
 *  sessionStorage, e não um parâmetro na URL: /photos é um endereço que se
 *  compartilha, e a coreografia de chegada não é parte do endereço. */
export const SEAM_ENTRY_KEY = 'mural-entry';

/** Marca a entrada de /photos que nasceu do anel.
 *
 * Diferente de SEAM_ENTRY_KEY, esta chave não descreve uma animação: ela é o
 * contrato de NAVEGAÇÃO entre as duas páginas. O referrer pode ser omitido por
 * política do navegador/site, então ele não é uma fonte confiável para decidir
 * se o “Voltar” deve usar o histórico. */
export const PHOTOS_RETURN_KEY = 'photos-return-to-ring';

/** O SEAM_ENTRY_KEY da volta: avisa a home de que o último quadro de /photos é
 *  a foto da emenda cobrindo a tela — o mesmo quadro em que esta página parou
 *  ao partir — e que, portanto, ela deve DESFAZER o avanço a partir dali em vez
 *  de repor a cena de estalo.
 *
 *  Quem escreve é a saída do mural, logo antes do history.back(); quem lê e
 *  APAGA é a home, ao ser restaurada. Sem a marca (botão voltar do navegador,
 *  baixa animação, ou uma home que o BFCache não guardou) o quadro que chega
 *  não é a foto, e desfazer o avanço em cima dele seria animar a partir de um
 *  estado que ninguém viu — daí o corte seco continuar sendo o certo ali. */
export const SEAM_BACK_KEY = 'mural-back';
