(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopMq = window.matchMedia('(min-width: 860px)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');

  const closeMenu = () => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    document.body.classList.remove('menu-open');
  };
  const openMenu = () => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    document.body.classList.add('menu-open');
  };
  toggle?.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });
  menu?.querySelectorAll('[data-menu-link]').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  desktopMq.addEventListener?.('change', () => {
    if (desktopMq.matches) closeMenu();
  });

  const video = document.querySelector('[data-hero-video]');
  const videoToggle = document.querySelector('[data-video-toggle]');
  const videoLabel = document.querySelector('[data-video-toggle-label]');
  const hero = document.querySelector('.hero');
  let userPaused = false;
  let usingFull = false;
  const playbackRate = 0.55;

  const applyRate = () => {
    if (video) video.playbackRate = playbackRate;
  };

  const setVideoUi = (playing) => {
    if (!videoToggle || !videoLabel) return;
    videoToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    videoToggle.hidden = playing;
    videoLabel.textContent = 'Смотреть цех';
  };
  const tryPlay = async () => {
    if (!video) return false;
    try {
      video.muted = true;
      applyRate();
      await video.play();
      applyRate();
      setVideoUi(true);
      return true;
    } catch (_err) {
      setVideoUi(false);
      return false;
    }
  };
  const pauseVideo = ({ fromUser = false } = {}) => {
    if (!video) return;
    video.pause();
    if (fromUser) userPaused = true;
    setVideoUi(false);
  };
  const loadFullIfNeeded = () => new Promise((resolve) => {
    if (!video || usingFull) return resolve();
    const fullSrc = video.getAttribute('data-full-src');
    if (!fullSrc) return resolve();
    usingFull = true;
    video.loop = false;
    const source = video.querySelector('source');
    if (source) source.src = fullSrc;
    video.src = fullSrc;
    video.load();
    video.addEventListener('loadeddata', () => resolve(), { once: true });
  });
  const canAutoplay = () => !reduceMotion.matches && !saveData;

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    applyRate();
    video.addEventListener('ratechange', () => {
      if (video.playbackRate !== playbackRate) applyRate();
    });
    if (canAutoplay()) {
      tryPlay();
      video.addEventListener('loadeddata', () => {
        if (!userPaused && canAutoplay() && video.paused) tryPlay();
      }, { once: true });
    } else {
      setVideoUi(false);
    }
    videoToggle?.addEventListener('click', async () => {
      userPaused = false;
      await loadFullIfNeeded();
      await tryPlay();
    });
    video.addEventListener('click', () => {
      if (video.paused) return;
      pauseVideo({ fromUser: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!video.paused) video.pause();
      } else if (!userPaused && canAutoplay()) {
        tryPlay();
      }
    });
    if ('IntersectionObserver' in window && hero) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            if (!video.paused) video.pause();
            return;
          }
          if (!userPaused && canAutoplay()) tryPlay();
        });
      }, { threshold: 0.15 });
      io.observe(hero);
    }
  }

  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  const submitBtn = document.querySelector('[data-form-submit]');
  const setStatus = (message, type) => {
    if (!status) return;
    status.textContent = message;
    status.classList.remove('is-error', 'is-ok');
    if (type) status.classList.add(type);
  };
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phoneInput = form.elements.phone;
    const phone = (phoneInput?.value || '').trim();
    phoneInput?.classList.toggle('is-invalid', !phone);
    if (!phone) {
      setStatus('Укажите телефон.', 'is-error');
      phoneInput?.focus();
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    setStatus('Отправляем…', null);
    try {
      const response = await fetch(form.getAttribute('action') || 'send.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: location.pathname + location.hash,
          title: document.title,
          fields: {
            name: (form.elements.name?.value || '').trim(),
            phone,
            message: (form.elements.message?.value || '').trim(),
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'send_failed');
      form.reset();
      setStatus('Заявка отправлена. Мы свяжемся с вами.', 'is-ok');
    } catch (_error) {
      setStatus('Не удалось отправить. Позвоните: +7 (495) 128-50-55', 'is-error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  const items = Array.isArray(window.__GALLERY__) ? window.__GALLERY__ : [];
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxDialog = lightbox?.querySelector('.lightbox__dialog');
  const lightboxImage = lightbox?.querySelector('[data-lightbox-image]');
  const lightboxCounter = lightbox?.querySelector('[data-lightbox-counter]');
  let currentIndex = 0;
  let lastFocus = null;

  const loadFull = (index) => {
    const item = items[index];
    if (!item || !lightboxImage) return;
    const probe = new Image();
    probe.onload = () => {
      lightboxImage.src = item.full;
      lightboxImage.alt = item.alt || '';
    };
    probe.onerror = () => {
      lightboxImage.src = item.fullJpg || item.full;
      lightboxImage.alt = item.alt || '';
    };
    probe.src = item.full;
    if (lightboxCounter) lightboxCounter.textContent = `${index + 1} / ${items.length}`;
  };
  const openLightbox = (index) => {
    if (!lightbox || !items.length) return;
    currentIndex = ((index % items.length) + items.length) % items.length;
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    loadFull(currentIndex);
    lightboxDialog?.focus();
  };
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    if (lightboxImage) {
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
    }
    lastFocus?.focus?.();
  };
  const stepLightbox = (delta) => {
    if (!items.length || lightbox?.hidden) return;
    currentIndex = (currentIndex + delta + items.length) % items.length;
    loadFull(currentIndex);
  };

  document.querySelectorAll('[data-gallery-open]').forEach((btn) => {
    btn.addEventListener('click', () => openLightbox(Number(btn.getAttribute('data-index') || '0')));
  });
  lightbox?.querySelectorAll('[data-lightbox-close]').forEach((el) => {
    el.addEventListener('click', closeLightbox);
  });
  lightbox?.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => stepLightbox(-1));
  lightbox?.querySelector('[data-lightbox-next]')?.addEventListener('click', () => stepLightbox(1));
  document.addEventListener('keydown', (event) => {
    if (lightbox?.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepLightbox(1);
    }
  });
})();
