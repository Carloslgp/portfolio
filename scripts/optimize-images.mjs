// scripts/optimize-images.mjs — encolhe as imagens de public/ pro tamanho em
// que elas de fato aparecem na tela.
//
// Por que isto existe: public/ é copiado VERBATIM pro dist (é a única pasta que
// não passa pelo pipeline do Astro), então uma foto de 4000px jogada aqui é uma
// foto de 4000px baixada pelo visitante. Foi assim que as cinco texturas do
// carrossel chegaram a 8,7 MB — todas baixadas ANTES da cortina sair, porque o
// anel não pode aparecer sem elas.
//
// A regra de cada pasta abaixo é o tamanho em que aquilo aparece na tela, vezes
// 2 (telas densas). Não há motivo pra mandar mais pixels do que cabem no
// elemento — o navegador só joga fora, depois de baixar e decodificar.
//
// O original é APAGADO depois de convertido, de propósito: deixá-lo em public/
// significaria continuar publicando os dois. Ele não se perde — está no
// histórico do git (`git show HEAD:public/textures/craft.jpg > craft.jpg`).
//
// Idempotente: rodar duas vezes não faz nada na segunda. E se o .webp sair
// MAIOR que a fonte (acontece com arquivo já otimizado, tipo .avif), a fonte
// fica onde está e o .webp é descartado.
//
//   npm run images
import { readdir, stat, unlink, mkdir, rename, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

// As medidas vêm da tela, não do gosto:
const POLICY = [
  {
    // As fotos do anel 3D.
    //
    // convert: false — elas continuam JPEG, e isso é uma decisão, não um
    // esquecimento. Convertê-las é possível, mas passa a exigir que a cena
    // seja conferida foto a foto, então fica fora do automático.
    //
    // Elas eram as únicas imagens do site com EXIF de orientação ATIVO e
    // diferente entre si, e a cena contava com o navegador aplicar essa tag
    // antes do giro fixo do Segment.ts — até uma limpeza de metadados derrubar
    // as tags e deitar três das cinco. O giro está gravado nos pixels desde
    // então, e os arquivos aqui não têm mais EXIF: o .rotate() do convert()
    // abaixo, no thumb, é um no-op nelas e é assim que tem que ser.
    //
    // O thumb, esse sim, sai daqui: é o círculo de 48px do card na base da
    // tela, que antes apontava pra textura inteira — 4000px de JPEG
    // decodificados pra caber em 48, a cada troca de seção.
    dir: 'public/textures',
    convert: false,
    thumbs: { dir: 'public/textures/thumbs', maxSide: 160, quality: 75 },
  },
  {
    // As fotos dentro do texto do About (.shot). A coluna tem 42rem de teto,
    // ~624px de conteúdo — 1400 já é dpr 2 com sobra.
    dir: 'public/images/about_main_photos',
    maxSide: 1400,
    quality: 80,
  },
  {
    // As capas da fita 3D de jogos: mesma coluna, mas em 16/9 e dentro de um
    // canvas que nunca mostra a imagem inteira em tamanho real.
    dir: 'public/images/about',
    maxSide: 1280,
    quality: 80,
  },
  {
    // As capas das músicas: 5,5rem (88px) na fila, e o modal não passa disso.
    dir: 'public/images/about_albuns_photos',
    maxSide: 480,
    quality: 80,
  },
  {
    // Os selos das entradas da /work. O selo tem 3rem e uns 34px de conteúdo
    // depois do padding, então 192 já é dpr 3 com folga.
    //
    // pickSmaller é por causa da MISTURA que esta pasta tem. Metade são logos
    // chapados de origem vetorial (Bradesco, PUCPR, Trade Stars, CBSoft), e
    // nesses o lossless ganha do lossy com folga — o q90 gasta bytes inventando
    // ruído em áreas de cor sólida. A outra metade nasceu de JPEG (Octa-Core,
    // Startup Weekend) e já traz ruído de compressão gravado nos pixels: ali o
    // lossless tem que codificar o ruído fielmente e dobra de tamanho, enquanto
    // o lossy o joga fora, que é o que se quer. Medido, nesta pasta: 55,4 KB de
    // PNG viram 40,7 escolhendo sempre lossless, 31,1 sempre lossy e 26,1
    // escolhendo o menor caso a caso.
    //
    // O .svg do Nock não entra (não está em SOURCES) e é assim que tem que ser:
    // vetor virando bitmap é downgrade, não otimização.
    dir: 'public/images/work',
    maxSide: 192,
    quality: 90,
    pickSmaller: true,
  },
];

// .gif fica de fora: GIF animado não vira webp, vira VÍDEO (ver o comentário do
// bloco `video` em src/data/about.ts). Converter aqui só perderia a animação.
const SOURCES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** O webp de uma foto, já no tamanho, como buffer.
 *
 *  `lossless` é decisão de PASTA, não de arquivo — exceto onde a regra pede
 *  pickSmaller, e aí quem decide é a balança. */
async function encode(srcPath, maxSide, quality, lossless = false) {
  // failOn: 'none' — alguns JPEGs de câmera/celular trazem marcadores fora do
  // padrão ("Invalid SOS parameters") que o libvips recusa por padrão. O
  // navegador decodifica esses arquivos numa boa, então recusá-los aqui só
  // deixaria a foto pesada no ar.
  return sharp(srcPath, { failOn: 'none' })
    // .rotate() sem argumento GRAVA NOS PIXELS a rotação que o EXIF só
    // descrevia. Isto não é detalhe: a saída não leva metadado, então uma foto
    // com Orientation=6 que saísse daqui sem o giro chegaria ao navegador
    // deitada — e foi exatamente o que aconteceu com as texturas do anel, que
    // têm tags diferentes entre si (8, 6, 3, 1 e nenhuma). Sem isto, o giro
    // fixo do Segment.ts passa a corrigir a foto errada.
    .rotate()
    // withoutEnlargement: pedir 2048 numa foto menor devolve a original. O teto
    // é teto, não alvo — nada aqui é ampliado.
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp(lossless ? { lossless: true, effort: 6 } : { quality, effort: 6 })
    .toBuffer();
}

/** Escreve o webp e devolve o tamanho. Com `pickSmaller`, encoda dos dois jeitos
 *  e grava o menor — os dois caminhos custam alguns ms numa imagem de 192px, e
 *  é a única forma de acertar numa pasta com origens diferentes. */
async function convert(srcPath, outPath, maxSide, quality, pickSmaller = false) {
  const lossy = await encode(srcPath, maxSide, quality);
  const best = pickSmaller
    ? [lossy, await encode(srcPath, maxSide, quality, true)].sort((a, b) => a.length - b.length)[0]
    : lossy;

  await writeFile(outPath, best);
  return best.length;
}

async function run() {
  let saved = 0;
  let before = 0;

  for (const rule of POLICY) {
    let files;
    try {
      files = await readdir(rule.dir);
    } catch {
      console.warn(`· ${rule.dir} não existe — pulando`);
      continue;
    }

    if (rule.thumbs) await mkdir(rule.thumbs.dir, { recursive: true });

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (!SOURCES.has(ext)) continue;

      const srcPath = join(rule.dir, file);
      const info = await stat(srcPath);
      if (!info.isFile()) continue;

      const name = basename(file, extname(file));
      const outPath = join(rule.dir, `${name}.webp`);

      // um arquivo problemático não pode derrubar a leva inteira e deixar
      // public/ metade convertido: cada foto se resolve (ou falha) sozinha
      try {
        // o thumb sai da fonte GRANDE, então é gerado antes de ela virar webp
        // (e é regerado sempre: são alguns KB, não vale rastrear estado)
        if (rule.thumbs) {
          await convert(
            srcPath,
            join(rule.thumbs.dir, `${name}.webp`),
            rule.thumbs.maxSide,
            rule.thumbs.quality,
          );
        }

        // pasta só de thumb (ver convert: false): a fonte fica como está
        if (rule.convert === false) continue;

        // já é o próprio destino e já está no tamanho: nada a fazer
        if (srcPath === outPath) {
          const meta = await sharp(srcPath, { failOn: 'none' }).metadata();
          if (Math.max(meta.width ?? 0, meta.height ?? 0) <= rule.maxSide) {
            console.log(`= ${srcPath} (já no tamanho)`);
            continue;
          }
        }

        const tmp = `${outPath}.tmp`;
        await convert(srcPath, tmp, rule.maxSide, rule.quality, rule.pickSmaller);
        const out = await stat(tmp);

        // o webp saiu maior que a fonte (avif costuma ganhar): fica a fonte
        if (out.size >= info.size) {
          await unlink(tmp);
          console.log(`= ${srcPath} (${kb(info.size)}) — já menor que o webp, mantido`);
          continue;
        }

        await rename(tmp, outPath);
        if (srcPath !== outPath) await unlink(srcPath);

        before += info.size;
        saved += info.size - out.size;
        console.log(`✓ ${srcPath} ${kb(info.size)} → ${outPath} ${kb(out.size)}`);
      } catch (err) {
        console.error(`✗ ${srcPath} — ${err.message}`);
      }
    }
  }

  console.log(
    `\n${kb(saved)} a menos (de ${kb(before)}). ` +
    `Se algum caminho mudou de extensão, ajuste-o em src/data/ ou no config do carrossel.`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
