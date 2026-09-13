# Coleção de Criações — guia de preenchimento

Página: `/colecaocriacoes` (`src/pages/colecaocriacoes.astro`).
Conteúdo: **`src/data/creations.ts`** — é o único arquivo que você abre pra
preencher. A página se atualiza sozinha.

Tudo que está lá hoje é mock. Nenhum texto é real.

## Onde vai cada coisa

```
 ABERTURA (OPENING)                        primeira tela
 ┌────────────────────────────────────────────────────────┐
 │  kicker            ← rótulo pequeno, caixa alta         │
 │  title.line1       ← "Coleção de"                       │
 │  title.line2       ← "criações." (sai em itálico)       │
 │  lead              ← 1–2 frases                         │
 │                                                        │
 │                  hint ("Role para começar")            │
 └────────────────────────────────────────────────────────┘

 CADA CRIAÇÃO (um objeto de CREATIONS)     uma tela cada
 ┌────────────────────────────────────────────────────────┐
 │   ┌──────────┐   "Criação 03 · Projeto · 2024"         │ ← UI.item + nº + KIND_LABEL[kind] + date
 │   │          │   title                                  │ ← Playfair grande, 2–4 palavras
 │   │  image   │   description                            │ ← até 3 frases (~260 caracteres)
 │   │  (alt)   │   description continua...                │
 │   │          │   links[0].label ↗  links[1].label ↗     │ ← opcional, 1 ou mais
 │   └──────────┘                                          │
 │                                                 03 / 08 │ ← contador (automático)
 └────────────────────────────────────────────────────────┘
   no celular a imagem fica em cima e o texto embaixo

 FECHAMENTO (CLOSING)                      última tela
 ┌────────────────────────────────────────────────────────┐
 │                   kicker                                │
 │                   title                                 │
 │                   text                                  │
 │        links[0]  links[1]  links[2]  ...                │
 │                   ai                                    │ ← aviso de uso de IA, pequeno
 └────────────────────────────────────────────────────────┘
```

A numeração ("01", "02"…) e o contador lateral ("03 / 08") saem da ordem da
lista. Não há campo pra eles.

## Campos de uma criação

| campo         | obrigatório | o que é                                                       |
|---------------|-------------|---------------------------------------------------------------|
| `id`          | sim         | chave estável (`'meu-projeto'`), só letras/números/hífen. Vira a âncora `#criacao-NN` e aparece nos erros do build |
| `kind`        | sim         | `'photo'`, `'project'`, `'repo'`, `'bio'`, `'leadership'`, `'teaching'`, `'speech'`, `'art'`, `'hobby'` ou `'other'` — prefira o mais específico que servir, `'other'` é só pro que não se encaixa em nenhum. O rótulo de cada um está em `KIND_LABEL` |
| `title`       | sim         | 2–4 palavras                                                  |
| `date`        | sim         | texto livre, mostrado como está: `'2024'`, `'mai 2025'`, `'2019–2021'`. String vazia esconde |
| `description` | sim         | até 3 frases. Mais que isso pode não caber num celular em pé |
| `image`       | sim         | um import de `src/assets/…` (ver abaixo)                      |
| `alt`         | sim         | o que a imagem mostra, pra leitor de tela                     |
| `links`       | não         | `[{ label: 'Ver no GitHub', href: 'https://…' }]` — um ou mais, lado a lado, abrem em aba nova |
| `effect`      | sim         | a animação (ver abaixo)                                       |
| `from`        | não         | só pro `slide`: `'left'` ou `'right'` (padrão)                |
| `missingPhoto`| não         | `true` quando a foto de verdade ainda não chegou (ver abaixo) |
| `evolution`   | não         | os estágios seguintes a `image`, pra criações que são um processo (ver abaixo) |
| `gallery`     | não         | fotos extras do MESMO instante que `image`, trocadas por clique (ver abaixo) |

## Os efeitos

A foto de toda criação já está no canva de fundo, como miniatura. Conforme
você rola ela sobe com o canva e se encaixa na moldura; na saída volta ao
canva e segue subindo. O efeito é **como** ela se encaixa:

