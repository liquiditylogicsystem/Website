/* ===========================================================
   LiquidityLogicSystem — behavior v4
   - Lenis smooth scroll + ScrollTrigger integration
   - Hero intro timeline: masked line reveals, staggered lead + CTAs
     (gated on document.fonts.ready)
   - Split-line masked reveals for section headings
   - Scroll progress bar + condensing nav
   - Proof band: self-drawing equity curve + count-up stats
   - Magnetic CTAs, 3D tilt cards
   - Hero background: pure-CSS aurora + grid (no JS required)
   - Libraries are self-hosted in vendor/ (no CDN dependency)
   - prefers-reduced-motion only disables Lenis / magnetic / 3D tilt;
     core animations run for everyone (site is designed to be animated)
   =========================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The site is designed to be animated: core reveals, entrances, count-ups
  // and the aurora run for everyone. reduceMotion only disables the
  // motion-heavy extras (Lenis smooth scroll, magnetic buttons, 3D tilt).
  // ?motion=full is a compatibility hook for the preview: it forces the
  // complete experience (including the motion-heavy extras) and adds the
  // force-motion class.
  if (/\bmotion=(full|on)\b/.test(location.search)) {
    reduceMotion = false;
    document.documentElement.classList.add('force-motion');
  }
  var hasStack = !!(window.gsap && window.ScrollTrigger);

  /* ---------- hero bot terminal: live mini candlestick chart ---------- */
  var chartCanvas = document.getElementById('miniChart');
  var cctx = chartCanvas ? chartCanvas.getContext('2d') : null;
  var candles = [];
  var forming = null;
  var chartRunning = true;
  var chartLastT = 0;
  var chartDrift = 0;
  var chartTimer = 1.2;

  function miniCandle(open) {
    var dir = Math.random() < 0.5 ? -1 : 1;
    var range = 0.4 + Math.random() * 1.1;
    var close = open + dir * range;
    return {
      open: open, close: close,
      high: Math.max(open, close) + Math.random() * 0.8,
      low: Math.min(open, close) - Math.random() * 0.8
    };
  }

  function sizeMiniChart() {
    if (!chartCanvas) return;
    var w = chartCanvas.clientWidth || 300;
    var h = chartCanvas.clientHeight || 150;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    chartCanvas.width = Math.round(w * dpr);
    chartCanvas.height = Math.round(h * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initMiniChart() {
    if (!cctx) return;
    sizeMiniChart();
    window.addEventListener('resize', sizeMiniChart);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        chartRunning = entries[0].isIntersecting;
      }, { threshold: 0.01 }).observe(chartCanvas.parentElement);
    }
    var price = 100;
    for (var i = 0; i < 44; i++) {
      candles.push(miniCandle(price));
      price = candles[candles.length - 1].close;
    }
    forming = miniCandle(price);
  }

  function drawMiniFrame() {
    if (!cctx) return;
    var w = chartCanvas.clientWidth || 300;
    var h = chartCanvas.clientHeight || 150;
    cctx.clearRect(0, 0, w, h);
    // faint horizontal grid
    cctx.strokeStyle = 'rgba(236,231,220,0.06)';
    cctx.lineWidth = 1;
    for (var gi = 1; gi < 4; gi++) {
      var gy = Math.round(h * gi / 4) + 0.5;
      cctx.beginPath(); cctx.moveTo(0, gy); cctx.lineTo(w, gy); cctx.stroke();
    }
    var all = candles.concat([forming]);
    var min = Infinity, max = -Infinity, i, c;
    for (i = 0; i < all.length; i++) {
      c = all[i];
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    var range = Math.max(max - min, 0.5);
    var pad = range * 0.12;
    min -= pad; max += pad; range += pad * 2;
    var left = 8, right = w - 8;
    var step = (right - left) / all.length;
    var bodyW = Math.max(2, step * 0.6);
    function yOf(p) { return 14 + (1 - (p - min) / range) * (h - 26); }
    // candles
    for (i = 0; i < all.length; i++) {
      c = all[i];
      var up = c.close >= c.open;
      var col = up ? '#4ade80' : '#f26d6d';
      var x = Math.round(left + step * (i + 0.5)) + 0.5;
      var yT = yOf(Math.max(c.open, c.close));
      var yB = yOf(Math.min(c.open, c.close));
      var bh = Math.max(1.5, yB - yT);
      cctx.strokeStyle = col; cctx.lineWidth = 1;
      cctx.beginPath(); cctx.moveTo(x, yOf(c.high)); cctx.lineTo(x, yOf(c.low)); cctx.stroke();
      cctx.fillStyle = col;
      cctx.fillRect(x - bodyW / 2, yT, bodyW, bh);
    }
    // gold close line
    cctx.strokeStyle = 'rgba(212,164,55,0.9)';
    cctx.lineWidth = 1.5;
    cctx.beginPath();
    for (i = 0; i < all.length; i++) {
      var x2 = left + step * (i + 0.5);
      var y2 = yOf(all[i].close);
      if (i === 0) cctx.moveTo(x2, y2); else cctx.lineTo(x2, y2);
    }
    cctx.stroke();
    // last-close glow dot
    var lx = left + step * (all.length - 0.5);
    var ly = yOf(all[all.length - 1].close);
    cctx.fillStyle = 'rgba(212,164,55,0.22)';
    cctx.beginPath(); cctx.arc(lx, ly, 5, 0, Math.PI * 2); cctx.fill();
    cctx.fillStyle = '#d4a437';
    cctx.beginPath(); cctx.arc(lx, ly, 2.2, 0, Math.PI * 2); cctx.fill();
  }

  function miniLoop(now) {
    requestAnimationFrame(miniLoop);
    if (!chartRunning) return;
    if (!chartLastT) chartLastT = now;
    var dt = Math.min((now - chartLastT) / 1000, 0.05);
    chartLastT = now;
    chartTimer -= dt;
    chartDrift += (Math.random() - 0.49) * 0.015;
    // the forming candle wiggles, then closes into a real candle
    forming.close += (Math.random() - 0.5) * 0.7 + chartDrift;
    if (forming.close > forming.high) forming.high = forming.close;
    if (forming.close < forming.low) forming.low = forming.close;
    if (chartTimer <= 0) {
      chartTimer = 0.9 + Math.random() * 0.9;
      candles.push(forming);
      if (candles.length > 46) candles.shift();
      forming = miniCandle(forming.close);
      chartDrift *= 0.5;
    }
    drawMiniFrame();
  }

  // Without the animation stack, show a static page: drop the `js` class so
  // every CSS-hidden state is revealed. The libs are self-hosted, so this
  // only fires if JS itself is unavailable or fails to parse.
  if (!hasStack) {
    document.documentElement.classList.remove('js');
    if (cctx) { initMiniChart(); drawMiniFrame(); }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  function isTouch() {
    return window.matchMedia && window.matchMedia('(hover: none)').matches;
  }

  /* ---------- scroll fade in/out for .reveal elements ---------- */
  gsap.utils.toArray('.reveal').forEach(function (el, i) {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: (i % 4) * 0.06,
        scrollTrigger: {
          trigger: el,
          start: 'top 87%',
          end: 'bottom 15%',
          toggleActions: 'play reverse play reverse'
        }
      }
    );
  });

  /* ---------- split an element into masked lines at <br> boundaries ---------- */
  function splitLines(el) {
    var nodes = Array.from(el.childNodes);
    var lines = [];
    var current = [];
    nodes.forEach(function (node) {
      if (node.nodeName === 'BR') {
        lines.push(current);
        current = [];
      } else {
        current.push(node);
      }
    });
    lines.push(current);
    el.textContent = '';
    lines.forEach(function (lineNodes) {
      var line = document.createElement('span');
      line.className = 'line';
      var inner = document.createElement('span');
      inner.className = 'line-inner';
      lineNodes.forEach(function (n) { inner.appendChild(n.cloneNode(true)); });
      line.appendChild(inner);
      el.appendChild(line);
    });
  }

  /* ---------- Lenis smooth scrolling ---------- */
  var lenis = null;
  if (window.Lenis && !reduceMotion && !isTouch()) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // smooth-scroll anchor links through Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -84, duration: 1.2 });
      });
    });
  }

  /* ---------- scroll progress bar ---------- */
  var progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    gsap.to(progressBar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  }

  /* ---------- condensing nav ---------- */
  var nav = document.querySelector('header.nav');
  if (nav) {
    ScrollTrigger.create({
      start: 60,
      end: 'max',
      onUpdate: function (self) { nav.classList.toggle('scrolled', self.scroll() > 60); }
    });
  }

  /* ---------- hero intro timeline ---------- */
  var heroH1 = document.querySelector('.hero h1');
  if (heroH1) {
    splitLines(heroH1);

    var intro = gsap.timeline({ paused: true });
    var eyebrow = document.querySelector('.hero .eyebrow');
    var lead = document.querySelector('.hero p.lead');
    var actions = document.querySelector('.hero-actions');

    if (eyebrow) intro.fromTo(eyebrow, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.1);
    // lines start hidden via CSS (html.js .line-inner translateY(115%));
    // animate to y:0 (pixel) — percentage-based yPercent tweens don't
    // progress reliably in some WebKit builds, so we read the CSS state.
    heroH1.querySelectorAll('.line-inner').forEach(function (line, i) {
      intro.to(line, { y: 0, duration: 1.05, ease: 'power4.out' }, 0.3 + i * 0.16);
    });
    if (lead) intro.fromTo(lead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.85);
    if (actions) intro.fromTo(actions, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 1.0);
    var terminal = document.querySelector('.hero-terminal');
    if (terminal) intro.fromTo(terminal, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 1.1);

    // wait for fonts so the masked lines never shift; never block forever
    var started = false;
    function startIntro() {
      if (started) return;
      started = true;
      intro.play();
    }
    if (document.fonts && document.fonts.ready) {
      var failsafe = setTimeout(startIntro, 1600);
      document.fonts.ready.then(function () { clearTimeout(failsafe); startIntro(); });
    } else {
      startIntro();
    }
  }

  /* ---------- section heading line reveals ---------- */
  document.querySelectorAll('section h2').forEach(function (h2) {
    splitLines(h2);
    gsap.to(h2.querySelectorAll('.line-inner'),
      {
        y: 0,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: h2, start: 'top 90%', toggleActions: 'play none none none' }
      });
  });

  /* ---------- process section: scroll-scrubbed progress line ---------- */
  var fillEl = document.getElementById('progressFill');
  var processBody = document.querySelector('.process-body');
  if (fillEl && processBody) {
    gsap.to(fillEl, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: processBody,
        start: 'top 60%',
        end: 'bottom 60%',
        scrub: 0.4
      }
    });
  }

  /* ---------- proof band: self-drawing equity curve ---------- */
  var curveWrap = document.querySelector('.proof-chart');
  if (curveWrap) {
    // a long, slow scrub window so the line rises gradually to its peak
    var curveTl = gsap.timeline({
      scrollTrigger: { trigger: curveWrap, start: 'top 80%', end: 'top 8%', scrub: 0.6 }
    });
    var main = curveWrap.querySelector('.chart-main');
    var fill = curveWrap.querySelector('.chart-fill');
    var dot = curveWrap.querySelector('.chart-dot');
    // GSAP's CSSPlugin can't interpolate stroke-dashoffset when its start
    // value comes from a stylesheet rule (it snaps instead of drawing), so
    // seed the hidden state inline BEFORE the tween is created.
    if (main) main.style.strokeDashoffset = '1';
    // the equity line draws itself slowly, rising toward the top point
    if (main) curveTl.fromTo(main, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
    if (fill) curveTl.fromTo(fill, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'none' }, 0.05);
    // only after the line has reached its peak does the dot land and
    // "Profit+" appear
    if (dot) curveTl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, 1.0);
    var label = curveWrap.querySelector('.profit-label');
    if (label) curveTl.fromTo(label, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.18);
  }

  /* ---------- hero bot terminal: live counters + chart loop ---------- */
  initMiniChart();
  if (cctx) requestAnimationFrame(miniLoop);

  var pnlEl = document.getElementById('pnlVal');
  if (pnlEl) {
    var pnl = 1284.56;
    setInterval(function () {
      pnl += (Math.random() - 0.46) * 46;
      pnlEl.textContent = (pnl >= 0 ? '+' : '-') + '$' +
        Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      pnlEl.className = pnl >= 0 ? 'up' : 'down';
    }, 1700);
  }
  var ordersEl = document.getElementById('ordersVal');
  if (ordersEl) {
    var orders = 342;
    setInterval(function () {
      orders += 1 + Math.floor(Math.random() * 3);
      ordersEl.textContent = orders.toLocaleString('en-US');
    }, 6000);
  }

  /* ---------- metrics band count-ups ---------- */
  function fmtVal(v, d) {
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  document.querySelectorAll('.metric-num[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    el.textContent = fmtVal(0, d) + suffix;
    var st = { v: 0 };
    gsap.to(st, {
      v: target, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: function () { el.textContent = fmtVal(st.v, d) + suffix; }
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    btn.setAttribute('aria-expanded', 'false');
    var opened = false;
    function open() {
      if (opened) return; opened = true;
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      gsap.to(panel, {
        height: 'auto', duration: 0.45, ease: 'power3.inOut',
        onComplete: function () { ScrollTrigger.refresh(); }
      });
    }
    function close() {
      if (!opened) return; opened = false;
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      gsap.to(panel, {
        height: 0, duration: 0.4, ease: 'power3.inOut',
        onComplete: function () { ScrollTrigger.refresh(); }
      });
    }
    btn.addEventListener('click', function () { opened ? close() : open(); });
  });

  /* ---------- proof band: count-up stats ---------- */
  document.querySelectorAll('.stat-num[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (target === 0) { el.textContent = '0' + suffix; return; }
    el.textContent = '0' + suffix;
    var state = { v: 0 };
    gsap.to(state, {
      v: target,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: function () { el.textContent = Math.round(state.v) + suffix; }
    });
  });

  /* ---------- magnetic CTAs ---------- */
  if (!reduceMotion && !isTouch()) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        dx = Math.max(-9, Math.min(9, dx));
        dy = Math.max(-9, Math.min(9, dy));
        gsap.to(btn, { x: dx, y: dy, duration: 0.35, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  /* ---------- cursor-reactive 3D tilt on strategy cards ---------- */
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    if (reduceMotion || !window.matchMedia('(hover:hover)').matches) return;
    card.style.transition = 'transform .25s ease';
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (0.5 - py) * 10;
      var ry = (px - 0.5) * 10;
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(4px)';
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    });
  });

})();
