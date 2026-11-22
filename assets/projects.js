if (!customElements.get('project-gallery')) {
  customElements.define('project-gallery', class extends HTMLElement {
    connectedCallback() {
      this.onclick = event => {
        const dialog = event.target.closest('dialog');
        if (dialog) {
          if (event.target === dialog) {
            const {left, top, right, bottom} = dialog.getBoundingClientRect();
            const {clientX, clientY} = event;
            if (clientX < left || clientX > right || clientY < top || clientY > bottom) dialog.close();
          }
          return;
        }
        if (event.target.closest('a, button:not(.project-open), input, summary')) return;
        const trigger = event.target.closest('.project-card')?.querySelector('.project-open');
        if (!trigger) return;
        trigger.focus({preventScroll: true});
        document.getElementById(trigger.getAttribute('aria-controls')).showModal();
      };
    }
  });
}