| `effect`   | como a miniatura chega à moldura                                    |
|------------|----------------------------------------------------------------------|
| `'grow'`   | sobe do canva num arco, crescendo até o tamanho da moldura           |
| `'slide'`  | vem de um lado da tela (`from`), numa curva larga por baixo do texto |
| `'tilt'`   | sobe deitada pra trás e se levanta a partir da base                  |
| `'pieces'` | uma foto só, fatiada em ripas que ondulam do centro pras bordas      |
| `'iris'`   | a miniatura é uma lente redonda que se abre até a foto inteira       |
| `'flip'`   | gira como uma porta, com a dobradiça na borda do lado do texto       |

A saída é o espelho da entrada — só que o texto sai primeiro e a foto espera
ele sair antes de se soltar da moldura.

Em toda criação a foto nunca fica parada: durante a leitura a composição
inteira deriva devagar e a foto anda dentro da própria moldura, como uma
janela. E atrás de tudo, o número da criação em itálico gigante atravessa a
tela bem clarinho (o "fólio").

**Uma regra:** duas criações vizinhas não podem usar o mesmo efeito. Se
acontecer (ao reordenar, por exemplo), o `astro build` / `astro dev` para com
uma mensagem dizendo quais são as duas.

Efeito com nome errado também é recusado — o editor já autocompleta a lista.

## Tarefas comuns

- **Trocar um texto** → editar a string.
- **Reordenar** → mover o objeto dentro de `CREATIONS`. Conferir a regra das
  vizinhas.
- **Trocar a animação de uma** → mudar só o `effect` dela.
- **Adicionar** → copiar um objeto, trocar `id` e o resto. Pode ter mais ou
  menos que oito.
- **Remover** → apagar ou comentar o objeto.
- **Trocar uma imagem** →
  1. pôr o arquivo em `src/assets/photos/` (ou outra pasta de `src/assets/`);
  2. importar no topo de `creations.ts`:
     `import minhaFoto from '../assets/photos/minha-foto.webp';`
  3. `image: minhaFoto`.
  O Astro gera as variantes no build. **Não** precisa de `npm run images`
  (esse script é só pra `public/`). Vale foto em pé ou deitada: a moldura
  segue a proporção do arquivo.
- **Mudar os links do fechamento** → `CLOSING.links`. O link pra `/` recebe
  `rel="noreferrer"` automaticamente (é o que faz a home rodar a abertura
  inteira ao voltar).
- **Marcar uma criação sem foto de verdade** → ela ainda PRECISA de um
  `image` (é dele que o encaixe anima), então aponte pra
  `src/assets/creations/foto-em-falta.webp` (a moldura reservada, já
  importada no topo do arquivo) e ponha `missingPhoto: true`. A página
  escreve um aviso "Fotos em falta" bem visível no kicker daquela criação —
  ninguém confunde o placeholder com uma foto de verdade.
- **A foto que faltava chegou** → jogar o arquivo em
  `src/assets/creations/`, importar no topo do arquivo, trocar `image` pra
  ele, apagar (ou pôr `false` em) `missingPhoto`, e conferir se o `alt` ainda
  descreve a foto de verdade (ele já devia estar escrito pensando nela).

## Uma criação que é um processo (`evolution`)

Pra quando a criação não é um instante, mas uma jornada — hoje é o caso da
pixel art. `image` é o PRIMEIRO estágio (o que chega do canva); `evolution`
é a lista dos estágios seguintes, cada um com uma data curta:

```ts
image: pixelart1,       // o esboço — o que a moldura mostra ao chegar
// …
evolution: [
  { image: pixelart2, date: '17 abr', alt: '…' },
  // …
  { image: pixelartBarrel, date: '9 jul', alt: '…' }, // o mais recente
],
```

No palco, todos os estágios ocupam a MESMA moldura — não é uma foto a mais
na tela, é a mesma foto mudando. Rolar a pausa de leitura da criação (a
única fase em que dá pra rolar sem ela ir embora) avança de um estágio pro
próximo; quem decide isso é o `stageOp` em `scripts/creations/field.ts`,
puro função do tempo de rolagem, como todo o resto do motor. Antes da pausa é
sempre o primeiro estágio; depois dela, sempre o último — é ele que sai e
volta a ser miniatura no canva.

