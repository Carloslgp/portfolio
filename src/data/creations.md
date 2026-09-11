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
 │   │          │   link.label ↗                           │ ← opcional
 │   └──────────┘                                          │
 │                                                  03/08 │ ← indicador (automático)
 └────────────────────────────────────────────────────────┘
   no celular a imagem fica em cima e o texto embaixo

 FECHAMENTO (CLOSING)                      última tela
 ┌────────────────────────────────────────────────────────┐
 │                   kicker                                │
 │                   title                                 │
 │                   text                                  │
 │        links[0]  links[1]  links[2]  ...                │
 └────────────────────────────────────────────────────────┘
```

A numeração ("01", "02"…), o total ("/ 08") e o indicador lateral saem da
ordem da lista. Não há campo pra eles.

## Campos de uma criação

| campo         | obrigatório | o que é                                                       |
|---------------|-------------|---------------------------------------------------------------|
| `id`          | sim         | chave estável (`'meu-projeto'`), só letras/números/hífen. Vira a âncora `#criacao-NN` e aparece nos erros do build |
| `kind`        | sim         | `'photo'`, `'project'`, `'repo'` ou `'other'`. O rótulo de cada um está em `KIND_LABEL` |
| `title`       | sim         | 2–4 palavras                                                  |
| `date`        | sim         | texto livre, mostrado como está: `'2024'`, `'mai 2025'`, `'2019–2021'`. String vazia esconde |
| `description` | sim         | até 3 frases. Mais que isso pode não caber num celular em pé |
| `image`       | sim         | um import de `src/assets/…` (ver abaixo)                      |
| `alt`         | sim         | o que a imagem mostra, pra leitor de tela                     |
| `link`        | não         | `{ label: 'Ver no GitHub', href: 'https://…' }` — abre em aba nova |
| `effect`      | sim         | a animação (ver abaixo)                                       |
| `from`        | não         | só pro `slide`: `'left'` ou `'right'` (padrão)                |

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
- `JUMP.*` — o clique no indicador: perto a página desliza até lá, longe uma
  folha com o número da criação cobre a troca;
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
empilhados, uma tela cada, com rolagem comum; o indicador continua
funcionando.

## Ver localmente

```
npm run dev
```

e abrir `http://localhost:4321/colecaocriacoes`.
