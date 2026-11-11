/* ==========================================================================
   Viva Plus — interactions
   ========================================================================== */
(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Current year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header state ---------- */
  const header = $("#site-header");
  const toTop = $("[data-to-top]");

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 18);
    if (toTop) toTop.classList.toggle("is-visible", y > 700);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Mobile navigation ---------- */
  const navToggle = $(".nav-toggle");
  const primaryNav = $("#primary-nav");
  const navLinks = $$(".nav-link", primaryNav || document);

  const closeNav = () => {
    if (!primaryNav || !navToggle) return;
    primaryNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menu");
    document.body.classList.remove("is-locked");
  };

  const openNav = () => {
    if (!primaryNav || !navToggle) return;
    primaryNav.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Fechar menu");
    document.body.classList.add("is-locked");
  };

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeNav() : openNav();
    });

    navLinks.forEach((link) => link.addEventListener("click", closeNav));

    document.addEventListener("click", (event) => {
      if (!primaryNav.classList.contains("is-open")) return;
      if (primaryNav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1040) closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        closeNav();
        navToggle.focus();
      }
    });
  }

  /* ---------- Scroll spy ---------- */
  const spySections = ["home", "planos", "compatibilidade", "beneficios", "faq"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let spyTick = false;

  const updateSpy = () => {
    const marker = window.scrollY + window.innerHeight * 0.38;
    let current = spySections[0];

    spySections.forEach((section) => {
      if (section.offsetTop <= marker) current = section;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = spySections[spySections.length - 1];
    }

    navLinks.forEach((link) => {
      const target = link.getAttribute("href");
      link.classList.toggle("is-active", target === `#${current.id}`);
    });
    spyTick = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (spyTick) return;
      spyTick = true;
      window.requestAnimationFrame(updateSpy);
    },
    { passive: true }
  );
  updateSpy();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal]");

  // Stagger elements that share the same parent.
  const groups = new Map();
  revealEls.forEach((el) => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach((els) => {
    els.forEach((el, index) => {
      el.style.setProperty("--reveal-delay", `${Math.min(index * 0.07, 0.36)}s`);
    });
  });

  if ("IntersectionObserver" in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Background videos ---------- */
  const heroVideo = $(".tv__video");
  const phoneVideo = $(".phone__video");

  const safePlay = (video) => {
    if (!video) return;
    const promise = video.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        /* Autoplay may be blocked; the poster remains visible. */
      });
    }
  };

  if (heroVideo) {
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      safePlay(heroVideo);

      if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                safePlay(heroVideo);
              } else {
                heroVideo.pause();
              }
            });
          },
          { threshold: 0.1 }
        );
        videoObserver.observe(heroVideo);
      }
    }
  }

  if (phoneVideo && !reduceMotion) {
    if ("IntersectionObserver" in window) {
      const phoneObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              safePlay(phoneVideo);
              phoneObserver.unobserve(phoneVideo);
            }
          });
        },
        { rootMargin: "200px" }
      );
      phoneObserver.observe(phoneVideo);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (!heroVideo || reduceMotion) return;
    if (document.hidden) {
      heroVideo.pause();
    } else {
      safePlay(heroVideo);
    }
  });

  /* ---------- Modals ---------- */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let activeModal = null;
  let lastFocused = null;

  const openModal = (modal) => {
    if (!modal) return;
    closeNav();

    $$(".modal").forEach((item) => {
      if (item !== modal && !item.hidden) item.hidden = true;
    });

    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-locked");
    activeModal = modal;

    const dialog = $(".modal__dialog", modal);
    const focusTarget = $("[data-close-modal]", dialog) || dialog;
    window.setTimeout(() => focusTarget.focus(), 40);
  };

  const closeModal = () => {
    if (!activeModal) return;
    const modal = activeModal;
    const video = $("video", modal);

    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (error) {
        /* Ignore seek errors while the media is not ready. */
      }
    }

    modal.hidden = true;
    activeModal = null;

    if (!$$(".modal").some((item) => !item.hidden)) {
      document.body.classList.remove("is-locked");
    }

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  };

  $$("[data-open-legal]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal($("#legal-modal"));
    });
  });

  $$("[data-close-modal]").forEach((trigger) => {
    trigger.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (!activeModal) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = $(".modal__dialog", activeModal);
    const focusable = $$(FOCUSABLE, dialog).filter(
      (el) => el.getClientRects().length > 0 && el.getAttribute("aria-hidden") !== "true"
    );

    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ---------- FAQ: keep only one item open ---------- */
  const faqItems = $$(".accordion__item");
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- Subtle hero pointer light ---------- */
  const stage = $(".hero__stage");
  if (stage && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const glow = $(".stage__glow", stage);
    let raf = 0;

    stage.addEventListener("pointermove", (event) => {
      if (!glow) return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        glow.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255, 110, 170, .38), rgba(139, 92, 246, .18) 35%, transparent 68%)`;
        raf = 0;
      });
    });

    stage.addEventListener("pointerleave", () => {
      if (glow) glow.style.background = "";
    });
  }
})();
