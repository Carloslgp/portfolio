// @ts-check
import { defineConfig } from 'astro/config';
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, extname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.avif', '.webp']);
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.svg']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

/**
 * Varre o dist procurando imagem que ninguém pede, e apaga.
 *
 * O problema concreto: a página /photos descobre as fotos por
 * `import.meta.glob` e gera duas variantes de cada uma com getImage() — um
 * thumb leve pro mural e uma grande pro lightbox. Só que importar a foto pelo
 * astro:assets também EMITE o arquivo original, porque o ImageMetadata que o
 * glob devolve carrega um `.src` que aponta pra ele. O cliente nunca usa esse
 * `.src` (o JSON da página só leva as duas variantes), mas os 22 MB de JPEG de
 * câmera iam pro deploy assim mesmo — mais peso que o site inteiro.
 *
 * O teste é o mais conservador possível: o arquivo só cai se o nome dele (que
 * é hasheado, portanto único) não aparecer em NENHUM texto do build — nem
 * HTML, nem JS, nem CSS, nem JSON.
 *
 * E a varredura fica dentro de _astro/ de propósito. Lá tudo é gerado pelo
 * bundler e endereçado por hash, então "sem referência" quer dizer morto de
 * verdade. Fora dali mora o public/, que é copiado tal e qual e é do autor —
 * uma imagem que só é montada por string em tempo de execução é escolha
 * legítima dele, e apagá-la seria uma armadilha silenciosa.
 */
function prunarImagensOrfas() {
  return {
    name: 'prunar-imagens-orfas',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const assets = join(root, '_astro');

        let files;
        try {
          files = await walk(root);
        } catch {
          return;
        }

        const texts = await Promise.all(
          files
            .filter((f) => TEXT_EXT.has(extname(f).toLowerCase()))
            .map((f) => readFile(f, 'utf8').catch(() => '')),
        );
        const haystack = texts.join('\n');

        let freed = 0;
        for (const file of files) {
          if (!file.startsWith(assets)) continue;
          if (!IMAGE_EXT.has(extname(file).toLowerCase())) continue;
          if (haystack.includes(basename(file))) continue;

          freed += (await stat(file)).size;
          await unlink(file);
          logger.info(`órfã removida: ${relative(root, file)}`);
        }

        if (freed) logger.info(`${(freed / 1024 / 1024).toFixed(1)} MB a menos no deploy`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [prunarImagensOrfas()],
  vite: {
    plugins: [tailwindcss()]
  }
});
