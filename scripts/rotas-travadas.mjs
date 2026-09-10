// scripts/rotas-travadas.mjs — os endereços públicos que não podem mudar.
//
// No Astro o nome do arquivo em src/pages/ É a URL: src/pages/x.astro publica
// /x. Isso torna o rename de uma página uma mudança de endereço, e não uma
// arrumação interna — só que ela não se parece com uma. "Padronizar em
// kebab-case", "agrupar numa pasta", "traduzir o nome": qualquer uma delas
// troca a URL, e nada acusa. O build passa, o site sobe, a página existe.
// Quem tinha o link antigo é que descobre, no 404, e não há como avisar.
//
// Uma URL destas já foi divulgada fora do site. A partir daí ela deixou de ser
// detalhe de implementação e virou compromisso: não se retira o que já está
// com outra pessoa.
//
// Esta lista é a fonte única de três verificações, pra que não haja duas
// versões da verdade pra sair de sincronia:
//
//   • astro.config.mjs      — derruba o BUILD se a rota não sair no dist
//   • .githooks/pre-commit  — barra o COMMIT que remove a página
//   • .github/workflows/    — refaz a checagem do build no PUSH, no servidor
//
// Aposentar uma rota é decisão do dono do site, não de quem está de passagem
// por outra tarefa: tirar uma entrada daqui é uma escolha deliberada, feita no
// mesmo commit que remove a página, e não o jeito de fazer um erro parar de
// apitar.
export const ROTAS_TRAVADAS = [
  {
    caminho: '/colecaocriacoes',
    arquivo: 'src/pages/colecaocriacoes.astro',
    porque: 'URL já divulgada externamente',
  },
];
