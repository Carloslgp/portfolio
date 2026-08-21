# Fora do mural

O glob do `photos.astro` é NÃO-RECURSIVO (`../assets/photos/*.{jpg,jpeg,png,webp,avif,…}`),
então o que está nesta subpasta não entra no build nem vira URL pública. Nada aqui
foi apagado — é só um canto pra foto que não deve ser publicada como está.

## `neofetch-usuario-e-sistema.webp`

Screenshot do notebook com o `neofetch` aberto. O problema não é metadado do
arquivo (esse já veio limpo): está **gravado nos pixels**, legível a olho nu, e
por isso renomear ou tirar EXIF não resolve nada.

O que aparece na tela, três vezes (título da janela, prompt e cabeçalho do
neofetch): `carlos-leonardo@fedora`. E mais: `LENOVO 20L6S3U200`, `Fedora Linux 42`,
kernel `6.15.9-201.fc42.x86_64`, GNOME 48.4, bash 5.2.37, contagem de pacotes,
CPU/GPU/RAM e a data/hora do print.

O nome de usuário é o nome real, e distro + kernel + versões exatos são um
retrato do sistema — o tipo de coisa que se procura quando se quer saber quais
CVEs valem contra uma máquina. Numa página pessoal isso não compensa.

Pra voltar ao mural, uma das duas: borrar a janela do terminal (mas o terminal é
o assunto da foto), ou tirar um print novo com `neofetch --disable os host kernel`
e um usuário genérico.

## `duplicata-de-anjo-jpg.webp`

É a MESMA imagem de `../anjo.jpg` — 3951×2252 nas duas, dHash idêntico. E a
`anjo.jpg` não é uma foto qualquer: é a foto da EMENDA com a home
(`SEAM_PHOTO` em `src/data/gallery.ts`), com o giro de 90° gravado nos pixels.
Publicar as duas poria a mesma imagem duas vezes no mural.
