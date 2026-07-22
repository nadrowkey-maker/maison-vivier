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
      const href = a.getAttribute('href');
      if (href === '#hero' || href === '#intro') { lenis.scrollTo(0, { duration: 2 }); return; }
      // le footer est en position:fixed → on file tout en bas pour le révéler
      if (href === '#footer') {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        lenis.scrollTo(max, { duration: 2.4 });
        return;
      }
      const t = $(href);
      if (t) lenis.scrollTo(t, { duration: 2 });
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
  [seqHero, seqWalk].forEach((s) => s.resize());
  gsap.ticker.add(() => {
    seqHero.tick(); seqWalk.tick();
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
        // séquence suivante en tâche de fond
        seqWalk.load();
      }, '-=0.9');
  }

  seqHero.load(enterSite, (done, total) => { loadedPct = Math.round((done / total) * 96); });

  /* ---------- scènes 1→4 · la grande timeline (une seule section, une seule paire de portes) ---------- */
  const T = {
    heroEnd: 0.526,    // le travelling tourne jusqu'au fondu
    walkStart: 0.526,  // la promenade s'éveille sous le fondu enchaîné
    walkEnd: 0.895,    // fin du parcours des trois pièces
  };

  // morph liquide « Entrez » → « dans la couleur »
  const gooey1 = $('.gooey-1');
  const gooey2 = $('.gooey-2');
  function setGooey(f) {
    f = clamp01(f);
    const b2 = Math.min(8 / Math.max(f, 1e-3) - 8, 100);
    gooey2.style.filter = `blur(${b2}px)`;
    gooey2.style.opacity = Math.pow(f, 0.4);
    const inv = 1 - f;
    const b1 = Math.min(8 / Math.max(inv, 1e-3) - 8, 100);
    gooey1.style.filter = `blur(${b1}px)`;
    gooey1.style.opacity = Math.pow(inv, 0.4);
  }
  setGooey(0);

  const GOOEY_A = 0.816, GOOEY_B = 0.875;

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      seqHero.target = clamp01(p / T.heroEnd);
      seqWalk.target = clamp01((p - T.walkStart) / (T.walkEnd - T.walkStart));
      // le morph du titre suit le scroll
      setGooey((p - GOOEY_A) / (GOOEY_B - GOOEY_A));
    },
  });

  // ---------- scène 0 bis · l'intro : descente + fondu au noir ----------
  const introVideo = $('#intro-video');
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#intro', start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onLeave: () => { if (introVideo) introVideo.pause(); },
      onEnterBack: () => { if (introVideo) { const pr = introVideo.play(); if (pr) pr.catch(() => {}); } },
    },
  })
    .to('.intro-cta', { opacity: 0, duration: 0.09 }, 0.03)
    .fromTo('#intro-video', { yPercent: 0 }, { yPercent: 9, duration: 1 }, 0)
    .fromTo('.intro-black', { opacity: 0 }, { opacity: 1, duration: 0.42 }, 0.48);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  tl.fromTo('.hero-black', { opacity: 1 }, { opacity: 0, duration: 0.04 }, 0)   // le hall émerge du noir laissé par l'intro
    .fromTo('.hero-frag-1', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.026 }, 0.037)
    .to('.hero-frag-1', { opacity: 0, y: -50, duration: 0.026 }, 0.111)
    .fromTo('.hero-frag-2', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.026 }, 0.168)
    .to('.hero-frag-2', { opacity: 0, y: -50, duration: 0.026 }, 0.253)
    // la lumière baisse, le message de bienvenue s'allume au cœur du travelling
    .fromTo('.welcome-shade', { opacity: 0 }, { opacity: 1, duration: 0.039 }, 0.309)
    .fromTo('.welcome-kicker', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.029 }, 0.326)
    .fromTo('.welcome-title', { opacity: 0, y: 46, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.039 }, 0.339)
    // tenue du titre, puis fondu enchaîné doux vers la promenade
    .to('.welcome-title', { opacity: 0, y: -34, scale: 1.03, duration: 0.034 }, 0.476)
    .to('.welcome-kicker', { opacity: 0, y: -20, duration: 0.026 }, 0.476)
    .to('.welcome-shade', { opacity: 0, duration: 0.042 }, 0.489)
    .to('#cv-hero', { opacity: 0, duration: 0.066 }, 0.507)
    .to('.hero-shade', { opacity: 0, duration: 0.066 }, 0.507)
    // pièce 1 — le salon céladon (phrase en haut à gauche)
    .fromTo('.m-line-1', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.021 }, 0.591)
    .to('.m-line-1', { opacity: 0, y: -40, duration: 0.021 }, 0.643)
    // pièce 2 — la bibliothèque (phrase en bas à droite)
    .fromTo('.m-line-2', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.021 }, 0.678)
    .to('.m-line-2', { opacity: 0, y: -40, duration: 0.021 }, 0.754)
    // pièce 3 — le séjour au couchant : « Entrez » se liquéfie en « dans la couleur »,
    // puis reste à l'écran jusqu'à la fin du travelling (fondu enchaîné direct vers Alma)
    // (le morph gooey est piloté par setGooey dans le ScrollTrigger ci-dessus)
    .fromTo('.m-line-3', { opacity: 0 }, { opacity: 1, duration: 0.021 }, 0.77)
    .to('.m-line-3', { opacity: 0, duration: 0.03 }, 0.94)
    .to({}, { duration: 0.02 }, 0.98); // tenue jusqu'à la fin exacte

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

  /* ---------- scène 6 bis · galerie : parallaxe souris (tilt) + respiration ---------- */
  {
    const galItems = $$('.gal-item').map((el) => ({
      el, img: $('img', el),
      depth: parseFloat(el.dataset.depth) || 0.12,
      tx: 0, ty: 0, phase: Math.random() * Math.PI * 2,
    }));
    if (galItems.length) {
      let gmx = innerWidth / 2, gmy = innerHeight / 2;
      if (!isTouch && !reduced) {
        window.addEventListener('mousemove', (e) => { gmx = e.clientX; gmy = e.clientY; });
      }
      gsap.ticker.add(() => {
        const t = performance.now() / 1000;
        for (const g of galItems) {
          const r = g.el.getBoundingClientRect();
          if (r.bottom < -240 || r.top > innerHeight + 240) continue;
          let targetX = 0, targetY = 0;
          if (!isTouch && !reduced) {
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            let nx = (gmx - cx) / (r.width / 2), ny = (gmy - cy) / (r.height / 2);
            nx = Math.max(-1.3, Math.min(1.3, nx)); ny = Math.max(-1.3, Math.min(1.3, ny));
            targetX = nx * g.depth * 46;   // % (gros effet, dans la marge de 12 %)
            targetY = ny * g.depth * 34;
          }
          g.tx += (targetX - g.tx) * 0.07;
          g.ty += (targetY - g.ty) * 0.07;
          const breatheY = reduced ? 0 : Math.sin(t * 0.5 + g.phase) * 1.1;
          const breatheS = 1.04 + (reduced ? 0 : Math.sin(t * 0.5 + g.phase) * 0.03);
          g.img.style.transform = `translate3d(${g.tx}%, ${g.ty + breatheY}%, 0) scale(${breatheS})`;
        }
      });
    }
  }

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

  /* aperçu flottant — état 100 % piloté par ce qui est RÉELLEMENT sous le
     curseur (elementFromPoint), à chaque frame : aucun état « collé » possible */
  if (!isTouch && !reduced) {
    const pv = { x: innerWidth / 2, y: innerHeight / 2, tx: -1, ty: -1, on: false };
    let curKey = null;
    window.addEventListener('mousemove', (e) => { pv.tx = e.clientX; pv.ty = e.clientY; });
    gsap.set(preview, { opacity: 0 });

    gsap.ticker.add(() => {
      pv.x += (pv.tx - pv.x) * 0.1;
      pv.y += (pv.ty - pv.y) * 0.1;

      // quel projet est sous le curseur, ici et maintenant ?
      let key = null;
      if (!ficheOpen && pv.tx >= 0) {
        const el = document.elementFromPoint(pv.tx, pv.ty);
        const item = el && el.closest ? el.closest('.proj-item') : null;
        if (item && PROJECTS[item.dataset.p]) key = item.dataset.p;
      }

      if (key !== curKey) {
        curKey = key;
        gsap.killTweensOf(preview);
        if (key) {
          previewImg.src = PROJECTS[key].img;
          projList.classList.add('is-hover');
          pv.on = true;
          gsap.fromTo(preview, { scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.65, ease: 'signature' });
        } else {
          projList.classList.remove('is-hover');
          pv.on = false;
          gsap.to(preview, { opacity: 0, duration: 0.4, ease: 'signature' });
        }
      }

      if (pv.on || preview.style.opacity !== '0') {
        const w = preview.offsetWidth, h = preview.offsetHeight;
        preview.style.transform = `translate(${pv.x - w * 0.5 + 60}px, ${pv.y - h * 0.5}px)`;
        const dx = (pv.tx - pv.x) * 0.85;
        const dy = (pv.ty - pv.y) * 0.7;
        previewImg.style.transform = `translate(${-dx}px, ${-dy}px)`;
      }
    });
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

  /* ---------- traînée de souris « halftone » sur le footer ---------- */
  if (!reduced && !isTouch && window.HalftoneTrail) {
    const ft = $('.footer-trail');
    if (ft) window.HalftoneTrail.init(ft, {
      color: '#EBD9B4', cellSize: 10, opacity: 0.9, hoverOpacity: 0.28,
      brushSize: 0.05, hoverBrushSize: 0.014, hoverSelector: '#footer a',
    });
  }

  /* ---------- redimensionnement ---------- */
  let rsTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => {
      seqHero.resize();
      seqWalk.resize();
      sizeMat();
      ScrollTrigger.refresh();
    }, 200);
  });
})();