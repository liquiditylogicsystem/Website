/* ===========================================================
   LiquidityLogicSystem — behavior v2
   - WebGL hero (three.js): rotating wireframe core + liquidity particles
   - GSAP + ScrollTrigger: choreographed fade in/out, scrubbed progress line
   - Cursor-reactive 3D tilt on strategy cards
   - Dark/light theme toggle
   =========================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme toggle ---------- */
  var toggleBtn = document.getElementById('themeToggle');
  function setTheme(isLight) {
    document.body.classList.toggle('light', isLight);
    if (toggleBtn) {
      toggleBtn.textContent = isLight ? '🌙' : '☀️';
      toggleBtn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    }
  }
  setTheme(false); // dark by default
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      setTheme(!document.body.classList.contains('light'));
    });
  }

  /* ---------- GSAP scroll choreography ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

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

    // scrubbed vertical progress line through the process section
    var fill = document.getElementById('progressFill');
    var body = document.querySelector('.process-body');
    if (fill && body) {
      gsap.to(fill, {
        height: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: body,
          start: 'top 60%',
          end: 'bottom 60%',
          scrub: 0.4
        }
      });
    }
  } else {
    // fallback: just show everything if the CDN scripts failed to load
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

  /* ---------- cursor-reactive 3D tilt on strategy cards ---------- */
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    if (reduceMotion || !matchMedia('(hover:hover)').matches) return;
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

  /* ---------- WebGL hero scene (three.js) ---------- */
  var canvas = document.getElementById('heroCanvas');
  var heroSection = document.querySelector('.hero');
  if (!canvas || !window.THREE || !heroSection) return;

  var renderer, scene, camera, core, particles, running = true;
  var mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;

  function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(55, heroSection.clientWidth / heroSection.clientHeight, 0.1, 100);
    camera.position.set(1.4, 0.2, 6);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);

    // wireframe core — the "automation engine"
    var coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
    var coreMat = new THREE.MeshBasicMaterial({ color: 0xf5b700, wireframe: true, transparent: true, opacity: 0.55 });
    core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(1.6, 0, 0);
    scene.add(core);

    var innerGeo = new THREE.IcosahedronGeometry(1.1, 1);
    var innerMat = new THREE.MeshBasicMaterial({ color: 0x35e6b0, wireframe: true, transparent: true, opacity: 0.35 });
    var innerCore = new THREE.Mesh(innerGeo, innerMat);
    innerCore.position.copy(core.position);
    scene.add(innerCore);
    core.userData.inner = innerCore;

    // orbiting liquidity particles
    var count = window.innerWidth < 700 ? 500 : 1100;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var goldColor = new THREE.Color(0xf5b700);
    var tealColor = new THREE.Color(0x35e6b0);

    for (var i = 0; i < count; i++) {
      var radius = 2.4 + Math.random() * 2.6;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(Math.random() * 2 - 1);
      var x = radius * Math.sin(phi) * Math.cos(theta) + core.position.x;
      var y = radius * Math.sin(phi) * Math.sin(theta);
      var z = radius * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      var c = Math.random() > 0.5 ? goldColor : tealColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    var particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var particleMat = new THREE.PointsMaterial({
      size: 0.028, vertexColors: true, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    heroSection.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
      }, { threshold: 0.01 });
      io.observe(heroSection);
    }

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }
  }

  function onMouseMove(e) {
    var r = heroSection.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5;
    mouseY = (e.clientY - r.top) / r.height - 0.5;
  }

  function onResize() {
    if (!renderer || !camera) return;
    camera.aspect = heroSection.clientWidth / heroSection.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;

    core.rotation.y += 0.0022;
    core.rotation.x += 0.0009;
    if (core.userData.inner) {
      core.userData.inner.rotation.y -= 0.0032;
      core.userData.inner.rotation.x -= 0.0014;
    }
    particles.rotation.y += 0.0007;

    targetRotY += (mouseX * 0.4 - targetRotY) * 0.04;
    targetRotX += (mouseY * 0.25 - targetRotX) * 0.04;
    camera.position.x = 1.4 + targetRotY;
    camera.position.y = 0.2 - targetRotX;
    camera.lookAt(core.position);

    renderer.render(scene, camera);
  }

  init();
})();
