(function () {
  const html = document.documentElement;
  const btns = document.querySelectorAll('[data-theme-target]');
  const STORED = localStorage.getItem('ideaproof-theme') || 'white';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    btns.forEach(btn => {
      const isActive = btn.dataset.themeTarget === theme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
    localStorage.setItem('ideaproof-theme', theme);
  }

  // Apply stored / default theme on load
  applyTheme(STORED);

  btns.forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeTarget));
  });
})();


//   how its work
(function () {
    'use strict';
  
    var section   = document.querySelector('.hiw-section');
    var card1     = document.querySelector('.hiw-card--1');
    var card2     = document.querySelector('.hiw-card--2');
    var card3     = document.querySelector('.hiw-card--3');
    var navAnchor = document.querySelector('a[href="#how-it-works"]');
  
    if (!section || !card1 || !card2 || !card3) return;
  
    /* ---- Smooth scroll for nav anchor ---- */
    if (navAnchor) {
      navAnchor.addEventListener('click', function (e) {
        e.preventDefault();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  
    /* ---- Staggered card animation sequence ---- */
    var DELAYS = {
      card1:    0,
      card2:    400,   // ms after card 1 starts
      card3:    800    // ms after card 1 starts
    };
  
    function runSequence() {
      /* Trigger ambient glow + header */
      section.classList.add('hiw-triggered');
  
      /* Card 1 — immediate */
      setTimeout(function () {
        card1.classList.add('hiw-card-visible');
      }, DELAYS.card1);
  
      /* Card 2 — emerges from card 1's position */
      setTimeout(function () {
        card2.classList.add('hiw-card-visible');
      }, DELAYS.card2);
  
      /* Card 3 — emerges from card 2's position */
      setTimeout(function () {
        card3.classList.add('hiw-card-visible');
      }, DELAYS.card3);
    }
  
    /* ---- IntersectionObserver — trigger once ---- */
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              runSequence();
              observer.unobserve(section);
            }
          });
        },
        {
          threshold: 0.35,
          rootMargin: '0px 0px -60px 0px'
        }
      );
  
      observer.observe(section);
    } else {
      /* Fallback — no observer support */
      runSequence();
    }
  
  })();

// FEATURES PART
(function () {
  'use strict';

  /* ── Scroll reveal ─────────────────────────── */
  var section    = document.querySelector('.feat-section');
  var intro      = document.querySelector('.feat-intro');
  var cards      = document.querySelectorAll('.feat-card.feat-reveal');
  var CARD_DELAY = 90; // ms stagger between each card

  if (!section) return;

  function revealItems() {
    /* Intro first */
    if (intro) {
      intro.style.transitionDelay = '0ms';
      intro.classList.add('feat-visible');
    }

    /* Cards staggered */
    cards.forEach(function (card, i) {
      card.style.transitionDelay = (i * CARD_DELAY + 120) + 'ms';
      card.classList.add('feat-visible');
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          revealItems();
          observer.unobserve(section);
        }
      },
      { threshold: 0.10, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(section);
  } else {
    revealItems();
  }

  /* ── Hover: glow tracks cursor inside card ─── */
  cards.forEach(function (card) {
    var glow = card.querySelector('.feat-card-glow');
    if (!glow) return;

    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x    = e.clientX - rect.left;
      var y    = e.clientY - rect.top;
      glow.style.transform =
        'translate(' + (x - 100) + 'px, ' + (y - 100) + 'px) scale(1)';
      glow.style.opacity   = '1';
    });

    card.addEventListener('mouseleave', function () {
      glow.style.transform = 'translate(0,0) scale(0.6)';
      glow.style.opacity   = '0';
    });

    /* Keyboard: treat focus-visible like hover */
    card.addEventListener('focus', function () {
      glow.style.transform = 'translate(0,0) scale(1)';
      glow.style.opacity   = '1';
    });

    card.addEventListener('blur', function () {
      glow.style.transform = 'translate(0,0) scale(0.6)';
      glow.style.opacity   = '0';
    });
  });

  /* ── Navbar anchor smooth scroll ──────────── */
  var navLink = document.querySelector('a[href="#features"]');
  if (navLink) {
    navLink.addEventListener('click', function (e) {
      e.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

}());