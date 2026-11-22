// Waline owns the thread and editor inside the dialog.
if (!customElements.get('moments-wall')) {
  customElements.define('moments-wall', class extends HTMLElement {
    connectedCallback() {
      this.grid = this.querySelector('.moments-grid');
      this.dialog = this.querySelector('dialog');
      this.host = this.querySelector('.moment-waline');
      this.more = this.querySelector('.moments-more');
      this.retry = this.querySelector('.moment-retry');
      this.labels = this.dataset;
      this.formatTags = new Set(this.labels.formatTags.split(' '));
      this.cards = new Map([...this.grid.children].map(card => [card.dataset.id, card]));
      this.resize = new ResizeObserver(entries => {
        for (const {target} of entries) this.pack(target);
      });
      for (const card of this.cards.values()) {
        this.pack(card);
        this.resize.observe(card);
      }
      this.grid.dataset.packed = '';
      this.grid.addEventListener('error', event => {
        if (event.target.matches('.moment-photo')) event.target.remove();
      }, true);
      for (const img of this.grid.querySelectorAll('img')) {
        if (img.complete && !img.naturalWidth) img.remove();
      }
      this.grid.onclick = event => {
        if (event.target.closest('a[href]')) return;
        const card = event.target.closest('.moment-card');
        if (card) this.open(card);
      };
      this.closest('.moments').querySelector('.moments-write').onclick = () => this.open(null);
      this.dialog.querySelector('.moment-close').onclick = () => this.dialog.close();
      this.dialog.onclick = event => {
        const parentLink = event.target.closest('.wl-reply-to a');
        if (parentLink) {
          event.preventDefault();
          document.getElementById(parentLink.hash.slice(1))?.scrollIntoView({block: 'center'});
        }
        if (event.target !== this.dialog) return;
        const rect = this.dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
      };
      this.dialog.onclose = () => {
        // Reset Waline's reply/edit target before opening another thread.
        this.host.querySelector('.wl-reply-wrapper .wl-close, .wl-edit-wrapper .wl-close')?.click();
        this.selected = null;
      };
      this.more.onclick = this.retry.onclick = () => {
        const action = this.host.querySelector('[data-waline] > .wl-operation button');
        if (action) action.click();
        else this.load();
      };
      this.changes = new MutationObserver(() => this.sync());
      this.changes.observe(this.host, {childList: true, subtree: true, characterData: true});
      this.load();
    }

    disconnectedCallback() {
      this.changes.disconnect();
      this.resize.disconnect();
      this.waline?.destroy();
    }

    pack(card) {
      const gap = parseFloat(getComputedStyle(this.grid).columnGap);
      card.style.gridRowEnd = 'span ' + Math.ceil(card.getBoundingClientRect().height + gap);
    }

    async load() {
      this.failed = false;
      this.sync();
      try {
        const {init} = await import(this.labels.client);
        if (!this.isConnected) return;
        this.waline = init({...JSON.parse(this.labels.options), el: this.host, dark: 'html.waline-dark'});
      } catch {
        this.failed = true;
        if (this.isConnected) this.sync();
      }
    }

    open(card) {
      this.selected = card?.dataset.id;
      this.dialog.toggleAttribute('data-compose', !card);
      const preview = this.dialog.querySelector('.moment-preview');
      preview.replaceChildren();
      if (card) {
        preview.append(card.querySelector('.moment-excerpt').cloneNode(true));
        const photo = card.querySelector('.moment-photo');
        if (photo) preview.append(photo.cloneNode());
      }
      this.sync();
      this.dialog.showModal();
      this.dialog.scrollTop = 0;
    }

    sync() {
      const threads = [...this.host.querySelectorAll('.wl-cards > .wl-card-item')];
      const action = this.host.querySelector('[data-waline] > .wl-operation button');
      const empty = this.host.querySelector('[data-waline] > .wl-empty');
      const loading = !this.failed && (!this.host.firstElementChild || !!this.host.querySelector('[data-waline] > .wl-loading'));
      const failed = this.failed || (!loading && !threads.length && !!action);
      if (threads.length || empty) this.syncCards(threads);
      const selected = threads.find(thread => thread.id === this.selected);
      for (const thread of threads) thread.toggleAttribute('data-selected', thread === selected);
      this.more.hidden = !action && !this.failed;
      this.more.textContent = failed ? this.labels.error : action?.textContent || '';
      this.querySelector('.moments-footer [role=status]').textContent =
        empty ? this.labels.empty : loading && !this.cards.size ? this.labels.loading : '';
      this.dialog.querySelector('.moment-preview').hidden = !!selected || !this.selected || (!loading && !failed);
      this.dialog.querySelector('.moment-status').textContent = this.selected && !selected
        ? loading ? this.labels.loading : failed ? '' : this.labels.missing : '';
      this.retry.hidden = !failed;
    }

    syncCards(threads) {
      const ids = new Set(threads.map(thread => thread.id));
      for (const [id, card] of this.cards) {
        if (ids.has(id)) continue;
        this.resize.unobserve(card);
        card.remove();
        this.cards.delete(id);
      }
      threads.forEach((thread, index) => {
        let card = this.cards.get(thread.id);
        if (!card) {
          card = document.createElement('article');
          card.className = 'moment-card';
          card.dataset.id = thread.id;
          card.innerHTML = '<span class="moment-byline"><strong></strong><time></time></span><div class="moment-excerpt"></div><button type="button" class="moment-count" aria-haspopup="dialog"></button>';
          this.cards.set(thread.id, card);
          this.resize.observe(card);
        }
        if (this.grid.children[index] !== card) this.grid.insertBefore(card, this.grid.children[index] || null);
        const content = thread.querySelector(':scope > .wl-card > .wl-content');
        if (content && card.source !== content.innerHTML) {
          card.source = content.innerHTML;
          const copy = content.cloneNode(true);
          const images = [...copy.querySelectorAll('img')];
          const photo = images.find(img => !/emoji/i.test(img.className + img.src) && /^https?:\/\//i.test(img.src));
          for (const img of images) img.replaceWith(img === photo ? '' : img.alt);
          for (const node of copy.querySelectorAll('*')) {
            if (!this.formatTags.has(node.localName)) {
              node.replaceWith(...node.childNodes);
              continue;
            }
            const clean = document.createElement(node.localName);
            if (node.matches('ol[start]')) clean.start = node.start;
            if (node.matches('a[href]') && ['http:', 'https:', 'mailto:'].includes(node.protocol)) clean.href = node.href;
            clean.append(...node.childNodes);
            node.replaceWith(clean);
          }
          card.querySelector('.moment-excerpt').replaceChildren(...copy.childNodes);
          let thumbnail = card.querySelector('.moment-photo');
          if (photo) {
            if (!thumbnail) {
              thumbnail = new Image();
              thumbnail.className = 'moment-photo';
              thumbnail.loading = 'lazy';
              thumbnail.decoding = 'async';
              thumbnail.alt = '';
              card.querySelector('.moment-count').before(thumbnail);
            }
            if (thumbnail.src !== photo.src) thumbnail.src = photo.src;
          } else thumbnail?.remove();
        }
        card.querySelector('strong').textContent = thread.querySelector('.wl-nick').textContent;
        card.querySelector('time').textContent = thread.querySelector('.wl-time').textContent;
        card.querySelector('.moment-count').textContent = this.labels.replies + ' · ' + thread.querySelectorAll('.wl-quote .wl-card-item').length;
      });
    }
  });
}
