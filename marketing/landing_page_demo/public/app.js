(() => {
  const CONFIG = {
    extensionUrl: '#',
    turnstileSiteKey: '', // Add your Cloudflare Turnstile site key to enable the widget.
  };

  document.querySelectorAll('[data-install-link]').forEach((link) => {
    link.setAttribute('href', CONFIG.extensionUrl || '#');
    if (!CONFIG.extensionUrl || CONFIG.extensionUrl === '#') {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        document.querySelector('#feedback')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });

  document.querySelector('[data-year]').textContent = new Date().getFullYear();

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const menuButton = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-nav]');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('is-open', !open);
  });
  nav?.querySelectorAll('a').forEach((item) => item.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }));

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;
  document.querySelectorAll('.reveal').forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-visible');
  });

  const dialog = document.querySelector('[data-demo-dialog]');
  document.querySelector('[data-open-demo]')?.addEventListener('click', () => dialog?.showModal());
  document.querySelector('[data-close-demo]')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  let turnstileWidgetId = null;
  const turnstileSlot = document.querySelector('[data-turnstile-slot]');
  if (CONFIG.turnstileSiteKey && turnstileSlot) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      turnstileWidgetId = window.turnstile.render(turnstileSlot, {
        sitekey: CONFIG.turnstileSiteKey,
        theme: 'light',
        size: 'flexible',
      });
    };
    document.head.appendChild(script);
  }

  const form = document.querySelector('[data-feedback-form]');
  const status = document.querySelector('[data-form-status]');
  const submitButton = form?.querySelector('button[type="submit"]');
  if (form) {
    form.elements.pageUrl.value = window.location.href;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      if (!form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('website')) return;

      const payload = {
        type: data.get('type'),
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        message: String(data.get('message') || '').trim(),
        pageUrl: String(data.get('pageUrl') || ''),
        turnstileToken: String(data.get('cf-turnstile-response') || ''),
      };

      submitButton.disabled = true;
      submitButton.querySelector('span').textContent = 'Sending…';

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to send feedback right now.');

        form.reset();
        form.querySelector('input[value="feature"]').checked = true;
        status.textContent = 'Thanks — your feedback has been received.';
        if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
      } catch (error) {
        status.classList.add('is-error');
        status.textContent = error.message || 'Something went wrong. Please try again.';
      } finally {
        submitButton.disabled = false;
        submitButton.querySelector('span').textContent = 'Send feedback';
      }
    });
  }
})();