A versão simples (sem rolagem presa: baixa animação, ou tela baixa demais)
não tem como fazer a foto mudar sozinha, então ali `evolution` vira uma
fileira sempre visível abaixo da descrição, cada foto com a data embaixo —
ver `.cc-evolution` no CSS da página, escondida no palco de propósito (lá a
moldura já conta a mesma história).

Uma criação com `evolution` também rola MAIS que as outras: a pausa de
leitura dela cresce meia tela por troca de desenho (`SCROLL.SCREENS_PER_STAGE`
no config), e em cada trecho a moldura fica parada no desenho e só troca no
meio dele (`SCROLL.STAGE_FADE`). As outras criações não mudam de tamanho — ver
`extraHold` em `scripts/creations/timing.ts`.

A ordem da lista **é** a ordem que aparece — sempre cronológica, do mais
antigo pro mais recente, pelo mesmo motivo do `PIXEL_PIECES` em
`data/craftCreative.ts`: a evolução existe pra mostrar distância percorrida.

Opcional — a maioria das criações não tem `evolution`, e não precisa. Repare
que `effect` não pode ser `'pieces'` numa criação com `evolution`: as ripas
fatiam UMA foto no espaço, e não fazem sentido fatiando várias no tempo.

## Uma criação com mais de uma foto (`gallery`)

Pra quando uma criação tem várias fotos do MESMO instante — hoje é o caso de
'fazer-amigos' (4 fotos de amigos diferentes), 'acampar-com-amigos' (3) e
'apaixonado-por-pokemon' (4: o Hall da Fama, o Pokédex, as cartas, as
pelúcias). Ao contrário de `evolution` (instantes DIFERENTES, com data, que a
rolagem avança sozinha), aqui quem escolhe qual foto ver é a pessoa lendo,
clicando numa seta — a criação pode estar parada, sem rolagem nenhuma pra
avançar. `image` continua sendo a PRIMEIRA foto (a que chega do canva);
`gallery` é só o resto, sem data:

```ts
image: amigos1,
alt: '…',
gallery: [
  { image: amigos2, alt: '…' },
  { image: amigos3, alt: '…' },
  { image: amigos4, alt: '…' },
],
```

No palco, um par de setas aparece perto do fim da tela enquanto esta criação
está ativa (fora da moldura — ver o comentário do markup em
`colecaocriacoes.astro`, perto de `[data-cc-gallery-nav]` — porque uma
composição `full` centraliza a foto com `transform`, e isso quebraria um
`position: fixed` posicionado dentro dela) e troca qual foto está em cima —
a MESMA pilha de elementos de `evolution`, só que a posição vem de um clique
em vez do progresso da rolagem (`galleryPos` em `scripts/creations/field.ts`).

Na versão simples, sem clique animado, as fotos extras viram uma fileira
sempre visível abaixo da descrição — igual `evolution`, mas sem data (ver
`.cc-gallery-strip` no CSS da página).

Opcional — a maioria das criações não tem `gallery`. Repare que `effect` não
pode ser `'pieces'` numa criação com `gallery` (mesmo motivo de `evolution`),
e uma criação não pode ter `gallery` e `evolution` ao mesmo tempo — as duas
disputariam a mesma moldura.

## Um intervalo só de texto (`Interlude`)

Nem toda tela da coleção é uma criação. Antes dos projetos de programação há
um INTERVALO: uma tela só de texto avisando que ali estão só os principais,
com um link pro GitHub e outro pra página Craft. Ele mora na mesma lista
`CREATIONS`, no lugar exato em que aparece, e se distingue por
`interlude: true`:

```ts
{
  interlude: true,
  id: 'projetos-de-programacao',
  kicker: 'Projetos de programação',
  title: 'Só os principais',
  description: '…',
  photo: { image: githubPerfil, alt: '…' }, // opcional
  links: [
    { label: 'Ver o meu GitHub', href: 'https://github.com/Carloslgp' },
    { label: 'Ir para a página Craft', href: '/craft/programming' },
  ],
},
```

`photo` é opcional: uma foto parada ao lado do texto (no celular, em cima).
Ela não vem do canva nem se encaixa numa moldura — entra e sai junto com o
intervalo inteiro.

