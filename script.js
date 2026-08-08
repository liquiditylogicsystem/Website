/* ===========================================================
   LiquidityLogicSystem — behavior
   - dark/light theme toggle (smooth, CSS-driven transition)
   - scroll fade in/out (IntersectionObserver, GPU-only props)
   - ambient floating candle background
   =========================================================== */

(function () {
  'use strict';

  /* ---------- theme toggle ---------- */
  var toggleBtn = document.getElementById('themeToggle');

  function setTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    if (toggleBtn) {
      toggleBtn.textContent = isDark ? '☀️' : '🌙';
      toggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  // default to light mode; respect the visitor's OS preference on first load
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(!!prefersDark);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      setTheme(!document.body.classList.contains('dark'));
    });
  }

  /* ---------- scroll reveal (fade in AND out, GPU-accelerated) ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // toggling (not just adding) means elements fade back out
          // as they leave the viewport and back in as they return —
          // keeps the whole page animating as you scroll.
          entry.target.classList.toggle('in-view', entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // no IntersectionObserver support — just show everything
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------- ambient floating candles ---------- */
  var field = document.getElementById('candleField');
  if (field) {
    var kinds = ['up', 'down', 'gold'];
    var count = window.innerWidth < 700 ? 16 : 30;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      var kind = kinds[Math.floor(Math.random() * kinds.length)];
      el.className = 'candle' + (kind === 'gold' ? '' : ' ' + kind);
      var h = 18 + Math.random() * 60;
      el.style.height = h + 'px';
      el.style.left = (Math.random() * 100) + '%';
      el.style.top = (Math.random() * 100) + '%';
      el.style.animationDuration = (8 + Math.random() * 8) + 's';
      el.style.animationDelay = (Math.random() * 6) + 's';
      frag.appendChild(el);
    }
    field.appendChild(frag);
  }
})();
