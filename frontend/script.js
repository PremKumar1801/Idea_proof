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


// pricing 

(function () {
  'use strict';

  var section  = document.querySelector('.pr-section');
  var reveals  = document.querySelectorAll('.pr-section .pr-reveal');
  var cards    = document.querySelectorAll('.pr-section .pr-card');
  var toggle   = document.querySelector('.pr-toggle-track');

  if (!section) return;

  /* ── Staggered scroll reveal ─────────────────*/
  var STAGGER = 85; // ms between each reveal item

  function revealAll() {
    reveals.forEach(function (el, i) {
      var isCard = el.classList.contains('pr-card');
      /* Intro and toggle get immediate reveal */
      var delay  = isCard ? (getCardIndex(el) * STAGGER + 100) : 0;
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('pr-visible');
    });
  }

  function getCardIndex(card) {
    return Array.prototype.indexOf.call(cards, card);
  }

  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          revealAll();
          obs.unobserve(section);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -50px 0px' }
    );
    obs.observe(section);
  } else {
    revealAll();
  }

  /* ── Cursor-tracking glow on cards ──────────*/
  cards.forEach(function (card) {
    var glow = card.querySelector('.pr-card-glow');
    if (!glow) return;

    card.addEventListener('mousemove', function (e) {
      var rect  = card.getBoundingClientRect();
      var x     = e.clientX - rect.left;
      var y     = e.clientY - rect.top;
      /* Keep glow centered on cursor */
      glow.style.left    = (x - 120) + 'px';
      glow.style.top     = (y - 120) + 'px';
      glow.style.opacity = '1';
      glow.style.transform = 'scale(1)';
    });

    card.addEventListener('mouseleave', function () {
      glow.style.opacity   = '0';
      glow.style.transform = 'scale(0.5)';
    });

    card.addEventListener('focus', function () {
      glow.style.opacity   = '1';
      glow.style.transform = 'scale(1)';
    });

    card.addEventListener('blur', function () {
      glow.style.opacity   = '0';
      glow.style.transform = 'scale(0.5)';
    });
  });

  /* ── Annual / Monthly toggle (UI only) ──────*/
  var isAnnual     = false;
  var toggleLabel  = section.querySelector('.pr-toggle-row');
  var labels       = section.querySelectorAll('.pr-toggle-label');

  if (toggle) {
    toggle.addEventListener('click', function () {
      isAnnual = !isAnnual;
      toggle.classList.toggle('pr-toggled', isAnnual);

      if (labels[0] && labels[1]) {
        labels[0].classList.toggle('pr-toggle-label--active', !isAnnual);
        labels[1].classList.toggle('pr-toggle-label--active',  isAnnual);
      }
    });

    toggle.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle.click();
      }
    });

    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', 'false');
    toggle.setAttribute('tabindex', '0');
    toggle.setAttribute('aria-label', 'Toggle annual billing');

    toggle.addEventListener('click', function () {
      toggle.setAttribute('aria-checked', isAnnual ? 'true' : 'false');
    });
  }

  /* ── Smooth scroll from navbar ───────────── */
  var navLink = document.querySelector('a[href="#pricing"]');
  if (navLink) {
    navLink.addEventListener('click', function (e) {
      e.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

}());

/* ============================================================
   FOUNDERS SECTION — founders-section.js
   Self-contained: reads data, builds DOM, manages carousel.
   No external dependencies required.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     1. DATA
     Images: high-quality Wikimedia / public-domain portraits.
     Replace any src with your own hosted images at any time.
  ---------------------------------------------------------- */
  const FOUNDERS = [
    {
      name: "Steve Jobs",
      company: "Apple",
      img: "images/founders/steve-jobs.jpg",
      facts: [
        "Started Apple in a Cupertino garage in 1976.",
        "Turned user-friendly personal computers into a global revolution.",
      ],
    },
    {
      name: "Elon Musk",
      company: "Tesla · SpaceX",
      img: "images/founders/elon-musk.jpg",
      facts: [
        "Co-founded Tesla to accelerate sustainable transport.",
        "Founded SpaceX to make life multi-planetary with reusable rockets.",
      ],
    },
    {
      name: "Jeff Bezos",
      company: "Amazon",
      img: "images/founders/jeff-bezos.jpg",
      facts: [
        "Started with a single-product online bookstore from his garage.",
        "Expanded it into Amazon, one of the world's largest companies.",
      ],
    },
    {
      name: "Mark Zuckerberg",
      company: "Meta",
      img: "images/founders/mark-zuckerberg.jpg",
      facts: [
        "Built a social networking platform as a Harvard dorm-room project.",
        "It became Meta, now serving over three billion active users.",
      ],
    },
    {
      name: "N. R. Narayana Murthy",
      company: "Infosys",
      img: "images/founders/narayana-murthy.jpg",
      facts: [
        "Started Infosys with six colleagues and ₹10,000 in seed capital.",
        "Built one of India's most respected global IT companies.",
      ],
    },
    {
      name: "Ritesh Agarwal",
      company: "OYO Rooms",
      img: "images/founders/ritesh-agarwal.jpg",
      facts: [
        "Started with the idea of affordable, standardised budget hotels.",
        "Scaled OYO Rooms into a global hospitality brand across 80+ countries.",
      ],
    },
    {
      name: "Sridhar Vembu",
      company: "Zoho",
      img: "images/founders/sridhar-vembu.jpg",
      facts: [
        "Built software products from rural India for a global market.",
        "Created Zoho Corporation without relying on heavy external funding.",
      ],
    },
  ];

  /* ----------------------------------------------------------
     2. CONFIG
  ---------------------------------------------------------- */
  const CARDS_PER_PAGE = 3; // desktop; CSS overrides for smaller screens
  const AUTO_PLAY_DELAY = 4500; // ms — 0 to disable
  const VISIBLE_CARDS = getVisibleCount();

  function getVisibleCount() {
    const w = window.innerWidth;
    if (w <= 540) return 1;
    if (w <= 860) return 2;
    return 3;
  }

  /* ----------------------------------------------------------
     3. STATE
  ---------------------------------------------------------- */
  let currentPage = 0;
  let visibleCards = VISIBLE_CARDS;
  let totalPages = Math.ceil(FOUNDERS.length / visibleCards);
  let autoTimer = null;
  let isSliding = false;
  let isPaused = false;

  /* ----------------------------------------------------------
     4. DOM REFS
  ---------------------------------------------------------- */
  const track = document.getElementById("foundersTrack");
  const dotsWrap = document.getElementById("foundersDots");
  const prevBtn = document.getElementById("foundersPrev");
  const nextBtn = document.getElementById("foundersNext");

  if (!track) return; // section not in DOM

  /* ----------------------------------------------------------
     5. RENDER HELPERS
  ---------------------------------------------------------- */

  /** Build a single founder card element */
  function buildCard(founder, indexInPage) {
    const li = document.createElement("article");
    li.className = "founder-card";
    li.style.animationDelay = `${indexInPage * 0.1}s`;

    li.innerHTML = `
      <div class="founder-img-wrap">
        <img
          src="${founder.img}"
          alt="Portrait of ${founder.name}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x340/e8f5e9/1a6b45?text=${encodeURIComponent(founder.name[0])}'"
        />
        <span class="founder-badge">${String(indexInPage + 1).padStart(2, "0")}</span>
      </div>
      <div class="founder-body">
        <h3 class="founder-name">${founder.name}</h3>
        <div class="founder-company">
          <span class="founder-company-dot"></span>
          ${founder.company}
        </div>
        <ul class="founder-facts">
          ${founder.facts.map((f) => `<li>${f}</li>`).join("")}
        </ul>
      </div>
    `;
    return li;
  }

  /** Render the 3 cards for the current page */
  function renderPage(page, direction = null) {
    if (isSliding) return;
    isSliding = true;

    // Animate out
    if (direction) {
      track.classList.add(
        direction === "next" ? "is-sliding-left" : "is-sliding-right"
      );
    }

    setTimeout(
      () => {
        // Clear old cards
        track.innerHTML = "";

        const start = page * visibleCards;
        const slice = FOUNDERS.slice(start, start + visibleCards);

        slice.forEach((founder, i) => {
          // Reset animation by cloning (forces re-trigger)
          const card = buildCard(founder, i);
          track.appendChild(card);
        });

        // Remove slide class
        track.classList.remove("is-sliding-left", "is-sliding-right");

        updateDots();
        updateNav();
        isSliding = false;
      },
      direction ? 200 : 0
    );
  }

  /* ----------------------------------------------------------
     6. DOTS
  ---------------------------------------------------------- */
  function buildDots() {
    dotsWrap.innerHTML = "";
    for (let i = 0; i < totalPages; i++) {
      const btn = document.createElement("button");
      btn.className = "founders-dot" + (i === 0 ? " is-active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", `Go to page ${i + 1}`);
      btn.dataset.page = i;
      btn.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(btn);
    }
  }

  function updateDots() {
    dotsWrap.querySelectorAll(".founders-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === currentPage);
    });
  }

  /* ----------------------------------------------------------
     7. NAV
  ---------------------------------------------------------- */
  function updateNav() {
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === totalPages - 1;
  }

  /* ----------------------------------------------------------
     8. NAVIGATION LOGIC
  ---------------------------------------------------------- */
  function goTo(page, direction = null) {
    if (page < 0 || page >= totalPages || page === currentPage) return;
    const dir = direction || (page > currentPage ? "next" : "prev");
    currentPage = page;
    renderPage(currentPage, dir);
  }

  function goNext() {
    if (currentPage < totalPages - 1) goTo(currentPage + 1, "next");
  }
  function goPrev() {
    if (currentPage > 0) goTo(currentPage - 1, "prev");
  }

  prevBtn.addEventListener("click", () => { goPrev(); resetAutoPlay(); });
  nextBtn.addEventListener("click", () => { goNext(); resetAutoPlay(); });

  /* ----------------------------------------------------------
     9. AUTO-PLAY
  ---------------------------------------------------------- */
  function startAutoPlay() {
    if (!AUTO_PLAY_DELAY) return;
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (isPaused) return; // skip tick if user is hovering
      if (currentPage >= totalPages - 1) {
        currentPage = -1;
      }
      goNext();
    }, AUTO_PLAY_DELAY);
  }

  function resetAutoPlay() {
    clearInterval(autoTimer);
    isPaused = false;
    startAutoPlay();
  }

  /* Pause on hover — section level covers arrows & dots too */
  const section = document.getElementById("founders");
  if (section) {
    section.addEventListener("mouseenter", () => { isPaused = true; });
    section.addEventListener("mouseleave", () => { isPaused = false; });
  }

  /* ----------------------------------------------------------
     10. RESPONSIVE RESIZE
  ---------------------------------------------------------- */
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newVisible = getVisibleCount();
      if (newVisible !== visibleCards) {
        visibleCards = newVisible;
        totalPages = Math.ceil(FOUNDERS.length / visibleCards);
        currentPage = 0;
        buildDots();
        renderPage(currentPage);
        resetAutoPlay();
      }
    }, 200);
  });

  /* ----------------------------------------------------------
     11. KEYBOARD NAVIGATION
  ---------------------------------------------------------- */
  document.addEventListener("keydown", (e) => {
    // Only when section is visible in viewport
    const rect = section && section.getBoundingClientRect();
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return;

    if (e.key === "ArrowLeft") { goPrev(); resetAutoPlay(); }
    if (e.key === "ArrowRight") { goNext(); resetAutoPlay(); }
  });

  /* ----------------------------------------------------------
     12. TOUCH / SWIPE
  ---------------------------------------------------------- */
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) > 40) {
      delta > 0 ? goNext() : goPrev();
      resetAutoPlay();
    }
  }, { passive: true });

  /* ----------------------------------------------------------
     13. INIT
  ---------------------------------------------------------- */
  buildDots();
  renderPage(0);
  startAutoPlay();

})();