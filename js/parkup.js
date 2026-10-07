/* Park Up landing page behaviour. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Review switch: intro V02 / V03 ---------- */
  function setIntro(v) {
    root.setAttribute('data-intro', v);
    try { localStorage.setItem('parkup-intro', v); } catch (e) {}
    var url = new URL(location.href);
    url.searchParams.set('intro', v);
    history.replaceState(null, '', url);
    document.querySelectorAll('[data-intro-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-intro-set') === v));
    });
    // Replay the hero entrance so each layout can be judged on its own motion.
    document.querySelectorAll('.hero [data-reveal]').forEach(function (el) { el.classList.remove('is-in'); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('.hero [data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
        pending = pending.filter(function (el) { return !el.closest('.hero'); });
        updateParallax();
      });
    });
  }
  document.querySelectorAll('[data-intro-set]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-intro-set') === root.getAttribute('data-intro')));
    b.addEventListener('click', function () { setIntro(b.getAttribute('data-intro-set')); });
  });

  /* ---------- Reveal on scroll ----------
     A plain position check. IntersectionObserver reports nothing for elements whose
     clip-path collapses them to zero area, which is exactly the hidden state here. */
  var pending = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var revealing = false;
  function checkReveals() {
    if (!revealing) return;
    var line = window.innerHeight * 0.88;
    pending = pending.filter(function (el) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return true; // hidden variant
      var r = el.getBoundingClientRect();
      if (r.top < line && r.bottom > 0) { el.classList.add('is-in'); return false; }
      return true;
    });
  }
  function startReveals() {
    revealing = true;
    // The intro plays on load in full, including the partner row at the very bottom of the fold.
    pending = pending.filter(function (el) {
      if (el.closest('.hero')) { el.classList.add('is-in'); return false; }
      return true;
    });
    if (reduceMotion) {
      pending.forEach(function (el) { el.classList.add('is-in'); });
      pending = [];
      return;
    }
    checkReveals();
  }
  // Wait for the webfonts so headings do not reveal in a fallback face.
  var started = false;
  function go() { if (!started) { started = true; startReveals(); } }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); }
  setTimeout(go, 1200);

  /* ---------- Parallax inside the masks ---------- */
  var plx = Array.prototype.slice.call(document.querySelectorAll('.parallax'));
  var ticking = false;
  function updateParallax() {
    ticking = false;
    if (reduceMotion) return;
    var vh = window.innerHeight;
    plx.forEach(function (img) {
      var box = img.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100 || box.height === 0) return;
      var speed = parseFloat(img.getAttribute('data-speed')) || 0.12;
      // -1 when the mask's centre is at the bottom of the viewport, +1 at the top.
      var p = ((vh / 2) - (box.top + box.height / 2)) / (vh / 2 + box.height / 2);
      p = Math.max(-1, Math.min(1, p));
      img.style.setProperty('--py', (p * speed * box.height).toFixed(1) + 'px');
    });
  }
  /* Nav contrast: flip the pills to navy while they sit over a neon surface. */
  var nav = document.querySelector('.site-nav');
  function updateNavContrast() {
    if (!nav || !document.elementsFromPoint) return;
    var r = nav.getBoundingClientRect();
    var hits = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    var under = null;
    for (var i = 0; i < hits.length; i++) { if (!nav.contains(hits[i])) { under = hits[i]; break; } }
    nav.classList.toggle('on-neon', !!(under && under.closest('.tab--neon, .tag, .tag-bar')));
  }
  /* Stacking tabs: fade a tab's body out as the next tab slides up to cover it,
     so nothing peeks through the indent or the notch. Titles stay visible. */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function updateTabs() {
    var vh = window.innerHeight;
    tabs.forEach(function (tab, i) {
      var body = tab.querySelector('.tab-body');
      var next = tabs[i + 1];
      if (!body || !next) return;
      var stuckAt = parseFloat(getComputedStyle(next).top) || 0;
      var dist = next.getBoundingClientRect().top - stuckAt;
      var o = Math.max(0, Math.min(1, dist / (vh * 0.45)));
      body.style.opacity = o.toFixed(3);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { updateParallax(); checkReveals(); updateNavContrast(); updateTabs(); }); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateParallax();
  updateTabs();

  /* ---------- Active nav link ---------- */
  var navLinks = document.querySelectorAll('.site-nav a');
  if ('IntersectionObserver' in window) {
    var current = {};
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { current[e.target.id || e.target.className] = { on: e.isIntersecting, key: e.target.getAttribute('data-section'), top: e.boundingClientRect.top }; });
      var active = null, best = Infinity;
      Object.keys(current).forEach(function (k) {
        var c = current[k];
        if (c.on && Math.abs(c.top) < best) { best = Math.abs(c.top); active = c.key; }
      });
      navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === active); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('[data-section]').forEach(function (s) { navIo.observe(s); });
  }

  /* ---------- Share ---------- */
  var shareUrl = 'https://parkup.techweave.co/';
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    var original = btn.innerHTML;
    btn.addEventListener('click', function () {
      var data = { title: 'Park Up Sunshine Coast', text: 'Free afternoon at Coolum Beer Co, Thursday 12 November, 3pm to 7pm. Worth an hour.', url: shareUrl };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      var done = function () {
        btn.textContent = 'Link copied';
        setTimeout(function () { btn.innerHTML = original; }, 2200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(done, done); else done();
    });
  });

  /* ---------- Registration (front end only) ---------- */
  var form = document.querySelector('[data-form]');
  var confirmBox = document.querySelector('[data-confirm]');
  if (form) {
    var errorMsg = form.querySelector('.form-error');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true, firstBad = null;
      form.querySelectorAll('input[required], input[type="email"], input[type="url"]').forEach(function (input) {
        var valid = input.checkValidity() && (!input.required || input.value.trim() !== '');
        input.setAttribute('aria-invalid', String(!valid));
        if (!valid) { ok = false; if (!firstBad) firstBad = input; }
      });
      errorMsg.hidden = ok;
      if (!ok) { firstBad.focus(); return; }

      // TODO (Techweave build): POST these values to the LiteCard "create card" endpoint.
      // The ticket number it returns becomes the QR on the wallet pass.
      var payload = Object.fromEntries(new FormData(form).entries());
      payload.consent = new FormData(form).getAll('consent');
      window.parkupLastRegistration = payload;

      form.hidden = true;
      confirmBox.hidden = false;
      confirmBox.focus();
      confirmBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
    form.addEventListener('input', function (ev) {
      if (ev.target.getAttribute('aria-invalid') === 'true' && ev.target.checkValidity()) ev.target.setAttribute('aria-invalid', 'false');
    });
  }

  /* ---------- Add to calendar: .ics built on the fly with the venue in LOCATION ---------- */
  var icsBtn = document.querySelector('[data-ics]');
  if (icsBtn) {
    icsBtn.addEventListener('click', function () {
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Techweave//Park Up//EN', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:parkup-sc26@parkup.techweave.co',
        'DTSTAMP:20261001T000000Z',
        'DTSTART:20261112T050000Z',
        'DTEND:20261112T090000Z',
        'SUMMARY:Park Up Sunshine Coast',
        'LOCATION:Coolum Beer Company\\, Unit 1/2 Junction Drive\\, Coolum Beach QLD 4573',
        'DESCRIPTION:Drop in any time from 3pm. Scan your pass at the door and the first drink is on us. ' + shareUrl,
        'URL:' + shareUrl,
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'park-up-sunshine-coast.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }
})();
