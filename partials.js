/* NRIin.com runtime — one file powers every page.
   Header/footer HTML is baked into each page by scripts/build.mjs; this file adds behaviour:
   consent-aware analytics, lead capture (inbox never in page source), ads, search, menu, India clock,
   live INR rates, sharing, donations, cookie notice, exit-intent offer and the mobile sticky CTA.
   Edit only the CONFIG block below. */
(function () {
  'use strict';

  // ============================================================
  // CONFIG — the only values you ever need to edit.
  // Anything still containing 'X' (or left empty) stays switched off.
  // ============================================================
  var CONFIG = {
    GA4_ID: 'G-XXXXXXXXXX',            // analytics.google.com → Admin → Data streams → Measurement ID
    CLARITY_ID: 'XXXXXXXXXX',          // clarity.microsoft.com → project ID
    WHATSAPP_NUMBER: 'XXXXXXXXXXXX',   // country code + number, digits only (shown on /get-help when set)
    WHATSAPP_MESSAGE: 'Hi NRIin, I need help investing in India from abroad.',
    ADSENSE_CLIENT: 'ca-pub-6620975821265271',
    // Optional manual ad units (AdSense → Ads → By ad unit). Auto Ads works without these.
    AD_SLOTS: { 'in-article': '', 'display': '', 'sidebar': '' },
    // Optional: the random alias FormSubmit gives you after activation (e.g. 'a1b2c3d4e5f6...').
    FORM_ALIAS: '',
    // Donations — a button appears on /support only when its value is filled.
    DONATE: { paypal: '', stripe: '', buymeacoffee: '', kofi: '', upi: '', upiName: 'NRIin' },
    // Social and community links — shown on /support and /updates when filled.
    SOCIAL: { youtube: '', x: '', linkedin: '', instagram: '', telegram: '', whatsappChannel: '' },
    SPONSOR_URL: 'https://web.works/contact',
    FX_API: 'https://open.er-api.com/v6/latest/USD'
  };

  var NI = window.NI = window.NI || {};
  NI.config = CONFIG;
  var d = document, w = window;
  var real = function (v) { return v && String(v).indexOf('X') === -1; };
  var $ = NI.$ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = NI.$$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var ls = NI.ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var esc = NI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  NI.COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Australia', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Germany', 'Netherlands', 'Ireland', 'France', 'Switzerland', 'New Zealand', 'Hong Kong', 'Japan', 'Malaysia', 'South Africa', 'Kenya', 'Other country'];

  // ---------------- consent + analytics ----------------
  var consent = ls.get('ni_consent'); // 'all' | 'necessary' | null
  function loadAnalytics() {
    if (real(CONFIG.GA4_ID) && !w.gtag) {
      var g = d.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA4_ID; d.head.appendChild(g);
      w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date()); w.gtag('config', CONFIG.GA4_ID, { anonymize_ip: true });
    }
    if (real(CONFIG.CLARITY_ID) && !w.clarity) {
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(w, d, 'clarity', 'script', CONFIG.CLARITY_ID);
    }
  }
  if (consent === 'all') loadAnalytics();
  if (consent === 'necessary') { (w.adsbygoogle = w.adsbygoogle || []).requestNonPersonalizedAds = 1; }
  var track = NI.track = function (name, params) { try { if (w.gtag) w.gtag('event', name, params || {}); } catch (e) {} };

  // ---------------- attribution (first touch) ----------------
  (function () {
    if (ls.get('ni_src')) return;
    var q = new URLSearchParams(location.search), src = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'ref'].forEach(function (k) { if (q.get(k)) src[k] = q.get(k); });
    src.landing = location.pathname; src.referrer = d.referrer || '(direct)';
    ls.set('ni_src', JSON.stringify(src));
  })();

  // ---------------- lead engine ----------------
  // The inbox address is never written in page source; it is assembled only at the moment a form is sent.
  var _r = [109, 111, 99, 46, 108, 105, 97, 109, 103, 64, 49, 97, 115, 107, 114, 111, 119, 98, 101, 119];
  function endpoint() { return 'https://formsubmit.co/ajax/' + (CONFIG.FORM_ALIAS || String.fromCharCode.apply(null, _r.slice().reverse())); }
  function istNow() { try { return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); } catch (e) { return new Date().toISOString(); } }
  function score(f) {
    var s = 0, amt = String(f.amount || '');
    if (/1M|250k/i.test(amt)) s += 3; else if (/50k/i.test(amt)) s += 2; else if (/10k/i.test(amt)) s += 1;
    if (/week|month|now|urgent/i.test(String(f.timeline || ''))) s += 2;
    if (/pfic|tax|gift|advis|portfolio|repatriat|property/i.test(String(f.need || ''))) s += 1;
    if (f.whatsapp || f.phone) s += 1;
    return s >= 5 ? 'HOT' : s >= 3 ? 'WARM' : 'NEW';
  }
  NI.send = function (fields, type, opts) {
    type = type || 'lead'; opts = opts || {};
    if (fields._honey) return Promise.resolve({ ok: true, spam: true });
    var key = type + '|' + (fields.email || fields.whatsapp || fields.name || '');
    var last = (ls.get('ni_last') || '').split('#');
    if (last[0] === key && Date.now() - (+last[1] || 0) < 15000) return Promise.resolve({ ok: true, dup: true });
    var src = {}; try { src = JSON.parse(ls.get('ni_src') || '{}'); } catch (e) {}
    var data = {};
    Object.keys(fields).forEach(function (k) { if (k !== '_honey' && fields[k] !== '' && fields[k] != null) data[k] = fields[k]; });
    var tag = /^(lead|kyc|path|pfic|tax|docs|expert)$/.test(type) ? score(data) : type.toUpperCase();
    data._subject = '[NRIin] ' + tag + ' · ' + (data.subject || data.need || type) + (data.country ? ' · ' + data.country : '') + (data.name ? ' · ' + data.name : '');
    data._template = 'table'; data._captcha = 'false';
    if (opts.autoresponse && data.email) data._autoresponse = opts.autoresponse;
    data.lead_type = type; data.page = location.href; data.page_title = d.title; data.submitted_ist = istNow();
    data.first_touch = [src.utm_source, src.utm_medium, src.utm_campaign, src.ref].filter(Boolean).join(' / ') || src.referrer || '';
    data.landing_page = src.landing || '';
    return fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        ls.set('ni_last', key + '#' + Date.now());
        track('generate_lead', { lead_type: type, quality: tag, country: data.country || '' });
        return { ok: true };
      })
      .catch(function (e) {
        var q = []; try { q = JSON.parse(ls.get('ni_q') || '[]'); } catch (x) {}
        q.push({ f: fields, t: type, o: opts, at: Date.now() }); ls.set('ni_q', JSON.stringify(q.slice(-5)));
        return { ok: false, error: String(e && e.message || e) };
      });
  };
  // retry anything that failed to send on an earlier visit
  setTimeout(function () {
    var q = []; try { q = JSON.parse(ls.get('ni_q') || '[]'); } catch (e) {}
    if (!q.length || !navigator.onLine) return;
    ls.set('ni_q', '[]');
    q.forEach(function (it, i) { setTimeout(function () { NI.send(it.f, it.t, it.o); }, i * 3000); });
  }, 5000);

  NI.thanks = function (name, extra) {
    return '<div class="thanks"><div class="stamp ok hit"><b>Received</b><small>NRIin desk</small></div><p><b>Thank you' + (name ? ', ' + esc(name) : '') + '.</b> We have your request and will reply by email, usually within one business day (India or North America time).</p>' + (extra || '') + '</div>';
  };

  function collect(form) {
    var fd = new FormData(form), out = {};
    fd.forEach(function (v, k) { v = String(v).trim(); if (out[k]) out[k] += ', ' + v; else out[k] = v; });
    if (form.dataset.subject && !out.subject) out.subject = form.dataset.subject;
    return out;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || ''); }

  function bindForms() {
    $$('form[data-ni-form]').forEach(function (form) {
      if (form._ni) return; form._ni = 1;
      var msg = $('.form-msg', form);
      var say = function (t, cls) { if (msg) { msg.textContent = t; msg.className = 'form-msg ' + (cls || ''); } };
      // multi-step
      var steps = $$('.ms-step', form), bar = $('.ms-progress', form), cur = 0;
      function show(i) {
        steps.forEach(function (s, j) { s.hidden = j !== i; });
        if (bar) $$('span', bar).forEach(function (s, j) { s.classList.toggle('on', j <= i); });
        cur = i;
        var f = steps[i] && $('input,select,textarea', steps[i]); if (f && i > 0) f.focus({ preventScroll: true });
      }
      function stepValid(i) {
        var ok = true;
        $$('input,select,textarea', steps[i]).forEach(function (el) { if (ok && !el.checkValidity()) { el.reportValidity(); ok = false; } });
        return ok;
      }
      if (steps.length) {
        show(0);
        form.addEventListener('click', function (e) {
          var n = e.target.closest('[data-next]'), p = e.target.closest('[data-prev]');
          if (n) { e.preventDefault(); if (stepValid(cur)) show(Math.min(cur + 1, steps.length - 1)); }
          if (p) { e.preventDefault(); show(Math.max(cur - 1, 0)); }
        });
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (steps.length && cur < steps.length - 1) { if (stepValid(cur)) show(cur + 1); return; }
        if (!form.checkValidity()) { var bad = $(':invalid', form); if (bad) bad.reportValidity(); say('Please complete the highlighted field.', 'err'); return; }
        var f = collect(form);
        if (f.email && !validEmail(f.email)) { say('That email address looks incomplete.', 'err'); return; }
        var btn = $('button[type=submit]', form); if (btn) btn.disabled = true;
        say('Sending…');
        var type = form.getAttribute('data-ni-form');
        var auto = form.dataset.autoresponse || (type === 'newsletter' ? 'Thanks for subscribing to NRIin rule-change alerts. You will hear from us only when something changes for NRI investors. Free tools: https://nriin.com/kyc-checker and https://nriin.com/path-finder' : '');
        if (type === 'checklist') auto = 'Here is your free NRI investing paperwork checklist: https://nriin.com/checklist  (print it or save as PDF). Need help with a stuck KYC or account? https://nriin.com/get-help';
        NI.send(f, type, { autoresponse: auto }).then(function (r) {
          if (btn) btn.disabled = false;
          if (r.ok) {
            if (form.dataset.keep) { form.reset(); say(form.dataset.okmsg || 'Done. Check your inbox.', 'ok'); return; }
            var box = d.createElement('div'); box.innerHTML = NI.thanks(f.name, form.dataset.thanks ? '<p>' + esc(form.dataset.thanks) + '</p>' : '');
            form.replaceWith(box);
          } else {
            say('We could not send that just now — it is saved and will retry automatically on your next visit.', 'err');
          }
        });
      });
    });
  }
  NI.bindForms = bindForms;

  function prefill() {
    var q = new URLSearchParams(location.search);
    ['need', 'country', 'status', 'from', 'topic', 'amc', 'kyc', 'email_ok', 'product', 'money', 'repat'].forEach(function (k) {
      var v = q.get(k); if (!v) return;
      $$('[name="' + k + '"]').forEach(function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') { if (el.value === v) el.checked = true; }
        else if (el.tagName === 'SELECT') { var o = $$('option', el).filter(function (x) { return x.value === v || x.textContent === v; })[0]; if (o) el.value = o.value || o.textContent; }
        else el.value = v;
      });
    });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-prefill]'); if (!b) return;
      var parts = b.getAttribute('data-prefill').split('=');
      var el = $('[name="' + parts[0] + '"]'); if (el) { el.value = parts[1]; }
    });
  }

  function countries() {
    $$('select[data-ni-countries]').forEach(function (s) {
      if (s.options.length > 2) return;
      s.insertAdjacentHTML('beforeend', NI.COUNTRIES.map(function (c) { return '<option>' + c + '</option>'; }).join(''));
    });
  }

  // ---------------- ads ----------------
  function ads() {
    $$('.ad-slot[data-ad]').forEach(function (el) {
      var slot = CONFIG.AD_SLOTS[el.getAttribute('data-ad')];
      if (!slot) { el.classList.add('off'); return; }
      el.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + CONFIG.ADSENSE_CLIENT + '" data-ad-slot="' + esc(slot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  // ---------------- menu, search ----------------
  function menu() {
    var b = $('[data-ni-menu]'), m = $('#mnav'); if (!b || !m) return;
    b.addEventListener('click', function () { var open = m.hidden; m.hidden = !open; b.setAttribute('aria-expanded', String(open)); });
  }
  var idx = null;
  function searchUI() {
    $$('[data-ni-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
    d.addEventListener('keydown', function (e) { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((d.activeElement || {}).tagName || '')) { e.preventDefault(); openSearch(); } });
    var page = $('#search-page');
    if (page) { var q = new URLSearchParams(location.search).get('q') || ''; var inp = $('input', page); inp.value = q; run(inp, $('.sr-results', page)); inp.addEventListener('input', function () { run(inp, $('.sr-results', page)); }); }
  }
  function load() { return idx ? Promise.resolve(idx) : fetch('/data/search-index.json').then(function (r) { return r.json(); }).then(function (j) { idx = j; return j; }).catch(function () { return []; }); }
  function run(inp, out) {
    var q = inp.value.trim().toLowerCase();
    load().then(function (list) {
      if (!q) { out.innerHTML = '<p class="muted">Try “KYC on hold”, “PFIC”, “NRO repatriation” or “Canada”.</p>'; return; }
      var terms = q.split(/\s+/);
      var hits = list.map(function (p) { var hay = (p.t + ' ' + p.d + ' ' + p.k).toLowerCase(); var s = 0; terms.forEach(function (t) { if (hay.indexOf(t) > -1) s += (p.t.toLowerCase().indexOf(t) > -1 ? 3 : 1); }); return { p: p, s: s }; })
        .filter(function (x) { return x.s >= terms.length; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
      out.innerHTML = hits.length ? hits.map(function (h) { return '<a href="' + esc(h.p.u) + '"><b>' + esc(h.p.t) + '</b><small>' + esc(h.p.k) + ' — ' + esc(h.p.d) + '</small></a>'; }).join('') : '<p class="muted">Nothing matched. Ask us directly on the <a href="/get-help">help page</a>.</p>';
    });
  }
  function openSearch() {
    var o = d.createElement('div'); o.className = 'overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Search');
    o.innerHTML = '<div class="overlay-box"><button type="button" class="icon-btn overlay-close" aria-label="Close search">✕</button><label class="sr" for="ni-sq">Search NRIin</label><input id="ni-sq" class="field" type="search" placeholder="Search tools, guides and countries" autocomplete="off"><div class="sr-results" style="margin-top:10px"></div></div>';
    d.body.appendChild(o);
    var inp = $('input', o), out = $('.sr-results', o);
    inp.focus(); run(inp, out);
    inp.addEventListener('input', function () { run(inp, out); });
    var close = function () { o.remove(); d.removeEventListener('keydown', k); };
    var k = function (e) { if (e.key === 'Escape') close(); };
    d.addEventListener('keydown', k);
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('.overlay-close')) close(); });
  }

  // ---------------- India clock + live rates ----------------
  function clock() {
    var els = $$('[data-ni-ist]'); if (!els.length) return;
    var f = function () { var t; try { t = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }); } catch (e) { t = ''; } els.forEach(function (el) { el.textContent = t; }); };
    f(); setInterval(f, 30000);
  }
  NI.fx = function () {
    var cached = null; try { cached = JSON.parse(ls.get('ni_fx') || 'null'); } catch (e) {}
    if (cached && Date.now() - cached.at < 6 * 3600e3) return Promise.resolve(cached.r);
    return fetch(CONFIG.FX_API).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.rates || !j.rates.INR) throw new Error('no rates');
      var out = {}; Object.keys(j.rates).forEach(function (c) { out[c] = j.rates.INR / j.rates[c]; });
      out._time = j.time_last_update_utc || new Date().toUTCString();
      ls.set('ni_fx', JSON.stringify({ at: Date.now(), r: out })); return out;
    }).catch(function () { return null; });
  };
  function liveFx() {
    var els = $$('[data-ni-fx]'); if (!els.length) return;
    NI.fx().then(function (r) { if (!r) return; els.forEach(function (el) { var c = el.getAttribute('data-ni-fx'); if (r[c]) el.textContent = r[c] < 10 ? r[c].toFixed(3) : r[c].toFixed(2); }); });
  }

  // ---------------- sharing, video, donations, countdowns ----------------
  function share() {
    $$('[data-ni-share]').forEach(function (box) {
      var u = encodeURIComponent(location.href), t = encodeURIComponent(d.title);
      box.innerHTML = '<span>Share</span><a target="_blank" rel="noopener" href="https://wa.me/?text=' + t + '%20' + u + '">WhatsApp</a><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + u + '">LinkedIn</a><a target="_blank" rel="noopener" href="https://x.com/intent/post?url=' + u + '&text=' + t + '">X</a><a href="mailto:?subject=' + t + '&body=' + u + '">Email</a><button type="button" data-copy>Copy link</button>';
      var c = $('[data-copy]', box); c.addEventListener('click', function () { try { navigator.clipboard.writeText(location.href); c.textContent = 'Copied'; } catch (e) {} });
    });
  }
  function yt() {
    d.addEventListener('click', function (e) {
      var box = e.target.closest('.yt[data-yt]'); if (!box || $('iframe', box)) return;
      box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.getAttribute('data-yt')) + '?autoplay=1&rel=0" title="Video" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      track('video_play', { id: box.getAttribute('data-yt') });
    });
  }
  function donations() {
    var D = CONFIG.DONATE, any = false;
    $$('[data-donate]').forEach(function (el) {
      var k = el.getAttribute('data-donate'), v = D[k];
      if (!v) { el.hidden = true; return; }
      any = true; el.hidden = false;
      if (k === 'upi') el.href = 'upi://pay?pa=' + encodeURIComponent(v) + '&pn=' + encodeURIComponent(D.upiName || 'NRIin') + '&cu=INR';
      else if (k === 'paypal') el.href = /^https?:/.test(v) ? v : 'https://www.paypal.com/paypalme/' + v;
      else if (k === 'buymeacoffee') el.href = /^https?:/.test(v) ? v : 'https://www.buymeacoffee.com/' + v;
      else if (k === 'kofi') el.href = /^https?:/.test(v) ? v : 'https://ko-fi.com/' + v;
      else el.href = v;
      el.addEventListener('click', function () { track('donate_click', { method: k }); });
    });
    $$('[data-donate-fallback]').forEach(function (el) { el.hidden = any; });
    var soc = $('[data-ni-social]');
    if (soc) { var h = Object.keys(CONFIG.SOCIAL).filter(function (k) { return CONFIG.SOCIAL[k]; }).map(function (k) { return '<a class="topic" target="_blank" rel="noopener" href="' + esc(CONFIG.SOCIAL[k]) + '">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</a>'; }).join(''); if (h) soc.innerHTML = h; }
    var wa = $$('[data-ni-whatsapp]');
    wa.forEach(function (a) { if (real(CONFIG.WHATSAPP_NUMBER)) { a.hidden = false; a.href = 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(CONFIG.WHATSAPP_MESSAGE); } else a.hidden = true; });
  }
  function countdowns() {
    var today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); today.setHours(0, 0, 0, 0);
    $$('[data-countdown]').forEach(function (el) {
      var t = new Date(el.getAttribute('data-countdown') + 'T00:00:00'); var n = Math.round((t - today) / 864e5);
      el.textContent = n > 1 ? 'in ' + n + ' days' : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'in effect';
    });
  }

  // ---------------- cookie notice, exit intent, sticky CTA ----------------
  function cookies() {
    if (consent) return;
    var c = d.createElement('div'); c.className = 'cookie'; c.setAttribute('role', 'region'); c.setAttribute('aria-label', 'Cookie notice');
    c.innerHTML = '<p>We use cookies to run this site, measure visits and show ads (Google AdSense may use cookies to personalise ads). See our <a href="/cookie-policy">cookie policy</a>.</p><div class="btn-row"><button type="button" class="btn btn-stamp btn-sm" data-c="all">Accept all</button><button type="button" class="btn btn-line btn-sm" data-c="necessary">Necessary only</button></div>';
    d.body.appendChild(c);
    c.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      consent = b.getAttribute('data-c'); ls.set('ni_consent', consent);
      if (consent === 'all') loadAnalytics(); else (w.adsbygoogle = w.adsbygoogle || []).requestNonPersonalizedAds = 1;
      c.remove();
    });
  }
  function exitIntent() {
    if (/^\/(get-help|contact|privacy|terms|disclaimer|cookie-policy|copyright|checklist|support|advertise)/.test(location.pathname)) return;
    if (w.matchMedia('(pointer: coarse)').matches) return;
    var last = +(ls.get('ni_exit') || 0); if (Date.now() - last < 7 * 864e5) return;
    var fired = false;
    d.addEventListener('mouseout', function (e) {
      if (fired || e.relatedTarget || e.clientY > 8) return; fired = true; ls.set('ni_exit', String(Date.now()));
      var o = d.createElement('div'); o.className = 'overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-labelledby', 'xi-h');
      o.innerHTML = '<div class="overlay-box"><button type="button" class="icon-btn overlay-close" aria-label="Close">✕</button><h2 id="xi-h" style="font-size:1.4rem;max-width:22ch">Before you go: the one-page NRI paperwork checklist</h2><p class="muted">Every document, attestation rule and account you need for Indian stocks and mutual funds — free, printable, updated for the December 2026 KYC rules.</p><form data-ni-form="checklist" data-subject="Checklist download" novalidate><div class="fgrid"><div class="fld"><label for="xi-e">Email</label><input id="xi-e" class="field" type="email" name="email" required autocomplete="email"></div><div class="fld"><label for="xi-c">Country you live in</label><select id="xi-c" class="field" name="country" data-ni-countries><option value="">Choose</option></select></div></div><input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="consent" style="margin:12px 0"><input type="checkbox" name="consent" value="yes" required> Email me the checklist and occasional rule-change alerts.</label><button class="btn btn-stamp" type="submit">Email me the checklist</button> <a href="/checklist" style="margin-left:8px">Or open it now</a><p class="form-msg" role="status" aria-live="polite"></p></form></div>';
      d.body.appendChild(o); countries(); bindForms();
      o.addEventListener('click', function (ev) { if (ev.target === o || ev.target.closest('.overlay-close')) o.remove(); });
    });
  }
  function sticky() {
    if (/^\/(get-help|contact)/.test(location.pathname)) return;
    var s = d.createElement('div'); s.className = 'sticky-cta';
    s.innerHTML = '<p>Stuck on KYC, accounts or tax?</p><a class="btn btn-stamp btn-sm" href="/get-help?from=sticky">Get expert help</a>';
    d.body.appendChild(s);
    w.addEventListener('scroll', function () { var on = w.scrollY > 700; s.classList.toggle('on', on); d.body.classList.toggle('has-sticky', on); }, { passive: true });
  }
  function events() {
    d.addEventListener('click', function (e) { var a = e.target.closest('[data-ni-ev]'); if (a) track(a.getAttribute('data-ni-ev')); });
  }

  function init() {
    countries(); menu(); searchUI(); clock(); liveFx(); prefill(); bindForms(); ads(); share(); yt(); donations(); countdowns(); cookies(); exitIntent(); sticky(); events();
    d.dispatchEvent(new CustomEvent('ni:ready'));
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