Sem efeito, sem composição e sem número: ele rola no mesmo ritmo
das criações (entrada, pausa de leitura, saída), mas a numeração ("Criação
03", o contador, as âncoras `#criacao-NN`) pula ele — a âncora dele é o
próprio `id`; enquanto ele está na tela, o contador lateral mostra "—". E a
regra das vizinhas compara foto com foto: duas criações com o mesmo efeito,
uma de cada lado de um intervalo, continuam sendo recusadas.

## O canva de fotos do fundo

Atrás da abertura e das criações há um canva de fotos espalhadas que rola
com a página: pra baixo as fotos sobem e aparecem novas por baixo, pra cima o
contrário. A maioria é fantasma; algumas acendem nas margens; durante a pausa
de leitura de cada criação o canva inteiro escurece. Quais fotos entram é a
lista **`FIELD_PHOTOS`** em `creations.ts`: só os imports, na ordem que quiser
(a posição de cada uma é sorteada no build, sempre igual). O canva tem mais
lugares que fotos, então a lista repete — quanto mais fotos, menos repetição.

A foto de cada criação **não** precisa estar nessa lista: ela entra no canva
por conta própria, como miniatura, e é de lá que vem se encaixar na moldura.

O canva é decorativo (sem alt), não existe na versão simples e no celular fica
com metade das fotos e mais fraco. Velocidade, densidade, tamanhos, luzes e a
semente do sorteio ficam em `config.ts` → `FIELD`.

## Velocidade, duração e ajuste fino

Não ficam no arquivo de conteúdo. Tudo está em
**`src/scripts/creations/config.ts`**, comentado:

O topo do `config.ts` tem os quatro botões de "sensação", um por queixa:

- **"ainda está rápido"** → `SMOOTH.WHEEL` (quanto cada dente da roda anda;
  0.9 → 0.8 deixa tudo mais lento sem esticar a página);
- **"está mole, flutuando"** → `SCROLL.SCRUB` (a inércia da animação atrás
  da rolagem; 0.4 → 0.25);
- **"o fundo está agitado"** → `FIELD.RATE` e `FIELD.TEMPO`;
- **"a pausa está inquieta"** → `HOLD.CRUISE` e `FIELD.INNER.BLEED`.

E os outros números:

- `SCROLL.SCREENS_PER_CREATION` — quanto se rola por criação (hoje ~29 dentes
  de roda em qualquer monitor);
- `SCROLL.PHASES` — quanto da criação é entrada, pausa de leitura e saída;
- `SMOOTH.LERP` — o quanto a rolagem desliza depois de cada dente (só no
  computador; no celular a rolagem é a do próprio aparelho);
- `DOCK.*` — o encaixe da foto: as curvas, o arco do caminho, a espera da
  saída (`RELEASE`);
- `TYPE.*` — quando e como cada linha do texto se escreve e sai;
- `LAYOUT.MIN_STAGE_HEIGHT` — abaixo desta altura de tela a página mostra a
  versão simples (empilhada);
- `FIELD.*` — o canva de fotos do fundo: `RATE` (velocidade em relação à
  página), `ROW_VH`/`FILL` (densidade), `SIZES_VMIN`/`FEATURED_VMIN`
  (tamanhos), `GHOST`/`LIT`/`BREATH_MIN`/`LIT_SHARE` (quanto aparece),
  `SEED` (trocar sorteia outro arranjo);
- `EFFECTS.*` — o ajuste de cada encaixe (ângulo do tilt e do flip, número
  de tiras do pieces, de que distância o slide vem).

## Quando a página mostra a versão simples

Sempre que o palco não faria sentido: sem JavaScript, com baixa animação
(a escolha do portão do site, ou o `prefers-reduced-motion` do sistema pra
quem entrou por link direto) ou em telas mais baixas que
`LAYOUT.MIN_STAGE_HEIGHT` (celular deitado). As criações viram blocos
empilhados, uma tela cada, com rolagem comum; o contador continua
funcionando.

## Ver localmente

```
npm run dev
```

e abrir `http://localhost:4321/colecaocriacoes`.
