(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopMq = window.matchMedia('(min-width: 900px)');
  const wideMq = window.matchMedia('(min-width: 1024px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const pad = (n) => String(n).padStart(2, '0');

  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const progressBar = document.querySelector('[data-scroll-progress] span');

  /* Menu — outside header stacking context */
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

  /* Chrome */
  const updateChrome = () => {
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    }
    header?.classList.toggle('is-scrolled', window.scrollY > 6);
  };
  window.addEventListener('scroll', updateChrome, { passive: true });
  updateChrome();

  /* Video */
  const video = document.querySelector('[data-hero-video]');
  const videoToggle = document.querySelector('[data-video-toggle]');
  const videoLabel = document.querySelector('[data-video-toggle-label]');
  let userPaused = false;
  let usingFull = false;

  const setVideoUi = (playing) => {
    if (!videoToggle || !videoLabel) return;
    videoToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    videoLabel.textContent = playing ? 'Пауза' : 'Воспроизвести';
  };
  const tryPlay = async () => {
    if (!video) return false;
    try {
      await video.play();
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
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady);
      resolve();
    };
    video.addEventListener('loadeddata', onReady);
  });
  const canAutoplay = () => !reduceMotion.matches && !saveData;

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('playsinline', '');
    if (canAutoplay()) tryPlay();
    else setVideoUi(false);

    videoToggle?.addEventListener('click', async () => {
      if (!video.paused) {
        pauseVideo({ fromUser: true });
        return;
      }
      userPaused = false;
      await loadFullIfNeeded();
      await tryPlay();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseVideo();
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) pauseVideo();
          else if (!userPaused && canAutoplay() && !usingFull) tryPlay();
        });
      }, { threshold: 0.35 });
      io.observe(video);
    }
  }

  /* Form */
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

  /* Lightbox */
  const items = Array.isArray(window.__GALLERY__) ? window.__GALLERY__ : [];
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxDialog = lightbox?.querySelector('.lightbox__dialog');
  const lightboxImage = lightbox?.querySelector('[data-lightbox-image]');
  const lightboxCounter = lightbox?.querySelector('[data-lightbox-counter]');
  const openButtons = Array.from(document.querySelectorAll('[data-gallery-open]'));
  const galleryCounter = document.querySelector('[data-gallery-counter]');
  let currentIndex = 0;
  let lastFocus = null;
  let lastThumb = null;

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

  const getFocusables = () => {
    if (!lightbox) return [];
    return Array.from(lightbox.querySelectorAll('button')).filter((el) => !el.disabled);
  };

  const openLightbox = (index, originBtn) => {
    if (!lightbox || !items.length) return;
    currentIndex = ((index % items.length) + items.length) % items.length;
    lastFocus = document.activeElement;
    lastThumb = originBtn || openButtons[currentIndex] || null;
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    loadFull(currentIndex);

    if (hasGsap && lastThumb && !reduceMotion.matches) {
      const rect = lastThumb.getBoundingClientRect();
      gsap.fromTo(lightboxDialog, {
        x: rect.left + rect.width / 2 - window.innerWidth / 2,
        y: rect.top + rect.height / 2 - window.innerHeight / 2,
        scale: Math.max(0.2, rect.width / Math.min(900, window.innerWidth)),
        opacity: 0.4,
      }, {
        x: 0, y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out',
      });
    }
    lightboxDialog?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    const finish = () => {
      lightbox.hidden = true;
      document.body.classList.remove('lightbox-open');
      if (lightboxImage) {
        lightboxImage.removeAttribute('src');
        lightboxImage.alt = '';
      }
      (lastThumb || lastFocus)?.focus?.();
    };
    if (hasGsap && lastThumb && !reduceMotion.matches) {
      const rect = lastThumb.getBoundingClientRect();
      gsap.to(lightboxDialog, {
        x: rect.left + rect.width / 2 - window.innerWidth / 2,
        y: rect.top + rect.height / 2 - window.innerHeight / 2,
        scale: 0.35,
        opacity: 0,
        duration: 0.28,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(lightboxDialog, { clearProps: 'all' });
          finish();
        },
      });
    } else {
      finish();
    }
  };

  const stepLightbox = (delta) => {
    if (!items.length || lightbox?.hidden) return;
    currentIndex = (currentIndex + delta + items.length) % items.length;
    loadFull(currentIndex);
  };

  openButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      openLightbox(Number(btn.getAttribute('data-index') || '0'), btn);
    });
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
    } else if (event.key === 'Tab') {
      const focusables = getFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* Magnetic — weak */
  if (finePointer.matches && !reduceMotion.matches) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      const strength = 8;
      btn.addEventListener('pointermove', (event) => {
        const rect = btn.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* Titles */
  document.querySelectorAll('[data-reveal-title]').forEach((title) => {
    if (title.dataset.ready === '1') return;
    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.innerHTML = `<span class="line"><span class="line__inner">${text}</span></span>`;
    title.dataset.ready = '1';
  });

  /* Motion */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    if (reduceMotion.matches) {
      gsap.set(['[data-hero-fade]', '[data-hero-title] .line__inner', '[data-reveal-title] .line__inner'], {
        clearProps: 'all',
        autoAlpha: 1,
        y: 0,
        yPercent: 0,
      });
      const videoMask = document.querySelector('[data-video-mask]');
      if (videoMask) gsap.set(videoMask, { clipPath: 'inset(0% 0% 0% 0%)' });
      return;
    }

    const lines = gsap.utils.toArray('[data-hero-title] .line__inner');
    const fades = gsap.utils.toArray('[data-hero-fade]');
    const videoMask = document.querySelector('[data-video-mask]');

    gsap.set(lines, { yPercent: 110 });
    gsap.set(fades, { autoAlpha: 0, y: 12 });
    if (videoMask) gsap.set(videoMask, { clipPath: 'inset(10% 12% 28% 12%)' });

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (videoMask) intro.to(videoMask, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8 }, 0);
    intro.to(lines, { yPercent: 0, duration: 0.65, stagger: 0.07 }, 0.15);
    intro.to(fades, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05 }, 0.4);

    /* Soft hero exit — no pin, no overlaps */
    if (desktopMq.matches) {
      const heroCopy = document.querySelector('.hero__copy');
      const heroMedia = document.querySelector('[data-hero-media]');
      if (heroCopy && heroMedia) {
        gsap.timeline({
          scrollTrigger: {
            trigger: '[data-hero]',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
          .to(heroCopy, { y: -40, autoAlpha: 0.35, ease: 'none' }, 0)
          .to(heroMedia, { y: 24, scale: 0.96, ease: 'none' }, 0);
      }
    }

    document.querySelectorAll('[data-reveal-title]').forEach((title) => {
      const inner = title.querySelector('.line__inner');
      if (!inner) return;
      gsap.set(inner, { yPercent: 110 });
      gsap.to(inner, {
        yPercent: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: title,
          start: 'top 88%',
          once: true,
        },
      });
    });

    const aboutMask = document.querySelector('[data-about-mask]');
    const aboutImg = document.querySelector('[data-about-img]');
    if (aboutMask && aboutImg && desktopMq.matches) {
      gsap.fromTo(aboutMask, { clipPath: 'inset(0 12% 0 12%)' }, {
        clipPath: 'inset(0 0% 0 0%)',
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-about]',
          start: 'top 75%',
          end: 'top 35%',
          scrub: true,
        },
      });
    }

    openButtons.forEach((btn, index) => {
      const mask = btn.querySelector('.gallery__mask');
      if (mask) {
        gsap.fromTo(mask, { clipPath: 'inset(100% 0 0 0)' }, {
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: btn,
            start: 'top 92%',
            once: true,
          },
        });
      }
      ScrollTrigger.create({
        trigger: btn,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => {
          if (galleryCounter) galleryCounter.textContent = `${pad(index + 1)} / ${pad(items.length || 12)}`;
        },
        onEnterBack: () => {
          if (galleryCounter) galleryCounter.textContent = `${pad(index + 1)} / ${pad(items.length || 12)}`;
        },
      });
    });
  });

  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready?.then(refresh);
  window.addEventListener('load', refresh, { once: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }, { passive: true });

  desktopMq.addEventListener?.('change', () => {
    closeMenu();
    ScrollTrigger.refresh();
  });
})();
