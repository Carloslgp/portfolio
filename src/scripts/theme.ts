// src/scripts/theme.ts — o tema claro/escuro. Só DOM: liga o botão, persiste a
// escolha e avisa o resto da página com 'theme:change' — é assim que a cena 3D
// (Backdrop.ts) fica sabendo, já que ela não lê CSS.
//
// O estado mora num lugar só: html[data-theme]. O CSS deriva tudo dele (as
// variáveis em global.css), e o script inline do Layout.astro o aplica antes do
// primeiro paint — aqui a gente só o alterna.

export function isDark(): boolean {
  return document.documentElement.dataset.theme === 'dark';
}

export function initTheme() {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!btn) return;

  const reflect = () => {
    const dark = isDark();
    btn.setAttribute('aria-pressed', String(dark));
  };

  btn.addEventListener('click', () => {
    const next = !isDark();
    if (next) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;

    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (e) {}

    reflect();
    window.dispatchEvent(new CustomEvent('theme:change', { detail: { dark: next } }));
  });

  reflect();
}
