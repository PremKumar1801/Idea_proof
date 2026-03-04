
// analuse 

(function () {
  'use strict';

  /* =============================================
     THEME SYSTEM
  ============================================= */
  var html = document.documentElement;
  var themeBtns = document.querySelectorAll('[data-theme-target]');
  var THEME_KEY = 'ideaproof-theme';

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    themeBtns.forEach(function (b) {
      var active = b.dataset.themeTarget === t;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active);
    });
    localStorage.setItem(THEME_KEY, t);
  }

  applyTheme(localStorage.getItem(THEME_KEY) || 'white');
  themeBtns.forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(b.dataset.themeTarget); });
  });

  /* =============================================
     STEP STATE
  ============================================= */
  var currentStep = 1;
  var TOTAL_STEPS = 5;

  var barFill = document.getElementById('az-bar-fill');
  var barTrack = document.querySelector('.az-bar-track');
  var stepLabels = document.querySelectorAll('[data-step-label]');

  function updateProgress(step) {
    var pct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
    barFill.style.width = pct + '%';
    barTrack.setAttribute('aria-valuenow', step);

    stepLabels.forEach(function (l) {
      var n = parseInt(l.dataset.stepLabel);
      l.classList.remove('az-step-active', 'az-step-done');
      if (n === step) l.classList.add('az-step-active');
      if (n < step) l.classList.add('az-step-done');
    });
  }

  /* =============================================
     NAVIGATION
  ============================================= */
  window.azGoTo = function (target) {
    var fromEl = document.getElementById('az-step-' + currentStep);
    var toEl = document.getElementById('az-step-' + target);
    if (!fromEl || !toEl) return;

    fromEl.classList.add('az-exit');
    setTimeout(function () {
      fromEl.classList.remove('az-active', 'az-exit');
      fromEl.style.display = 'none';
      toEl.style.display = 'block';
      /* Trigger reflow before adding active so transition fires */
      void toEl.offsetWidth;
      toEl.classList.add('az-active');
      currentStep = target;
      updateProgress(currentStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (target === 4) startProcessing();
      if (target === 5) animateResults();
    }, 200);
  };

  /* Analyze button — premium loading interaction */
  window.azAnalyzeClick = function () {
    var btn = document.getElementById('az-analyze-btn');
    var textEl = btn ? btn.querySelector('.az-btn-analyze-text') : null;
    if (!btn) { azGoTo(4); return; }

    /* 1. Press scale (brief) */
    btn.classList.add('az-analyzing');
    if (textEl) textEl.textContent = 'Analyzing…';

    /* 2. After 1.7 s, restore & navigate */
    setTimeout(function () {
      btn.classList.remove('az-analyzing');
      if (textEl) textEl.textContent = 'Analyze My Idea';
      azGoTo(4);
    }, 1700);
  };

  window.azRestart = function () {
    /* Reset all selections */
    document.querySelectorAll('.az-option').forEach(function (o) {
      o.classList.remove('az-selected');
      o.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.az-budget-pill').forEach(function (p) {
      p.classList.remove('az-selected');
    });
    document.querySelectorAll('textarea, input[type="text"]').forEach(function (f) {
      f.value = '';
    });
    /* Reset char counters */
    updateCounter('az-main-desc', 'az-main-count', 500);
    updateCounter('az-problem', 'az-prob-count', 120);
    updateCounter('az-audience', 'az-aud-count', 80);
    updateCounter('az-solution', 'az-sol-count', 120);
    updateCounter('az-revenue', 'az-rev-count', 80);
    /* Reset result panels stagger class */
    var step5 = document.getElementById('az-step-5');
    if (step5) step5.classList.remove('az-panels-ready');
    azGoTo(1);
  };

  /* =============================================
     MCQ OPTION SELECTION
  ============================================= */
  document.querySelectorAll('.az-options').forEach(function (group) {
    group.querySelectorAll('.az-option').forEach(function (opt) {
      function select() {
        group.querySelectorAll('.az-option').forEach(function (o) {
          o.classList.remove('az-selected');
          o.setAttribute('aria-pressed', 'false');
        });
        opt.classList.add('az-selected');
        opt.setAttribute('aria-pressed', 'true');
      }
      opt.addEventListener('click', select);
      opt.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(); }
      });
    });
  });

  /* Budget pills */
  document.querySelectorAll('.az-budget-opts').forEach(function (group) {
    group.querySelectorAll('.az-budget-pill').forEach(function (pill) {
      function select() {
        group.querySelectorAll('.az-budget-pill').forEach(function (p) {
          p.classList.remove('az-selected');
        });
        pill.classList.add('az-selected');
      }
      pill.addEventListener('click', select);
      pill.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(); }
      });
    });
  });

  /* =============================================
     CHARACTER COUNTERS
  ============================================= */
  function updateCounter(inputId, countId, max) {
    var input = document.getElementById(inputId);
    var counter = document.getElementById(countId);
    if (!input || !counter) return;
    var len = input.value.length;
    counter.textContent = len + ' / ' + max;
    counter.classList.toggle('az-warn', len >= max * 0.85);
  }

  function bindCounter(inputId, countId, max) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', function () {
      updateCounter(inputId, countId, max);
    });
  }

  bindCounter('az-main-desc', 'az-main-count', 500);
  bindCounter('az-problem', 'az-prob-count', 120);
  bindCounter('az-audience', 'az-aud-count', 80);
  bindCounter('az-solution', 'az-sol-count', 120);
  bindCounter('az-revenue', 'az-rev-count', 80);

  /* =============================================
     SLIDERS
  ============================================= */
  var timeSlider = document.getElementById('az-time-slider');
  var timeVal = document.getElementById('az-time-val');

  if (timeSlider) {
    function updateTime() {
      var v = parseInt(timeSlider.value);
      timeVal.textContent = v + ' hour' + (v === 1 ? '' : 's') + ' / week';
      timeSlider.setAttribute('aria-valuenow', v);
      updateSliderFill(timeSlider);
    }
    timeSlider.addEventListener('input', updateTime);
    updateTime();
  }

  var skillLabels = ['None', 'Basic', 'Mid-level', 'Senior', 'Expert'];
  var skillSlider = document.getElementById('az-skill-slider');
  var skillVal = document.getElementById('az-skill-val');

  if (skillSlider) {
    function updateSkill() {
      var v = parseInt(skillSlider.value) - 1;
      skillVal.textContent = skillLabels[v] || 'Mid-level';
      updateSliderFill(skillSlider);
    }
    skillSlider.addEventListener('input', updateSkill);
    updateSkill();
  }

  function updateSliderFill(slider) {
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var val = parseFloat(slider.value);
    var pct = ((val - min) / (max - min)) * 100;
    slider.style.background =
      'linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ' + pct + '%, var(--slider-track) ' + pct + '%, var(--slider-track) 100%)';
  }

  /* =============================================
     TEAM TOGGLE
  ============================================= */
  var teamToggle = document.getElementById('az-team-toggle');
  var teamLabel = document.getElementById('az-team-label');

  if (teamToggle) {
    teamToggle.addEventListener('change', function () {
      teamLabel.textContent = teamToggle.checked ? 'Has co-founder' : 'Solo founder';
    });
  }

  /* =============================================
     PROCESSING ANIMATION
  ============================================= */
  var PROC_STEPS = [
    { id: 'az-ps-1', msg: 'Analyzing problem clarity…', pct: 20 },
    { id: 'az-ps-2', msg: 'Checking uniqueness index…', pct: 45 },
    { id: 'az-ps-3', msg: 'Evaluating market fit…', pct: 70 },
    { id: 'az-ps-4', msg: 'Building action roadmap…', pct: 92 }
  ];

  var CIRCUMFERENCE = 2 * Math.PI * 50; // r=50

  function setLoaderPct(pct) {
    var ring = document.getElementById('az-loader-ring');
    var pctEl = document.getElementById('az-loader-pct');
    var offset = CIRCUMFERENCE * (1 - pct / 100);
    if (ring) ring.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  }

  function startProcessing() {
    /* Reset all proc steps */
    PROC_STEPS.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el) el.classList.remove('az-proc-active', 'az-proc-done');
    });
    setLoaderPct(0);

    var statusEl = document.getElementById('az-proc-status');
    var idx = 0;

    function runStep() {
      if (idx >= PROC_STEPS.length) {
        /* Done — animate to 100 then go to results */
        setLoaderPct(100);
        if (statusEl) statusEl.textContent = 'Analysis complete.';
        var prev = document.getElementById(PROC_STEPS[idx - 1].id);
        if (prev) { prev.classList.remove('az-proc-active'); prev.classList.add('az-proc-done'); }
        setTimeout(function () { azGoTo(5); }, 900);
        return;
      }

      var step = PROC_STEPS[idx];
      var stepEl = document.getElementById(step.id);

      /* Mark previous done */
      if (idx > 0) {
        var prevEl = document.getElementById(PROC_STEPS[idx - 1].id);
        if (prevEl) { prevEl.classList.remove('az-proc-active'); prevEl.classList.add('az-proc-done'); }
      }

      if (stepEl) stepEl.classList.add('az-proc-active');
      if (statusEl) statusEl.textContent = step.msg;
      setLoaderPct(step.pct);

      idx++;
      setTimeout(runStep, 1200 + Math.random() * 400);
    }

    setTimeout(runStep, 300);
  }

  /* =============================================
     RESULTS ANIMATION
  ============================================= */
  var SCORE_TARGET = 74;
  var UNIQUE_TARGET = 73;
  var SCORE_R = 65; /* SVG circle radius */
  var SCORE_CIRC = 2 * Math.PI * SCORE_R;

  function animateResults() {
    var ring = document.getElementById('az-result-ring');
    var numEl = document.getElementById('az-result-num');
    var uniqEl = document.getElementById('az-unique-num');
    var step5 = document.getElementById('az-step-5');

    /* Stagger panel fade-in after step becomes visible */
    if (step5) {
      setTimeout(function () {
        step5.classList.add('az-panels-ready');
      }, 120);
    }

    /* Animate score ring */
    if (ring) {
      var offset = SCORE_CIRC * (1 - SCORE_TARGET / 100);
      setTimeout(function () {
        ring.style.strokeDashoffset = offset;
      }, 300);
    }

    /* Count-up score number */
    var start = 0;
    var dur = 1400;
    var step = 16;
    var steps = dur / step;
    var inc = SCORE_TARGET / steps;
    var t = 0;

    var scoreTimer = setInterval(function () {
      t += inc;
      if (t >= SCORE_TARGET) { t = SCORE_TARGET; clearInterval(scoreTimer); }
      if (numEl) numEl.textContent = Math.round(t);
    }, step);

    /* Count-up uniqueness */
    var u = 0;
    var uTimer = setInterval(function () {
      u += UNIQUE_TARGET / steps;
      if (u >= UNIQUE_TARGET) { u = UNIQUE_TARGET; clearInterval(uTimer); }
      if (uniqEl) uniqEl.textContent = Math.round(u) + '%';
    }, step);

    /* Animate bars */
    setTimeout(function () {
      ['az-bar-market', 'az-bar-unique', 'az-bar-exec', 'az-bar-prob'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.transform = 'scaleX(1)';
      });
    }, 500);
  }

  /* =============================================
     INITIAL PROGRESS RENDER
  ============================================= */
  updateProgress(1);

}());