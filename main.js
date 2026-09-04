/* =========================================================
   KAMMY — product demo. Front-end only.
   Nothing here talks to a server. Every flow is simulated
   in the browser from the single `state` object below.
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- markets ---------------- */

  var MARKETS = {
    MX: {
      name: 'Mexico',
      currency: 'MXN',
      fx: 18.55,                 // MXN per USD
      limit: 4600,               // set by the licensed lending partner
      limitUSD: 248,
      partner: 'Licensed SOFOM partner · Mexico',
      incomeHint: '18000'
    },
    IN: {
      name: 'India',
      currency: 'INR',
      fx: 87.5,                  // INR per USD
      limit: 21000,
      limitUSD: 240,
      partner: 'Licensed NBFC partner · India',
      incomeHint: '60000'
    }
  };

  /* Venues and cities are real. Acts, tours and dates are invented. */
  var EVENTS = {
    MX: [
      { tour: 'The Long Season Tour', venue: 'Estadio GNP Seguros', city: 'Ciudad de México', date: '2026-11-14', price: 3987, usd: 215.00, art: 'Stadium crowd at night — main stage' },
      { tour: 'Paper Cities', venue: 'Auditorio Nacional', city: 'Ciudad de México', date: '2026-10-03', price: 2450, art: 'Seated hall, warm spotlights from the rig' },
      { tour: 'Northbound Nights', venue: 'Arena Monterrey', city: 'Monterrey', date: '2026-11-28', price: 6120, art: 'Arena floor, lasers over a standing crowd' },
      { tour: 'Small Rooms Tour', venue: 'Teatro Metropólitan', city: 'Ciudad de México', date: '2026-09-19', price: 1890, art: 'Historic theatre balcony, red seats' },
      { tour: 'Valle Sonoro', venue: 'Estadio 3 de Marzo', city: 'Zapopan, Jalisco', date: '2026-12-05', price: 4300, art: 'Open-air festival at dusk, two stages' },
      { tour: 'Circuito Eléctrico', venue: 'Autódromo Hermanos Rodríguez', city: 'Ciudad de México', date: '2026-12-12', price: 8750, art: 'Race circuit grandstand converted to a festival' }
    ],
    IN: [
      { tour: 'Monsoon Frequency', venue: 'Jawaharlal Nehru Stadium', city: 'New Delhi', date: '2026-11-21', price: 18400, art: 'Stadium bowl at night — main stage' },
      { tour: 'Neon Meridian', venue: 'NSCI Dome', city: 'Mumbai', date: '2026-10-10', price: 9900, art: 'Domed indoor arena, overhead light rig' },
      { tour: 'Harbour Lights Tour', venue: 'DY Patil Stadium', city: 'Navi Mumbai', date: '2026-12-05', price: 26500, art: 'Stadium tier packed for a night show' },
      { tour: 'Slow Ragas', venue: 'Shanmukhananda Hall', city: 'Mumbai', date: '2026-09-26', price: 6750, art: 'Concert hall interior, seated audience' },
      { tour: 'Deccan Static', venue: 'Hitex Exhibition Centre', city: 'Hyderabad', date: '2026-11-14', price: 21800, art: 'Exhibition hall staged for a live set' },
      { tour: 'Turf & Thunder', venue: 'Mahalaxmi Racecourse', city: 'Mumbai', date: '2026-12-19', price: 34000, art: 'Racecourse turf, festival stage and towers' }
    ]
  };

  /* ---------------- single shared state ---------------- */

  var state = {
    market: 'MX',
    approved: false,
    limit: MARKETS.MX.limit,
    term: 6,
    purchases: [],
    profile: null
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- money / math / dates ---------------- */

  var LOCALES = { MXN: 'es-MX', INR: 'en-IN', USD: 'en-US' };

  function formatMoney(amount, currency, fractionDigits) {
    var fd = (fractionDigits == null) ? (currency === 'USD' ? 2 : 0) : fractionDigits;
    return new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fd,
      maximumFractionDigits: fd
    }).format(amount);
  }

  /* The rupee sign is unambiguous; "$" is not, so MXN and USD carry the code. */
  function formatMoneyCode(amount, currency, fractionDigits) {
    var s = formatMoney(amount, currency, fractionDigits);
    return currency === 'INR' ? s : s + ' ' + currency;
  }

  /* The parts always sum back to the total. The last one absorbs the remainder. */
  function splitInstalments(total, n, decimals) {
    var f = Math.pow(10, decimals == null ? 2 : decimals);
    var units = Math.round(total * f);
    var base = Math.floor(units / n);
    var parts = [];
    for (var i = 0; i < n - 1; i++) parts.push(base / f);
    parts.push((units - base * (n - 1)) / f);
    return parts;
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseISO(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addMonths(date, n) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  }
  function formatDate(d) {
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function formatShort(d) {
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  function usdOf(ev, market) {
    if (typeof ev.usd === 'number') return ev.usd;
    return Math.round((ev.price / MARKETS[market].fx) * 100) / 100;
  }

  /* ---------------- theme ---------------- */

  var themeBtn = $('#theme-btn');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#08202E' : '#F4F8F8');
  }
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  themeBtn.addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- nav ---------------- */

  var burger = $('#burger');
  var navLinks = $('#nav-links');
  burger.addEventListener('click', function () {
    var open = navLinks.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------------- 1. hero ticket + the split ---------------- */

  var heroChips = $('#hero-chips');
  var heroWrap = $('#hero-ticket');

  function heroEvent() { return EVENTS[state.market][0]; }

  function renderHero(animate) {
    var m = MARKETS[state.market];
    var ev = heroEvent();
    var usd = usdOf(ev, state.market);
    var n = state.term;

    $('#hero-event').textContent = ev.tour.toUpperCase() + ' — ' + ev.venue + ' · ' + formatShort(parseISO(ev.date));
    $('#hero-price').textContent = formatMoney(usd, 'USD');
    $('#hero-alt').textContent = formatMoneyCode(ev.price, m.currency);

    var usdParts = splitInstalments(usd, n, 2);
    var locParts = splitInstalments(ev.price, n, 0);

    heroChips.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'chip';
      c.innerHTML =
        '<span class="chip__n">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
        '<span class="chip__v">' + formatMoney(usdParts[i], 'USD') + '</span>' +
        '<span class="chip__alt">' + formatMoney(locParts[i], m.currency) + '</span>';
      heroChips.appendChild(c);
    }

    $('#hero-summary').textContent =
      n + ' × ' + formatMoneyCode(usdParts[0], 'USD') + '  ·  ' +
      formatMoneyCode(Math.floor(ev.price / n), m.currency) + ' each';

    $('#hero-note').textContent =
      'Paid to the organizer today: ' + formatMoney(usd, 'USD') +
      ' · Paid by the fan over ' + n + ' months.';

    $$('.seg__btn[data-term]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.dataset.term === n));
    });

    if (animate) splitChips();
  }

  /* animation 1 of 3: the price splits into instalment chips */
  function splitChips() {
    if (reduceMotion) return;
    var chips = $$('.chip', heroChips);
    if (!chips.length) return;
    var r = heroChips.getBoundingClientRect();
    var cx = r.left + r.width / 2;

    chips.forEach(function (c) {
      var b = c.getBoundingClientRect();
      c.style.transition = 'none';
      c.style.opacity = '0';
      c.style.transform = 'translateX(' + (cx - (b.left + b.width / 2)).toFixed(1) + 'px)';
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        chips.forEach(function (c, i) {
          c.style.transition =
            'transform .5s cubic-bezier(.2,.72,.28,1) ' + (i * 40) + 'ms, opacity .5s ease ' + (i * 40) + 'ms';
          c.style.opacity = '1';
          c.style.transform = 'translateX(0)';
        });
      });
    });

    /* Belt and braces: a backgrounded tab pauses transitions, so drop the
       inline styles once the split is over and let the chips stand on CSS. */
    setTimeout(function () {
      chips.forEach(function (c) { c.style.cssText = ''; });
    }, chips.length * 40 + 700);
  }

  heroWrap.addEventListener('click', function (e) {
    var b = e.target.closest('.seg__btn[data-term]');
    if (!b) return;
    state.term = +b.dataset.term;
    renderHero(true);
  });

  /* ---------------- 3 + 5. catalogue ---------------- */

  var cards = $('#cards');

  function renderCatalogue() {
    var m = MARKETS[state.market];
    var list = EVENTS[state.market];
    cards.innerHTML = '';

    list.forEach(function (ev, i) {
      var over = ev.price > state.limit;                      // computed, never hardcoded
      var bought = state.purchases.some(function (p) {
        return p.market === state.market && p.tour === ev.tour;
      });
      var per = splitInstalments(ev.price, 6, 2)[0];

      var card = document.createElement('article');
      card.className = 'card' + (i === 0 ? ' card--feature' : (i === list.length - 1 ? ' card--wide' : ''));

      var status = '';
      if (state.approved) {
        if (bought) status = '<span class="badge badge--ok">Seat secured</span>';
        else if (over) status = '<span class="badge badge--no">Above your limit</span>';
        else status = '<span class="badge badge--ok">Pre-approved · from ' + formatMoney(per, m.currency, 2) + '/mo</span>';
      }

      var cta;
      if (!state.approved) {
        cta = '<span class="tip"><button type="button" class="btn btn--line btn--sm" disabled>Finance this ticket</button>' +
              '<span class="tip__msg" role="tooltip">Run a soft check first</span></span>';
      } else if (over) {
        cta = '<button type="button" class="btn btn--line btn--sm" disabled>Above your limit</button>' +
              '<p class="card__deny">Your lending partner set your limit at ' + formatMoneyCode(state.limit, m.currency) +
              '. This isn\'t Kammy\'s call.</p>';
      } else {
        cta = '<button type="button" class="btn btn--fill btn--sm" data-buy="' + i + '">Buy in instalments</button>';
      }

      card.innerHTML =
        '<div class="img-placeholder"><span>' + ev.art + '</span></div>' +
        '<div class="card__body">' +
          '<h3 class="card__tour">' + ev.tour + '</h3>' +
          '<p class="card__meta">' + ev.venue + ' · ' + ev.city + ' · ' + formatDate(parseISO(ev.date)) + '</p>' +
          '<p class="card__price">' + formatMoney(ev.price, m.currency) + '</p>' +
          '<p class="card__usd">' + formatMoney(usdOf(ev, state.market), 'USD') + ' USD</p>' +
          '<p class="card__from">from ' + formatMoney(per, m.currency, 2) + '/mo · 6 months</p>' +
          '<div class="card__status">' + status + '</div>' +
          '<div class="card__cta">' + cta + '</div>' +
        '</div>';

      cards.appendChild(card);
    });
  }

  cards.addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]');
    if (b) openModal(+b.dataset.buy);
  });

  /* ---------------- market toggle — re-renders the whole page ---------------- */

  function setMarket(mk) {
    if (state.market === mk) return;
    state.market = mk;
    state.limit = MARKETS[mk].limit;
    $$('[data-market-toggle] .market__btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.market === mk));
    });
    renderHero(true);
    renderCatalogue();
    renderPartnerCopy();
  }

  $$('[data-market-toggle]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.market__btn');
      if (b) setMarket(b.dataset.market);
    });
  });

  /* ---------------- 4. pre-approval ---------------- */

  var preForm = $('#pre-form');
  var preStatus = $('#pre-status');
  var preStatusLine = $('#pre-status-line');
  var preResult = $('#pre-result');

  function renderPartnerCopy() {
    var m = MARKETS[state.market];
    $('#pre-partner-note').textContent = 'Your soft check is routed to the ' + m.partner + '. Kammy runs the check with the partner — the partner decides.';
    $('#f-income-label').textContent = 'Monthly income (' + m.currency + ')';
    $('#f-income').placeholder = m.incomeHint;
    $('#pre-partner').textContent = m.partner;
    $('#pre-limit').innerHTML = formatMoney(m.limit, m.currency) +
      (m.currency === 'INR' ? '' : ' <span class="result__cur">' + m.currency + '</span>');
    $('#pre-limit-alt').textContent = formatMoney(m.limitUSD, 'USD', 0) + ' USD';
  }

  var STATUS_LINES = [
    'Sending to lending partner…',
    'Soft check — no impact on your credit score',
    'Partner underwriting…'
  ];

  preForm.addEventListener('submit', function (e) {
    e.preventDefault();
    state.profile = {
      name: $('#f-name').value.trim(),
      income: +$('#f-income').value || 0,
      employment: $('#f-emp').value
    };

    preForm.hidden = true;
    preResult.hidden = true;
    preStatus.hidden = false;

    var i = 0;
    preStatusLine.textContent = STATUS_LINES[0];
    var tick = setInterval(function () {
      i++;
      if (i < STATUS_LINES.length) preStatusLine.textContent = STATUS_LINES[i];
    }, 600);

    setTimeout(function () {
      clearInterval(tick);
      preStatus.hidden = true;
      preResult.hidden = false;
      state.approved = true;
      state.limit = MARKETS[state.market].limit;
      renderPartnerCopy();
      renderCatalogue();
    }, 1800);
  });

  $('#pre-reset').addEventListener('click', function () {
    state.approved = false;
    state.purchases = [];
    preResult.hidden = true;
    preForm.hidden = false;
    renderCatalogue();
    $('#f-name').focus();
  });

  /* ---------------- 6. purchase modal ---------------- */

  var modal = $('#modal');
  var stepConfirm = $('#step-confirm');
  var stepProcessing = $('#step-processing');
  var stepDone = $('#step-done');
  var lastFocused = null;
  var current = null;

  function focusables() {
    return $$('button, [href], input, select, textarea', modal).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function openModal(index) {
    current = EVENTS[state.market][index];
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    stepConfirm.hidden = false;
    stepProcessing.hidden = true;
    stepDone.hidden = true;
    renderConfirm();
    var f = focusables();
    if (f.length) f[0].focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  function renderConfirm() {
    var m = MARKETS[state.market];
    var n = state.term;
    var parts = splitInstalments(current.price, n, 2);

    $('#modal-title').textContent = current.tour;
    $('#modal-venue').textContent = current.venue + ' · ' + current.city + ' · ' + formatDate(parseISO(current.date));
    $('#modal-price').textContent = formatMoney(current.price, m.currency);
    $('#modal-price-alt').textContent = formatMoney(usdOf(current, state.market), 'USD') + ' USD';
    $('#modal-inst').textContent = n + ' × ' + formatMoneyCode(parts[0], m.currency, 2);
    $('#modal-line').textContent =
      'Your lending partner pays the organizer ' + formatMoneyCode(current.price, m.currency) +
      ' today. You repay the partner over ' + n + ' months. Kammy\'s fee to you: $0.';

    $$('.seg__btn[data-mterm]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.dataset.mterm === n));
    });
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeModal(); return; }
    var t = e.target.closest('.seg__btn[data-mterm]');
    if (t) {
      state.term = +t.dataset.mterm;
      renderConfirm();
      renderHero(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  $('#modal-confirm').addEventListener('click', function () {
    stepConfirm.hidden = true;
    stepProcessing.hidden = false;
    setTimeout(function () {
      stepProcessing.hidden = true;
      stepDone.hidden = false;
      state.purchases.push({ market: state.market, tour: current.tour, term: state.term, price: current.price });
      renderSchedule();
      renderCatalogue();
      $('#modal-to-sim').focus();
    }, 900);
  });

  function renderSchedule() {
    var m = MARKETS[state.market];
    var n = state.term;
    var parts = splitInstalments(current.price, n, 2);
    var today = new Date();
    var box = $('#sched');

    $('#done-event').textContent = current.tour + ' · ' + current.venue + ' · ' + formatDate(parseISO(current.date));
    box.innerHTML = '';

    parts.forEach(function (amt, i) {
      var row = document.createElement('div');
      row.className = 'sched__row';
      row.innerHTML =
        '<span class="sched__date">' + formatDate(addMonths(today, i)) + '</span>' +
        '<span class="sched__amt">' + formatMoney(amt, m.currency, 2) + '</span>' +
        (i === 0
          ? '<span class="pill pill--paid">Paid</span>'
          : '<span class="pill pill--sched">Scheduled</span>');

      if (!reduceMotion) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(6px)';
        row.style.transition = 'opacity .2s ease ' + (i * 60) + 'ms, transform .2s ease ' + (i * 60) + 'ms';
      }
      box.appendChild(row);
    });

    if (!reduceMotion) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          $$('.sched__row', box).forEach(function (r) {
            r.style.opacity = '1';
            r.style.transform = 'none';
          });
        });
      });
      setTimeout(function () {
        $$('.sched__row', box).forEach(function (r) { r.style.cssText = ''; });
      }, parts.length * 60 + 500);
    }
  }

  $('#modal-to-sim').addEventListener('click', function () {
    closeModal();
    $('#simulator').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------------- 7. onsale simulator — one clock ---------------- */

  var SIM_END = 47.0;
  var TRAD = [
    { t: 0.0, x: 'Queue position #4,182' },
    { t: 8.0, x: 'Queue position #1,905' },
    { t: 16.0, x: 'Enter card details' },
    { t: 24.0, x: 'Card number · expiry · CVV' },
    { t: 33.0, x: '3-D Secure — SMS code sent' },
    { t: 41.0, x: 'Verifying with your bank…' },
    { t: 47.0, x: 'SOLD OUT', kind: 'alert' }
  ];
  var KAMMY = [
    { t: 0.0, x: 'Pre-approved before doors — limit ready' },
    { t: 4.0, x: 'Queue position #4,182' },
    { t: 9.0, x: 'One tap — instalments already set' },
    { t: 12.0, x: 'SEAT SECURED', kind: 'ok', sub: 'Organizer paid $215 · Fan pays 6 × $35.83' }
  ];

  var clockEl = $('#sim-clock');
  var logTrad = $('#log-trad');
  var logKammy = $('#log-kammy');
  var panelTrad = $('#sim-trad');
  var deadEl = $('#sim-dead');
  var summaryEl = $('#sim-summary');

  var simTimer = 0, simT0 = 0, emitted = { trad: 0, kammy: 0 }, simAutoRan = false;

  function clockText(t) {
    var s = t.toFixed(1);
    return s.length < 4 ? '0' + s : s;
  }

  function pushLog(list, step) {
    var li = document.createElement('li');
    li.className = 'log__row' + (step.kind === 'alert' ? ' log__row--alert' : step.kind === 'ok' ? ' log__row--ok' : '');
    li.innerHTML =
      '<span class="log__t">' + clockText(step.t) + '</span>' +
      '<span class="log__x">' + step.x + '</span>' +
      (step.sub ? '<span class="log__sub">' + step.sub + '</span>' : '');
    list.appendChild(li);
  }

  function simReset() {
    clearInterval(simTimer);
    simTimer = 0;
    emitted.trad = 0;
    emitted.kammy = 0;
    logTrad.innerHTML = '';
    logKammy.innerHTML = '';
    clockEl.textContent = '00.0';
    panelTrad.classList.remove('is-dead');
    deadEl.hidden = true;
    summaryEl.hidden = true;
  }

  /* One timer drives both panels. Elapsed time comes from the wall clock,
     so a throttled or backgrounded tab never lets the two sides desync. */
  function simTick() {
    var t = (Date.now() - simT0) / 1000;
    if (t > SIM_END) t = SIM_END;
    clockEl.textContent = clockText(t);

    while (emitted.trad < TRAD.length && t >= TRAD[emitted.trad].t) {
      pushLog(logTrad, TRAD[emitted.trad]);
      if (TRAD[emitted.trad].kind === 'alert') panelTrad.classList.add('is-dead');
      emitted.trad++;
    }
    while (emitted.kammy < KAMMY.length && t >= KAMMY[emitted.kammy].t) {
      pushLog(logKammy, KAMMY[emitted.kammy]);
      emitted.kammy++;
    }

    if (emitted.kammy === KAMMY.length) {
      deadEl.hidden = false;
      deadEl.textContent = 'Finished ' + (t - 12).toFixed(1) + 's ago — still waiting on the other queue.';
    }

    if (t >= SIM_END) {
      clearInterval(simTimer);
      simTimer = 0;
      summaryEl.hidden = false;
    }
  }

  /* Start always restarts from 00.0 — a demo gets re-run a lot. */
  function simStartRun() {
    simReset();
    simT0 = Date.now();
    simTick();
    simTimer = setInterval(simTick, 50);
  }

  $('#sim-start').addEventListener('click', simStartRun);
  $('#sim-reset').addEventListener('click', simReset);

  /* ---------------- reveal on scroll + simulator autostart ---------------- */

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (!reduceMotion) en.target.style.transitionDelay = (n * 60) + 'ms';
        en.target.classList.add('is-in');
        n++;
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    var simIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !simAutoRan) {
          simAutoRan = true;
          simStartRun();
          simIO.disconnect();
        }
      });
    }, { threshold: 0.35 });
    simIO.observe($('#simulator'));
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- boot ---------------- */

  renderHero(false);
  renderCatalogue();
  renderPartnerCopy();
  setTimeout(function () { renderHero(true); }, 600);
})();
