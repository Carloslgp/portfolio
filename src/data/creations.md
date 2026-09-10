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

| `effect`    | entrada                                             | saída                         |
|-------------|-----------------------------------------------------|-------------------------------|
| `'grow'`    | a imagem cresce do centro                           | encolhe                       |
| `'slide'`   | a imagem desliza de um lado (`from`)                | sai pelo lado oposto          |
| `'curtain'` | um painel de tinta cobre a tela e sobe revelando    | o painel desce de volta       |
| `'pieces'`  | a imagem chega em tiras que se encaixam             | as tiras se soltam            |
| `'iris'`    | um círculo abre do centro e revela imagem e texto   | o círculo fecha               |
| `'flip'`    | a imagem entra tombada em 3D pela base e assenta    | tomba pra trás pelo topo      |

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

## Velocidade, duração e ajuste fino

Não ficam no arquivo de conteúdo. Tudo está em
**`src/scripts/creations/config.ts`**, comentado:

- `SCROLL.SCREENS_PER_CREATION` — quanto se rola por criação (o botão de
  velocidade geral);
- `SCROLL.PHASES` — quanto da criação é entrada, pausa de leitura e saída;
- `SCROLL.SCRUB` — `true` (colado no scroll) ou um número de segundos de
  inércia, ex.: `0.3`;
- `EFFECTS.*` — o ajuste de cada efeito (tamanho inicial do grow, número de
  tiras do pieces, ângulo do flip…);
- `LAYOUT.MIN_STAGE_HEIGHT` — abaixo desta altura de tela a página mostra a
  versão simples (empilhada).

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
