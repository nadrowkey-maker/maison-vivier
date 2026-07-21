/* ============================================================
   MAISON VIVIER — moteur du site
   GSAP + ScrollTrigger + Lenis · séquences d'images en canvas
   ============================================================ */

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);
  CustomEase.create('signature', '0.65,0.05,0,1');

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
  const LERP = reduced ? 1 : 0.075;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- Lenis ---------- */
  const lenis = new Lenis({
    duration: reduced ? 0 : 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // bloqué pendant le préloader

  /* ---------- navigation ancres ---------- */
  $$('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const t = $(a.getAttribute('href'));
      if (t) lenis.scrollTo(t === $('#hero') ? 0 : t, { duration: 2 });
    });
  });

  /* ---------- curseur personnalisé ---------- */
  if (!isTouch && !reduced) {
    document.body.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    const pos = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
    window.addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; });
    gsap.ticker.add(() => {
      pos.rx += (pos.x - pos.rx) * 0.22;
      pos.ry += (pos.y - pos.ry) * 0.22;
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      ring.style.transform = `translate(${pos.rx}px, ${pos.ry}px)`;
    });
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('[data-cursor="voir"]')) cursor.classList.add('is-voir');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-cursor="voir"]')) cursor.classList.remove('is-voir');
    });
  }

  /* ---------- séquences d'images ---------- */
  class Seq {
    constructor(dir, count, canvas) {
      this.dir = dir;
      this.count = count;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.imgs = new Array(count);
      this.ok = new Array(count).fill(false);
      this.current = 0;
      this.target = 0;
      this.drawn = -1;
      this.loaded = false;
    }
    src(i) {
      return `${this.dir}/f_${String(i + 1).padStart(3, '0')}.jpg`;
    }
    load(onDone, onProgress) {
      let done = 0;
      const step = () => {
        done++;
        if (onProgress) onProgress(done, this.count);
        if (done === this.count) { this.loaded = true; if (onDone) onDone(); }
      };
      for (let i = 0; i < this.count; i++) {
        const im = new Image();
        im.onload = () => { this.ok[i] = true; if (i === 0) this.draw(0, true); step(); };
        im.onerror = step;
        im.src = this.src(i);
        this.imgs[i] = im;
      }
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
      this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
      this.drawn = -1;
      this.draw(Math.round(this.current * (this.count - 1)), true);
    }
    draw(index, force) {
      let i = Math.max(0, Math.min(this.count - 1, index));
      while (i > 0 && !this.ok[i]) i--;
      if (!this.ok[i]) return;
      if (i === this.drawn && !force) return;
      const cv = this.canvas, ctx = this.ctx, im = this.imgs[i];
      const cw = cv.width, ch = cv.height;
      const iw = im.naturalWidth, ih = im.naturalHeight;
      const s = Math.max(cw / iw, ch / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      this.drawn = i;
    }
    tick() {
      this.current += (this.target - this.current) * LERP;
      if (Math.abs(this.target - this.current) < 0.0004) this.current = this.target;
      this.draw(Math.round(this.current * (this.count - 1)));
    }
  }

  const seqHero = new Seq('assets/seq-hero', 150, $('#cv-hero'));
  const seqWalk = new Seq('assets/seq-walk', 150, $('#cv-walk'));
  const seqPigment = new Seq('assets/seq-pigment', 110, $('#cv-pigment'));
  const seqLumiere = new Seq('assets/seq-lumiere', 90, $('#cv-lumiere'));
  const seqVelours = new Seq('assets/seq-velours', 90, $('#cv-velours'));
  const matterSeqs = [seqPigment, seqLumiere, seqVelours];
  [seqHero, seqWalk, ...matterSeqs].forEach((s) => s.resize());
  gsap.ticker.add(() => {
    seqHero.tick(); seqWalk.tick();
    seqPigment.tick(); seqLumiere.tick(); seqVelours.tick();
  });

  /* ---------- préloader ---------- */
  const loader = $('#loader');
  const brand = $('#loader-brand');
  const num = $('#loader-num');

  brand.innerHTML = brand.textContent
    .split('')
    .map((c) => `<span class="lt">${c === ' ' || c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');

  gsap.to('.loader-brand .lt', {
    y: 0, duration: 1.1, ease: 'signature', stagger: 0.045, delay: 0.15,
  });
  gsap.to('.loader-sub', { opacity: 1, duration: 1, ease: 'signature', delay: 0.9 });

  const counter = { v: 0 };
  let loadedPct = 0;

  gsap.ticker.add(() => {
    counter.v += (loadedPct - counter.v) * 0.12;
    num.textContent = String(Math.round(counter.v)).padStart(2, '0');
  });

  function enterSite() {
    const tl = gsap.timeline();
    tl.to(counter, { v: 100, duration: 0.4, onUpdate: () => { loadedPct = 100; } })
      .to('.loader-count', { opacity: 0, duration: 0.5, ease: 'signature' }, '+=0.25')
      .to('.loader-brand .lt', {
        y: '-115%', duration: 0.9, ease: 'signature', stagger: 0.03,
      }, '<')
      .to('.loader-sub', { opacity: 0, duration: 0.5, ease: 'signature' }, '<')
      .to(loader, {
        yPercent: -100, duration: 1.25, ease: 'signature',
        onComplete: () => { loader.style.display = 'none'; },
      }, '-=0.35')
      .to('#topbar', { opacity: 1, duration: 1.2, ease: 'signature' }, '-=0.5')
      .add(() => {
        lenis.start();
        ScrollTrigger.refresh();
        // séquences suivantes en tâche de fond, l'une après l'autre
        seqWalk.load(() => seqPigment.load(() => seqLumiere.load(() => seqVelours.load())));
      }, '-=0.9');
  }

  seqHero.load(enterSite, (done, total) => { loadedPct = Math.round((done / total) * 96); });

  /* ---------- scènes 1→4 · la grande timeline (une seule section, une seule paire de portes) ---------- */
  const T = {
    heroEnd: 0.40,     // le travelling tourne jusqu'au fondu
    walkStart: 0.40,   // la promenade s'éveille sous le fondu enchaîné
    walkEnd: 0.68,     // fin du parcours des trois pièces
  };

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      seqHero.target = clamp01(p / T.heroEnd);
      seqWalk.target = clamp01((p - T.walkStart) / (T.walkEnd - T.walkStart));
      // chaque matière est scrubée sur sa propre fenêtre (le mot en inversion
      // suit la vidéo image par image au scroll)
      seqPigment.target = clamp01((p - 0.70) / (0.805 - 0.70));
      seqLumiere.target = clamp01((p - 0.795) / (0.88 - 0.795));
      seqVelours.target = clamp01((p - 0.87) / (0.97 - 0.87));
    },
  });

  gsap.set('.m-line-3', { transformOrigin: '50% 52%' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  tl.to('.hero-hint', { opacity: 0, duration: 0.012 }, 0.008)
    .fromTo('.hero-frag-1', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.02 }, 0.024)
    .to('.hero-frag-1', { opacity: 0, y: -50, duration: 0.02 }, 0.084)
    .fromTo('.hero-frag-2', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.02 }, 0.128)
    .to('.hero-frag-2', { opacity: 0, y: -50, duration: 0.02 }, 0.192)
    // la lumière baisse, le message de bienvenue s'allume au cœur du travelling
    .fromTo('.welcome-shade', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.235)
    .fromTo('.welcome-kicker', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.022 }, 0.248)
    .fromTo('.welcome-title', { opacity: 0, y: 46, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.03 }, 0.258)
    // tenue du titre, puis fondu enchaîné doux vers la promenade
    .to('.welcome-title', { opacity: 0, y: -34, scale: 1.03, duration: 0.026 }, 0.362)
    .to('.welcome-kicker', { opacity: 0, y: -20, duration: 0.02 }, 0.362)
    .to('.welcome-shade', { opacity: 0, duration: 0.032 }, 0.372)
    .to('#cv-hero', { opacity: 0, duration: 0.05 }, 0.385)
    .to('.hero-shade', { opacity: 0, duration: 0.05 }, 0.385)
    // pièce 1 — le salon céladon (phrase en haut à gauche)
    .fromTo('.m-line-1', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.016 }, 0.449)
    .to('.m-line-1', { opacity: 0, y: -40, duration: 0.016 }, 0.489)
    // pièce 2 — la bibliothèque (phrase en bas à droite)
    .fromTo('.m-line-2', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.016 }, 0.515)
    .to('.m-line-2', { opacity: 0, y: -40, duration: 0.016 }, 0.573)
    // pièce 3 — le séjour au couchant (phrase au centre), puis on passe entre les lettres
    .fromTo('.m-line-3', { opacity: 0 }, { opacity: 1, duration: 0.016 }, 0.603)
    .to('.m-line-3', { scale: 16, duration: 0.085, ease: 'power2.in' }, 0.66)
    .to('#cv-walk', { opacity: 0, duration: 0.025 }, 0.705)
    .to('.veil', { opacity: 0, duration: 0.025 }, 0.705)   // révèle la vidéo « pigment » dessous
    .to('.m-line-3', { opacity: 0, duration: 0.012 }, 0.74)
    // les matières : chaque mot prend l'inverse exact de SA vidéo (mix-blend difference)
    // le pigment
    .fromTo('.matter-word-1', { opacity: 0, yPercent: 8 }, { opacity: 1, yPercent: 0, duration: 0.016 }, 0.745)
    .to('.matter-word-1', { opacity: 0, yPercent: -8, duration: 0.016 }, 0.80)
    // la lumière (la vidéo se substitue en fondu sous le mot suivant)
    .to('.matter-2', { opacity: 1, duration: 0.02 }, 0.795)
    .fromTo('.matter-word-2', { opacity: 0, yPercent: 8 }, { opacity: 1, yPercent: 0, duration: 0.016 }, 0.82)
    .to('.matter-word-2', { opacity: 0, yPercent: -8, duration: 0.016 }, 0.875)
    // le velours
    .to('.matter-3', { opacity: 1, duration: 0.02 }, 0.87)
    .fromTo('.matter-word-3', { opacity: 0, yPercent: 8 }, { opacity: 1, yPercent: 0, duration: 0.016 }, 0.895)
    .to('.matter-word-3', { opacity: 0, duration: 0.014 }, 0.965)
    .to({}, { duration: 0.003 }, 0.997); // tenue jusqu'à la fin exacte

  /* ---------- scène 5 · Alma (parallaxe + rideau) ---------- */
  gsap.fromTo('.alma-photo img', { yPercent: -22 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '#alma', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.alma-name', { yPercent: 22 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '#alma', start: 'top bottom', end: 'center center', scrub: true },
  });

  /* ---------- scène 8 · studio (parallaxe) ---------- */
  gsap.fromTo('.studio-photo img', { yPercent: -21 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '#studio', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* ---------- révélations éditoriales (inspirées de 21st.dev) ---------- */
  if (!reduced) {
    // images : rideau qui se lève
    $$('.alma-photo, .studio-photo').forEach((fig) => {
      fig.classList.add('img-reveal');
      gsap.to(fig, {
        clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'signature',
        scrollTrigger: { trigger: fig, start: 'top 86%', once: true },
      });
    });
    // textes : lignes masquées qui montent (SplitText)
    document.fonts.ready.then(() => {
      $$('.alma-quote, .alma-bio p, .studio-text p, .presse-line').forEach((el) => {
        const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
        gsap.from(split.lines, {
          yPercent: 118, duration: 1.15, ease: 'signature', stagger: 0.085,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });
      ScrollTrigger.refresh();
    });
  }

  /* ---------- scène 6 · projets ---------- */
  const PROJECTS = {
    perche: {
      idx: '01 — Hôtel particulier',
      title: 'Hôtel du Perche',
      meta: 'Paris IIIᵉ, Marais · 2023 · Hôtel particulier · 420 m²',
      img: 'assets/img/proj-perche.jpg',
      desc: [
        'Sous les moulures d’un hôtel du XVIIᵉ siècle, vingt-deux verts se répondent : céladon des boiseries, bronze des rideaux, émeraude profonde du grand canapé dessiné sur mesure. Les panneaux anciens ont été repeints à la brosse, en six couches, pour que la lumière du soir s’y accroche comme sur une étoffe.',
        'Le parquet en point de Hongrie a été laissé nu. Au centre, une table basse en miroir fumé recueille le lustre comme une eau sombre. On parle bas, sans le décider.',
      ],
    },
    casa: {
      idx: '02 — Restaurant',
      title: 'Casa Rosa',
      meta: 'Lisbonne · 2022 · Restaurant · 260 m²',
      img: 'assets/img/proj-casa.jpg',
      desc: [
        'Un ancien entrepôt d’azulejos devenu salle à manger rose : rose poudre des murs, rose œillet des banquettes, laiton des appliques en globe. La pierre d’origine affleure dans l’arche, brute, pour que la douceur ait un contrepoids.',
        'Les lustres en cascade viennent d’un théâtre de Porto. À la nuit tombée, toute la salle prend la couleur d’un fruit mûr — c’était la commande, mot pour mot, du propriétaire.',
      ],
    },
    suite: {
      idx: '03 — Suite d’hôtel',
      title: 'Suite 41',
      meta: 'Cap d’Antibes · 2024 · Suite d’hôtel · 85 m²',
      img: 'assets/img/proj-suite.jpg',
      desc: [
        'Face à la Méditerranée, la couleur est venue du dehors : blanc de chaux travaillé à la taloche, menuiseries bleu lagon, sol coulé couleur sable mouillé. Au couchant, la chambre entière devient rose pendant onze minutes — nous avons orienté le lit pour ces onze minutes-là.',
        'La terrasse prolonge la chambre sans seuil. Le linge est lavé à l’eau de mer une fois par saison, pour la raideur exacte d’une voile.',
      ],
    },
    appart: {
      idx: '04 — Collection privée',
      title: 'Appartement C.',
      meta: 'Paris VIIIᵉ, Haussmann · 2021 · Appartement de collectionneur · 310 m²',
      img: 'assets/img/proj-appart.jpg',
      desc: [
        'Un collectionneur, trois cents œuvres, une consigne : que les murs se taisent. Nous les avons tendus d’un damas tabac presque noir, qui absorbe la lumière au lieu de la renvoyer. Les cadres dorés flottent dessus comme des braises.',
        'Les portes en verre cathédrale filtrent le jour en ambre. C’est un appartement qui se visite à la tombée du soir, un verre à la main, dans un silence de bibliothèque.',
      ],
    },
    opale: {
      idx: '05 — Boutique',
      title: 'Maison Opale',
      meta: 'Genève · en cours · Joaillerie · 140 m²',
      img: 'assets/img/proj-opale.jpg',
      desc: [
        'Pour une maison de joaillerie familiale, un écrin en négatif : la boutique est sombre comme une poche de velours, et seules les pierres ont droit à la lumière. Présentoirs en bois brûlé, ardoise, verrières laquées noir.',
        'Au centre, une lampe en verre soufflé — une opale d’un mètre — respire lentement. Livraison prévue au printemps prochain.',
      ],
    },
  };

  const projList = $('.proj-list');
  const preview = $('.preview');
  const previewImg = $('.preview img');
  const fiche = $('#fiche');
  let ficheOpen = false;
  let currentItem = null;

  /* aperçu flottant */
  if (!isTouch && !reduced) {
    const pv = { x: innerWidth / 2, y: innerHeight / 2, tx: 0, ty: 0, on: false };
    const hidePreview = () => {
      if (!pv.on && preview.style.opacity === '0') return;
      pv.on = false;
      projList.classList.remove('is-hover');
      gsap.to(preview, { opacity: 0, duration: 0.45, ease: 'signature' });
    };
    window.addEventListener('mousemove', (e) => { pv.tx = e.clientX; pv.ty = e.clientY; });
    gsap.ticker.add(() => {
      pv.x += (pv.tx - pv.x) * 0.1;
      pv.y += (pv.ty - pv.y) * 0.1;
      if (pv.on || preview.style.opacity !== '0') {
        const w = preview.offsetWidth, h = preview.offsetHeight;
        preview.style.transform = `translate(${pv.x - w * 0.5 + 60}px, ${pv.y - h * 0.5}px)`;
        // parallaxe interne à contre-sens
        const dx = (pv.tx - pv.x) * 0.85;
        const dy = (pv.ty - pv.y) * 0.7;
        previewImg.style.transform = `translate(${-dx}px, ${-dy}px)`;
      }
      // filet impitoyable : si le point sous le curseur n'est plus un projet, on masque
      if (pv.on) {
        const el = document.elementFromPoint(pv.tx, pv.ty);
        if (!el || !el.closest('.proj-item')) hidePreview();
      }
    });
    window.addEventListener('blur', hidePreview);
    document.documentElement.addEventListener('mouseleave', hidePreview);
    $$('.proj-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        const d = PROJECTS[item.dataset.p];
        if (!d) return;
        previewImg.src = d.img;
        projList.classList.add('is-hover');
        pv.on = true;
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.7, ease: 'signature' });
        gsap.set(preview, { scale: 0.9 });
      });
      item.addEventListener('mouseleave', hidePreview);
    });
    projList.addEventListener('mouseleave', hidePreview);
    gsap.set(preview, { opacity: 0 });
  }

  /* fiche projet */
  function openFiche(key, fromRect) {
    const d = PROJECTS[key];
    if (!d || ficheOpen) return;
    ficheOpen = true;
    $('.fiche-idx').textContent = d.idx;
    $('.fiche-title').textContent = d.title;
    $('.fiche-meta').textContent = d.meta;
    $('.fiche-desc').innerHTML = d.desc.map((p) => `<p>${p}</p>`).join('');
    const mediaImg = $('.fiche-media img');
    mediaImg.src = d.img;

    lenis.stop();
    fiche.classList.add('is-open');
    fiche.setAttribute('aria-hidden', 'false');
    gsap.to(preview, { opacity: 0, duration: 0.3 });
    projList.classList.remove('is-hover');

    const media = $('.fiche-media');
    const r = fromRect || { top: innerHeight * 0.2, left: innerWidth * 0.3, right: innerWidth * 0.7, bottom: innerHeight * 0.8 };
    gsap.set(media, {
      clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`,
    });
    gsap.set(mediaImg, { scale: 1.18 });
    const tl = gsap.timeline();
    tl.to(media, { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.15, ease: 'signature' })
      .to(mediaImg, { scale: 1, duration: 1.5, ease: 'signature' }, 0)
      .fromTo('.fiche-body', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.9, ease: 'signature' }, 0.55)
      .fromTo('.fiche-close', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'signature' }, 0.8);
  }

  function closeFiche() {
    if (!ficheOpen) return;
    ficheOpen = false;
    const tl = gsap.timeline({
      onComplete: () => {
        fiche.classList.remove('is-open');
        fiche.setAttribute('aria-hidden', 'true');
        lenis.start();
      },
    });
    tl.to(fiche, { opacity: 0, duration: 0.6, ease: 'signature' })
      .add(() => { gsap.set(fiche, { opacity: 1 }); });
  }

  $$('.proj-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      currentItem = item;
      let rect = null;
      if (!isTouch && !reduced && preview.style.opacity !== '0') {
        rect = preview.getBoundingClientRect();
      } else {
        rect = item.getBoundingClientRect();
      }
      openFiche(item.dataset.p, rect);
    });
  });
  $('.fiche-close').addEventListener('click', closeFiche);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFiche(); });

  /* ---------- scène 7 · matières (défilement horizontal) ---------- */
  const matSection = $('#matieres');
  const matTrack = $('.mat-track');

  function matDistance() {
    return Math.max(0, matTrack.scrollWidth - innerWidth + innerWidth * 0.06);
  }
  function sizeMat() {
    matSection.style.height = `${Math.round(innerHeight + matDistance())}px`;
  }
  sizeMat();

  gsap.to(matTrack, {
    x: () => -matDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#matieres', start: 'top top', end: 'bottom bottom',
      scrub: 0.6, invalidateOnRefresh: true,
    },
  });
  $$('.mat-item img').forEach((im, i) => {
    gsap.set(im, { scale: 1.26 });
    gsap.fromTo(im, { xPercent: i % 2 ? -10 : 10 }, {
      xPercent: i % 2 ? 10 : -10, ease: 'none',
      scrollTrigger: { trigger: '#matieres', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    });
  });

  /* ---------- scène 9 · rideau final ---------- */
  gsap.fromTo('.footer-inner', { yPercent: -12 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: {
      trigger: '#rideau-spacer', start: 'top bottom', end: 'bottom bottom', scrub: true,
    },
  });

  /* ---------- redimensionnement ---------- */
  let rsTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => {
      seqHero.resize();
      seqWalk.resize();
      matterSeqs.forEach((s) => s.resize());
      sizeMat();
      ScrollTrigger.refresh();
    }, 200);
  });
})();
