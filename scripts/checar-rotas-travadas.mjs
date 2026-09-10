// scripts/checar-rotas-travadas.mjs — a checagem barata das rotas travadas,
// a que roda SEM build.
//
// O guarda do astro.config.mjs é o definitivo, porque olha o dist: o que
// realmente vai pro ar. Mas ele custa um build inteiro e só fala depois. Este
// aqui responde em milissegundos olhando se o arquivo de página existe, o que
// é suficiente pra pegar o caso que interessa — a página renomeada, movida ou
// apagada — e barato o bastante pra caber num hook de commit.
//
//   node scripts/checar-rotas-travadas.mjs           confere o disco
//   node scripts/checar-rotas-travadas.mjs --index   confere o que está STAGED
//
// O --index existe porque um rename só aparece no índice do git: o arquivo
// novo está no disco e o antigo não, exatamente como ficaria depois do commit.
import { stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ROTAS_TRAVADAS } from './rotas-travadas.mjs';

const run = promisify(execFile);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const noIndice = process.argv.includes('--index');

/** O arquivo está onde deveria? No índice do git ou no disco, conforme o modo. */
async function existe(arquivo) {
  if (noIndice) {
    try {
      await run('git', ['ls-files', '--error-unmatch', arquivo], { cwd: raiz });
      return true;
    } catch {
      return false;
    }
  }

  try {
    await stat(join(raiz, arquivo));
    return true;
  } catch {
    return false;
  }
}

const sumidas = [];
for (const rota of ROTAS_TRAVADAS) {
  if (!(await existe(rota.arquivo))) sumidas.push(rota);
}

if (sumidas.length) {
  const detalhe = sumidas
    .map((r) => `  ${r.caminho}\n    precisa vir de: ${r.arquivo}\n    travada porque: ${r.porque}`)
    .join('\n');

  process.stderr.write(
    `\nPÁGINA DE ROTA TRAVADA NÃO ESTÁ NO LUGAR\n\n${detalhe}\n\n` +
      `No Astro o nome do arquivo é a URL, então renomear ou mover a página\n` +
      `publica um endereço diferente e quebra o link que já está circulando.\n` +
      `Desfaça o rename. Se a rota está sendo aposentada de propósito, isso é\n` +
      `decisão do dono do site — e não se faz editando a lista pra calar o erro.\n\n` +
      `Lista: scripts/rotas-travadas.mjs\n\n`,
  );
  process.exit(1);
}

if (!process.argv.includes('--silencioso')) {
  console.log(`rotas travadas no lugar: ${ROTAS_TRAVADAS.map((r) => r.caminho).join(', ')}`);
}
