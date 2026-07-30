
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
  /* =============================================
     STEP VALIDATION
  ============================================= */
  function validateStep1() {
    var stage = document.querySelector('[data-group="stage"] .az-selected');
    var competition = document.querySelector('[data-group="competition"] .az-selected');
    var demand = document.querySelector('[data-group="demand"] .az-selected');
    var audience = document.querySelector('[data-group="audience"] .az-selected');
    return (stage && competition && demand && audience);
  }

  window.azGoTo = function (target) {
    /* Validate before moving forward */
    if (target > currentStep) {
      if (currentStep === 1 && !validateStep1()) {
        alert("Please answer all questions before continuing.");
        return;
      }
    }

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
    }, 200);
  };

  /* Analyze button — premium loading interaction */
window.azAnalyzeClick = async function () {

    const btn = document.getElementById('az-analyze-btn');

    /* ======================================
       COLLECT FORM DATA
    ====================================== */

    const data = {

        fullIdea: document.getElementById("az-main-desc")?.value,

        problem: document.getElementById("az-problem")?.value,

        audience: document.getElementById("az-audience")?.value,

        solution: document.getElementById("az-solution")?.value,

        revenue: document.getElementById("az-revenue")?.value,

        timeCommitment: document.getElementById("az-time-slider")?.value,

        skillLevel: document.getElementById("az-skill-slider")?.value

    };

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Analyzing...";
    }

    try {

        /* ======================================
           SEND DATA TO BACKEND
        ====================================== */

        const response = await fetch("http://localhost:3000/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)

        });

        if (!response.ok) {
            throw new Error(`Server error: HTTP ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        console.log(result);

        /* ======================================
           CHECK FOR ERROR
        ====================================== */

        if (!result.success) {
            alert("Server Error: " + (result.message || "Unknown error"));
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Analyze My Idea";
            }
            return;
        }

        /* ======================================
           SHOW RESULT — Parse JSON & Render UI
        ====================================== */

        localStorage.setItem(
            "ideaResult",
            result.result
        );

        /* Track free trial usage */
        var newCount = parseInt(localStorage.getItem("analysisCount") || "0") + 1;
        localStorage.setItem("analysisCount", newCount.toString());

        azGoTo(5);

        // Wait for step transition to complete (azGoTo has 200ms delay)
        setTimeout(function () {
            try {
                var raw = result.result.replace(/```json|```/g, '').trim();
                var ai = JSON.parse(raw);
                renderScore(ai.score);
                renderMeters(ai.profitPotential);
                renderRiskBadge(ai.risks);
                renderCards(ai);
                renderRoadmap(ai.roadmap);
                renderSWOT(ai);
            } catch (parseErr) {
                console.log("JSON parse error, showing raw:", parseErr);
                document.getElementById("score-section").innerHTML =
                    '<div style="padding:24px;background:var(--surface);border-radius:16px;border:1px solid var(--surface-border);">' +
                    '<pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-primary);">' +
                    result.result + '</pre></div>';
            }
        }, 400);

    } catch (error) {

        console.error("Fetch error:", error);

        let errorMsg = error.message;
        if (errorMsg.includes("Failed to fetch")) {
            errorMsg = "Cannot connect to server. Make sure the backend is running on localhost:3000";
        }

        alert("Something went wrong: " + errorMsg);

        if (btn) {
            btn.disabled = false;
            btn.innerText = "Analyze My Idea";
        }

    }

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
     RENDER FUNCTIONS — Dynamic Results UI
  ============================================= */

  /* --- Score Ring --- */
  function renderScore(score) {
    var circ = 2 * Math.PI * 50;
    var el = document.getElementById('score-section');
    if (!el) return;

    el.innerHTML =
      '<div class="az-score-ring-container">' +
        '<svg viewBox="0 0 120 120">' +
          '<circle class="ring-bg" cx="60" cy="60" r="50" />' +
          '<circle class="ring-fill" id="score-ring-fill" cx="60" cy="60" r="50" ' +
            'style="stroke-dasharray:' + circ + ';stroke-dashoffset:' + circ + '" />' +
        '</svg>' +
        '<div class="az-score-center">' +
          '<span class="ring-num" id="ring-num">0</span>' +
          '<span class="ring-denom">/100</span>' +
        '</div>' +
      '</div>' +
      '<div class="az-score-label-text">Idea Score</div>' +
      '<div class="az-score-sub-text">Based on market, feasibility & timing</div>';

    /* Animate ring */
    var offset = circ - (score / 100) * circ;
    setTimeout(function () {
      document.getElementById('score-ring-fill').style.strokeDashoffset = offset;
    }, 100);

    /* Count up number */
    var numEl = document.getElementById('ring-num');
    var current = 0;
    var dur = 1400;
    var stepTime = 16;
    var steps = dur / stepTime;
    var inc = score / steps;
    var timer = setInterval(function () {
      current += inc;
      if (current >= score) { current = score; clearInterval(timer); }
      if (numEl) numEl.textContent = Math.round(current);
    }, stepTime);
  }

  /* --- Profit Meter --- */
  function renderMeters(profitPotential) {
    var map = { low: 25, medium: 55, high: 85 };
    var key = profitPotential.toLowerCase().includes('high') ? 'high'
      : profitPotential.toLowerCase().includes('medium') ? 'medium' : 'low';
    var pct = map[key];

    var el = document.getElementById('meters-section');
    if (!el) return;

    el.innerHTML =
      '<div class="az-meter-card">' +
        '<div class="az-meter-label">Profit Potential</div>' +
        '<div class="az-profit-track">' +
          '<div class="az-profit-fill" id="profit-bar"></div>' +
        '</div>' +
        '<div class="az-profit-labels">' +
          '<span>Low</span><span>Medium</span><span>High</span>' +
        '</div>' +
        '<p style="font-size:0.75rem;color:var(--text-secondary);margin-top:10px;">' + profitPotential + '</p>' +
      '</div>' +
      '<div class="az-meter-card">' +
        '<div class="az-meter-label">Risk Assessment</div>' +
        '<div id="risk-badge"></div>' +
      '</div>';

    setTimeout(function () {
      document.getElementById('profit-bar').style.width = pct + '%';
    }, 200);
  }

  /* --- Risk Badge --- */
  function renderRiskBadge(risks) {
    var isHigh = /high|regul|legal|compet|significant/i.test(risks);
    var isMed = /medium|moderate|some/i.test(risks);
    var cls = isHigh ? 'badge-high' : isMed ? 'badge-med' : 'badge-low';
    var icon = isHigh ? 'ti-flame' : isMed ? 'ti-alert-triangle' : 'ti-shield-check';
    var label = isHigh ? 'High risk' : isMed ? 'Medium risk' : 'Low risk';

    var el = document.getElementById('risk-badge');
    if (!el) return;

    el.innerHTML =
      '<div class="az-risk-badge-wrap">' +
        '<span class="badge ' + cls + '">' +
          '<i class="ti ' + icon + '"></i> ' + label +
        '</span>' +
      '</div>' +
      '<p class="az-risk-text">' + risks + '</p>';
  }

  /* --- Insight Cards --- */
  function renderCards(ai) {
    var CARDS = [
      { key: 'targetAudience', icon: 'ti-users',       label: 'Target Audience' },
      { key: 'competitors',    icon: 'ti-sword',        label: 'Competitors' },
      { key: 'strengths',      icon: 'ti-trophy',       label: 'Strengths' },
      { key: 'weaknesses',     icon: 'ti-alert-circle', label: 'Weaknesses' },
      { key: 'verdict',        icon: 'ti-checkup-list', label: 'Verdict' }
    ];

    var el = document.getElementById('results-container');
    if (!el) return;

    el.innerHTML = CARDS.map(function (c) {
      return '<div class="result-card">' +
        '<i class="ti ' + c.icon + '"></i>' +
        '<p class="card-label">' + c.label + '</p>' +
        '<p class="card-value">' + (ai[c.key] || '—') + '</p>' +
      '</div>';
    }).join('');
  }

  /* --- Roadmap Timeline --- */
  function renderRoadmap(steps) {
    var el = document.getElementById('roadmap-section');
    if (!el || !steps || !steps.length) return;

    var colors = ['td-blue', 'td-amber', 'td-green'];
    var phases = ['Near-term', 'Mid-term', 'Long-term'];

    el.innerHTML =
      '<div class="az-roadmap-title">Your Action Roadmap</div>' +
      steps.map(function (s, i) {
        return '<div class="timeline-item">' +
          '<div class="timeline-dot ' + colors[i % 3] + '"></div>' +
          '<div>' +
            '<p class="tc-title">' + s + '</p>' +
            '<p class="tc-sub">Phase ' + (i + 1) + ' · ' + phases[i % 3] + '</p>' +
          '</div>' +
        '</div>';
      }).join('');
  }

  /* --- SWOT Grid --- */
  function renderSWOT(ai) {
    var el = document.getElementById('swot-section');
    if (!el) return;

    el.innerHTML =
      '<div class="az-swot-title">SWOT Analysis</div>' +
      '<div class="swot-grid">' +
        '<div class="swot-cell swot-s">' +
          '<strong>S · Strengths</strong>' + (ai.strengths || '—') +
        '</div>' +
        '<div class="swot-cell swot-w">' +
          '<strong>W · Weaknesses</strong>' + (ai.weaknesses || '—') +
        '</div>' +
        '<div class="swot-cell swot-o">' +
          '<strong>O · Opportunities</strong>' + (ai.opportunities || '—') +
        '</div>' +
        '<div class="swot-cell swot-t">' +
          '<strong>T · Threats</strong>' + (ai.threats || '—') +
        '</div>' +
      '</div>';
  }

  /* =============================================
     INITIAL PROGRESS RENDER
  ============================================= */
  updateProgress(1);

}());