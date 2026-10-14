(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var body = document.body;
  var root = document.documentElement;

  // split headline into words for staggered reveal; data-accent-last marks the last word in rust
  document.querySelectorAll('.split').forEach(function (el) {
    var text = el.textContent.trim();
    var words = text.split(/\s+/);
    var accent = el.hasAttribute('data-accent-last');
    el.setAttribute('aria-label', text);
    el.innerHTML = words.map(function (w, i) {
      var cls = accent && i === words.length - 1 ? ' class="acc"' : '';
      return '<span class="w" aria-hidden="true"><span' + cls + ' style="--i:' + i + '">' + w + '</span></span>';
    }).join(' ');
    requestAnimationFrame(function () { setTimeout(function () { el.classList.add('in'); }, reduce ? 0 : 60); });
  });

  window.addEventListener('load', function () { body.classList.add('loaded'); });
  setTimeout(function () { body.classList.add('loaded'); }, 900);

  // reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // counters
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || '', start = null;
    if (reduce) { el.textContent = target + suffix; return; }
    function step(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / 1600);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 500);
  });

  // nav state + mobile menu
  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');
  function closeMenu() { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); }
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && links.classList.contains('open')) { closeMenu(); burger.focus(); } });

  // warm lamp light follows the pointer (fine pointers; hidden by CSS otherwise)
  window.addEventListener('pointermove', function (e) {
    root.style.setProperty('--mx', e.clientX + 'px');
    root.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });

  if (reduce) return;

  if (fine) {
    body.classList.add('has-cursor');
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t.closest) return;
      ring.classList.toggle('hover', !!t.closest('a, button, [data-hover]'));
      var dark = !!t.closest('.on-dark, .cta-band');
      ring.classList.toggle('on-dark', dark);
      dot.classList.toggle('on-dark', dark);
    });
    document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });

    // magnetic buttons drive the individual translate property, so CSS keeps transform for hover and press
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.translate = (x * 0.18).toFixed(1) + 'px ' + (y * 0.26).toFixed(1) + 'px';
      });
      el.addEventListener('mouseleave', function () { el.style.translate = ''; });
    });

    // signs swing slightly from their top edge
    document.querySelectorAll('.tilt').forEach(function (el) {
      var max = +el.dataset.tilt || 1;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        el.style.rotate = (px * -2 * max).toFixed(2) + 'deg';
      });
      el.addEventListener('mouseleave', function () { el.style.rotate = ''; });
    });

    // hero visual drifts gently with the cursor
    var hv = document.getElementById('heroVisual');
    if (hv) {
      hv.style.transition = 'translate .8s cubic-bezier(.2,.7,.2,1)';
      window.addEventListener('mousemove', function (e) {
        var x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
        hv.style.translate = (x * -10).toFixed(1) + 'px ' + (y * -8).toFixed(1) + 'px';
      });
    }
  } else {
    // touch: gentle parallax on scroll for the hero ticket
    var dossier = document.querySelector('.dossier');
    if (dossier) {
      window.addEventListener('scroll', function () {
        var y = Math.min(window.scrollY, 600);
        dossier.style.translate = '0 ' + (y * -0.04).toFixed(1) + 'px';
      }, { passive: true });
    }
  }
})();
