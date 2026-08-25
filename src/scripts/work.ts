export function initWork() {
  const dialogs = document.querySelectorAll<HTMLDialogElement>('[data-work-dialog]');
  let opener: HTMLElement | null = null;

  const unlockPage = () => {
    document.body.classList.remove('has-work-dialog');
    opener?.focus();
    opener = null;
  };

  document.querySelectorAll<HTMLElement>('[data-dialog-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialogId = button.dataset.dialogOpen;
      if (!dialogId) return;

      const dialog = document.getElementById(dialogId);
      if (!(dialog instanceof HTMLDialogElement)) return;

      opener = button;
      document.body.classList.add('has-work-dialog');
      dialog.showModal();
    });
  });

  dialogs.forEach((dialog) => {
    dialog.querySelector<HTMLElement>('[data-dialog-close]')?.addEventListener('click', () => {
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      const bounds = dialog.getBoundingClientRect();
      const clickedOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedOutside) dialog.close();
    });

    dialog.addEventListener('close', unlockPage);
    dialog.addEventListener('cancel', () => {
      document.body.classList.remove('has-work-dialog');
    });
  });

  window.addEventListener('pagehide', () => {
    dialogs.forEach((dialog) => {
      if (dialog.open) dialog.close();
    });
  }, { once: true });
}
