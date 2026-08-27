// src/scripts/workGallery.ts — ampliação das fotos editoriais da /work.
//
// O mosaico continua fazendo parte da linha da experiência; o dialog nativo
// só assume a tela quando alguém pede para ver uma foto. Assim foco, Escape e
// isolamento do resto da página vêm do próprio navegador, enquanto este módulo
// cuida apenas da imagem ativa e da navegação dentro do mosaico que a abriu.

export function initWorkGallery() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-work-lightbox]');
  const image = dialog?.querySelector<HTMLImageElement>('[data-work-lightbox-image]');
  const counter = dialog?.querySelector<HTMLElement>('[data-work-lightbox-counter]');
  const close = dialog?.querySelector<HTMLButtonElement>('[data-work-lightbox-close]');
  const previous = dialog?.querySelector<HTMLButtonElement>('[data-work-lightbox-prev]');
  const next = dialog?.querySelector<HTMLButtonElement>('[data-work-lightbox-next]');
  const galleries = [...document.querySelectorAll<HTMLElement>('[data-work-gallery]')];

  if (!dialog || !image || !counter || !close || !previous || !next || !galleries.length) {
    return;
  }

  let triggers: HTMLButtonElement[] = [];
  let current = 0;

  const select = (index: number) => {
    current = (index + triggers.length) % triggers.length;
    const source = triggers[current].querySelector<HTMLImageElement>('img');
    if (!source) return;

    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    counter.textContent = `${current + 1} / ${triggers.length}`;
  };

  const open = (group: HTMLButtonElement[], index: number) => {
    triggers = group;
    select(index);
    dialog.showModal();
    document.body.classList.add('has-work-lightbox');
  };

  galleries.forEach((gallery) => {
    const group = [...gallery.querySelectorAll<HTMLButtonElement>('[data-work-photo]')];
    group.forEach((trigger, index) => {
      trigger.addEventListener('click', () => open(group, index));
    });
  });

  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => select(current - 1));
  next.addEventListener('click', () => select(current + 1));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(current + 1);
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-work-lightbox');
    triggers[current]?.focus();
  });
}
