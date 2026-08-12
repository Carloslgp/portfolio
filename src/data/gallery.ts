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
 *  (public/textures/photos.jpg), com duas diferenças gravadas nos pixels: o
 *  EXIF já aplicado e o giro de 90° que o Segment.ts faz por conta própria em
 *  toda textura da fita (`texture.rotation = -π/2`). Sem esse giro assado aqui,
 *  a mesma foto apareceria em pé no anel e deitada no mural — e a emenda, que
 *  vive de os dois enquadramentos serem idênticos, viraria um tombo de 90°.
 *
 *  Trocar a foto do anel pede regerar este arquivo (ver o README/histórico:
 *  sharp → .rotate() pro EXIF, depois .rotate(90)). */
export const SEAM_PHOTO = 'anjo.jpg';

/** A variante que o MURAL desenha. 800px é a medida das linhas justificadas
 *  (TARGET_ROW_HEIGHT de 300px ⇒ um tile passa raspando dos 400px de largura)
 *  em tela densa, e nada além. */
export const THUMB = { width: 800, format: 'webp', quality: 75 } as const;

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
