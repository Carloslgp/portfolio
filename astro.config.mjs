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

/* ——— ROTAS TRAVADAS ———
 *
 * Endereços que já foram entregues a alguém de fora e por isso deixaram de
 * ser detalhe de implementação: viraram compromisso. Um link que já saiu não
 * volta — não dá pra avisar quem o recebeu que o caminho mudou.
 *
 * Cada entrada é um caminho público e o arquivo que o produz. No Astro o
 * NOME DO ARQUIVO É A URL, então renomear src/pages/x.astro é publicar um
 * endereço diferente — uma refatoração que parece inofensiva ("padronizar
 * nomes de página", "usar kebab-case", "agrupar em pasta") derruba o link
 * sem erro nenhum: o build passa, o site sobe, e só quem clica descobre.
 *
 * Daí este guarda existir no BUILD e não num comentário. Comentário depende
 * de alguém ler; isto falha alto, antes do deploy, e diz o que consertar.
 */
const ROTAS_TRAVADAS = [
  {
    caminho: '/colecaocriacoes',
    arquivo: 'src/pages/colecaocriacoes.astro',
    // Enviado a avaliador de processo seletivo em setembro de 2026. Esta
    // URL não pode mudar enquanto o processo estiver de pé.
    porque: 'link enviado a avaliador de processo seletivo',
  },
];

/**
 * Confere, depois do build, que toda rota travada saiu no dist.
 *
 * O teste é o arquivo que o visitante realmente baixa (dist/<rota>/index.html),
 * não a lista de rotas do Astro: é o resultado que importa, e é ele que estará
 * no ar. Se faltar, o build MORRE — porque um deploy com a rota trocada é
 * exatamente o estrago que este arquivo existe pra impedir, e um aviso no log
 * passaria batido no CI.
 */
function travarRotasPublicas() {
  return {
    name: 'travar-rotas-publicas',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const quebradas = [];

        for (const rota of ROTAS_TRAVADAS) {
          const pagina = join(root, rota.caminho.replace(/^\//, ''), 'index.html');
          try {
            await stat(pagina);
            logger.info(`${rota.caminho} no lugar`);
          } catch {
            quebradas.push(rota);
          }
        }

        if (quebradas.length) {
          const detalhe = quebradas
            .map(
              (r) =>
                `  ${r.caminho}\n` +
                `    esperado a partir de: ${r.arquivo}\n` +
                `    por que está travada: ${r.porque}`,
            )
            .join('\n');

          throw new Error(
            `\n\nROTA TRAVADA SUMIU DO BUILD\n\n${detalhe}\n\n` +
              `Estes endereços já foram entregues a pessoas de fora e não podem mudar.\n` +
              `Se um arquivo de página foi renomeado ou movido, DESFAÇA — o nome do\n` +
              `arquivo é a URL. Se a rota está sendo aposentada de propósito, quem\n` +
              `decide isso é o dono do site, não o build: tire a entrada de\n` +
              `ROTAS_TRAVADAS no mesmo commit, explicando por quê.\n`,
          );
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [prunarImagensOrfas(), travarRotasPublicas()],
  vite: {
    plugins: [tailwindcss()]
  }
});
