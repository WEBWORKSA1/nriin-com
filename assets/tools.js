/* NRIin.com tools — every calculator and checker runs here, in the browser.
   Nothing typed into a tool leaves the device unless the visitor submits a form.
   Each module activates only when its element is on the page. */
(function () {
  'use strict';
  var NI = window.NI || {}, d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var esc = NI.esc || function (s) { return String(s == null ? '' : s); };
  var val = function (form, name) { var el = form.elements[name]; if (!el) return ''; if (el.length && el[0] && el[0].type === 'radio') { var c = $$('input[name="' + name + '"]:checked', form)[0]; return c ? c.value : ''; } return el.type === 'checkbox' ? (el.checked ? 'yes' : '') : el.value; };
  var num = function (form, name) { var v = parseFloat(val(form, name)); return isFinite(v) ? v : 0; };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var usd = function (n) { return 'US$' + Math.round(n).toLocaleString('en-US'); };
  function stamp(cls, big, small, lg) { return '<div class="stamp ' + cls + (lg ? ' lg' : '') + ' hit"><b>' + esc(big) + '</b><small>' + esc(small) + '</small></div>'; }
  function list(items, cls) { return items.length ? '<' + (cls === 'steps' ? 'ol' : 'ul') + ' class="' + (cls || 'checks') + '">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</' + (cls === 'steps' ? 'ol' : 'ul') + '>' : ''; }
  function plain(html) { var t = d.createElement('div'); t.innerHTML = html.replace(/<li>/g, '\n- ').replace(/<\/(h3|p)>/g, '\n'); return t.textContent.replace(/\n{3,}/g, '\n\n').trim(); }
  function emailForm(type, subject, planText, extra) {
    return '<form class="panel-flat no-print" style="margin-top:18px" data-ni-form="' + type + '" data-subject="' + esc(subject) + '" data-keep="1" data-okmsg="Sent. Check your inbox for your plan." novalidate>' +
      '<h3 style="font-size:1rem">Email this to myself</h3><div class="fgrid"><div class="fld"><label for="em-' + type + '">Email</label><input id="em-' + type + '" class="field" type="email" name="email" required autocomplete="email"></div>' +
      '<div class="fld" style="align-self:end"><button class="btn btn-ink" type="submit">Send it</button></div></div>' +
      (extra || '') + '<input type="hidden" name="plan_summary" value="' + esc(planText.slice(0, 1800)) + '"><input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="consent" style="margin-top:10px"><input type="checkbox" name="consent" value="yes" required> Email me this and occasional rule-change alerts. <a href="/privacy">Privacy</a>.</label><p class="form-msg" role="status" aria-live="polite"></p></form>';
  }
  function finish(box, type, subject, planHtml, helpNeed, country) {
    var text = plain(planHtml);
    box.insertAdjacentHTML('beforeend', '<div class="btn-row no-print" style="margin-top:16px"><a class="btn btn-stamp" href="/get-help?need=' + encodeURIComponent(helpNeed) + '&country=' + encodeURIComponent(country || '') + '&from=' + type + '">Have a specialist do this</a><button class="btn btn-line" type="button" onclick="window.print()">Print or save PDF</button></div>' + emailForm(type, subject, text));
    var f = $('form[data-ni-form]', box);
    if (f) f.dataset.autoresponse = 'Your NRIin plan (' + new Date().toLocaleDateString('en-GB') + '):\n\n' + text.slice(0, 2500) + '\n\nGeneral information, not advice. Full tools: https://nriin.com — Need hands-on help? https://nriin.com/get-help';
    if (NI.bindForms) NI.bindForms();
    if (window.matchMedia('(max-width: 960px)').matches) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (NI.track) NI.track('tool_result', { tool: type });
  }
  var USCA = /United States|Canada/;
  var DIGITAL = '<b>From 3 December 2026</b> (<span data-countdown="2026-12-03"></span>) residents of FATF-compliant countries can complete KYC and video verification entirely from abroad. Ask your broker or registrar when its digital flow goes live. <a href="/guides/sebi-digital-kyc-from-abroad">How it works</a>.';
  function countdowns(root) {
    var today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); today.setHours(0, 0, 0, 0);
    $$('[data-countdown]', root).forEach(function (el) { var n = Math.round((new Date(el.getAttribute('data-countdown') + 'T00:00:00') - today) / 864e5); el.textContent = n > 1 ? 'in ' + n + ' days' : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'now in effect'; });
  }

  // ===================== homepage quick check =====================
  function heroCheck() {
    var box = $('#hero-check'); if (!box) return;
    var st = $('[data-hero-stamp]', box), msg = $('[data-hero-msg]', box), link = $('[data-hero-link]', box);
    function run() {
      var s = ($('input[name="hstatus"]:checked', box) || {}).value, e = ($('input[name="hemail"]:checked', box) || {}).value, c = $('#hcountry').value;
      if (!s) return;
      var usca = USCA.test(c), r;
      if (s === 'validated') r = ['ok', 'Cleared', 'Can invest', usca ? 'You can transact — but only about a dozen fund houses accept residents of ' + c + '. Check the directory before you apply.' : 'You can invest with any fund house or broker. Make sure each folio shows your tax status as NRI.'];
      else if (s === 'registered') r = ['warn', 'Registered', 'Limited', e === 'yes' ? 'The NRI relaxation ended on 30 April 2026. Existing fund houses usually continue; new ones may ask for re-KYC. Upgrade to Validated.' : 'Verify your email by OTP first, then request validation. The relaxation for Registered NRIs ended on 30 April 2026.'];
      else if (s === 'onhold') r = ['stop', 'On hold', 'Blocked', e === 'no' ? 'Most likely cause: your email or mobile was never verified. An email OTP through your KRA usually clears it within days.' : 'Contact details look fine, so check whether your PAN shows as inoperative, then your documents.'];
      else if (s === 'rejected') r = ['stop', 'Rejected', 'Reapply', 'A document was refused. Get the reason from the KRA, fix it and reapply — attestation and name mismatches are the usual culprits.'];
      else r = ['ink', 'Unchecked', 'Check first', 'Look up your status on MF Central with your PAN — it takes two minutes — then come back for the fix.'];
      st.outerHTML = stamp(r[0], r[1], r[2]); st = $('.stamp', box); st.setAttribute('data-hero-stamp', '');
      msg.textContent = r[3];
      link.href = '/kyc-checker?kyc=' + s + (e ? '&email_ok=' + e : '') + (c ? '&country=' + encodeURIComponent(c) : '');
      link.textContent = usca && s === 'validated' ? 'See the full plan and fund houses' : 'See the full fix plan';
    }
    box.addEventListener('change', run);
  }

  // ===================== KYC checker =====================
  function kycTool() {
    var form = $('#kyc-tool'); if (!form) return;
    var out = $('#kyc-result');
    function toggle() { var k = val(form, 'kyc'); $$('[data-if]', form).forEach(function (el) { el.hidden = el.getAttribute('data-if').split(' ').indexOf(k) < 0; }); }
    form.addEventListener('change', toggle); toggle();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = val(form, 'status'), country = val(form, 'country'), kyc = val(form, 'kyc'), reason = val(form, 'reason'), email = val(form, 'email_ok'), aad = val(form, 'aadhaar'), goal = val(form, 'goal');
      if (!country) { $('#k-country').reportValidity && $('#k-country').setCustomValidity('Choose your country'); $('#k-country').reportValidity(); $('#k-country').setCustomValidity(''); return; }
      var usca = USCA.test(country), other = /Other/.test(country);
      var r = { steps: [], notes: [], docs: [] };
      var verifyEmail = 'Verify your <b>email by OTP</b> through your KRA (CVL, CAMS, KFintech, NDML or NSE KRA) or the registrar portal. Overseas mobile numbers often fail SMS verification; email is the reliable channel.';
      var revalidate = 'Ask the KRA (through any fund house, registrar or MF Central) to <b>revalidate</b> your record. It is not automatic.';
      var panFix = 'Check your PAN on the <a href="https://www.incometax.gov.in" target="_blank" rel="noopener">income tax e-filing portal</a>. If it shows <b>inoperative</b>, update your residential status to non-resident with the Income Tax Department (passport, visa or OCI and overseas address). NRIs are exempt from Aadhaar–PAN linking once the status is recorded correctly.';
      var docsFix = 'Resubmit KYC with <b>attested</b> copies: passport' + (status === 'oci' ? ' and OCI card' : '') + ', overseas address proof and PAN — attested by a notary, Indian embassy or consulate, or an Indian bank\'s overseas branch — then complete in-person or video verification.';
      var aadFix = aad === 'linked' ? 'Because your Aadhaar has a working Indian mobile, an <b>Aadhaar-based eKYC</b> is usually the fastest way to reach Validated.' : '';
      if (kyc === 'validated') {
        Object.assign(r, { cls: 'ok', big: 'Validated', small: 'Clear to invest', sum: 'Your KYC is in the best state. Any fund house or broker can onboard you without fresh documents — subject to its own policy for residents of ' + esc(country) + '.' });
        r.steps.push('Confirm each mutual fund folio shows tax status <b>NRI</b> and an NRE or NRO bank mandate (MF Central shows all folios).');
        if (usca) r.steps.push('Check the <a href="/amc-directory">fund houses that accept ' + esc(country) + ' residents</a> before applying anywhere new.');
        if (goal === 'sip') r.steps.push('Register a fresh SIP mandate on your NRE or NRO account; mandates on old resident accounts fail once re-designated.');
        if (goal === 'demat') r.steps.push('Your KYC carries over, but a demat account still needs the broker\'s NRI application, a designated repatriable account and FATCA form. See the <a href="/path-finder">path finder</a>.');
        if (goal === 'redeem') r.steps.push('Redemptions should process normally. Proceeds go to the registered bank mandate; tax is withheld under section 393.');
      } else if (kyc === 'registered') {
        Object.assign(r, { cls: 'warn', big: 'Registered', small: 'Partly cleared', sum: 'Your details are on file but not independently verified. The relaxation that treated NRIs with Registered status as Validated ran only until 30 April 2026. Existing fund houses usually keep serving you; a new fund house or broker may insist on re-KYC.' });
        if (email !== 'yes') r.steps.push(verifyEmail);
        if (aadFix) r.steps.push(aadFix); else r.steps.push('Submit a <b>KYC modification</b> with attested passport' + (status === 'oci' ? ', OCI card' : '') + ' and overseas address proof, so the record can be validated without Aadhaar.');
        r.steps.push(revalidate);
        r.steps.push('Track the status on MF Central every few days until it reads Validated.');
      } else if (kyc === 'onhold' || kyc === 'rejected') {
        var onhold = kyc === 'onhold';
        Object.assign(r, { cls: 'stop', big: onhold ? 'On hold' : 'Rejected', small: onhold ? 'Transactions blocked' : 'Reapply needed', sum: onhold ? 'New purchases are blocked, and redemptions often are too, until the failed item is fixed. Your units stay yours and keep their value.' : 'The KRA refused the application, usually over a defective or mismatched document. You need to fix it and apply again.' });
        if (reason === 'contact' || (reason === 'unknown' && email !== 'yes')) { r.steps.push(verifyEmail); }
        if (reason === 'pan' || reason === 'unknown') r.steps.push(panFix);
        if (reason === 'docs' || reason === 'unknown' || !onhold) r.steps.push(docsFix);
        if (aadFix) r.steps.push(aadFix);
        r.steps.push(revalidate);
        if (goal === 'redeem') r.notes.push('Need the money urgently? Ask the registrar (CAMS or KFintech) whether a redemption can proceed while revalidation is pending. Policies differ, so get the answer in writing.');
      } else if (kyc === 'process') {
        Object.assign(r, { cls: 'ink', big: 'Pending', small: 'Under process', sum: 'The KRA is still checking your documents. Submitting again now usually slows things down.' });
        r.steps.push('Wait 2 to 10 working days and check MF Central again.');
        r.steps.push('If it has been longer, ask the intermediary that submitted it for the KRA reference and any deficiency letter.');
      } else if (kyc === 'none') {
        Object.assign(r, { cls: 'ink', big: 'No KYC', small: 'Start fresh', sum: 'You need a first-time KYC before any fund house or broker can onboard you.' });
        r.steps.push(other ? 'If your country is FATF-compliant, the digital route from abroad applies from 3 December 2026; otherwise use attested copies and in-person verification.' : 'Choose the digital route from abroad (from 3 December 2026) or the courier route with attested copies.');
        r.steps.push('Apply through the broker or fund house you plan to use first — the KYC then works everywhere.');
        r.steps.push('Verify your email by OTP during the process and keep the acknowledgement.');
      } else {
        Object.assign(r, { cls: 'ink', big: 'Unchecked', small: 'Check first', sum: 'Start by looking up your live status — everything else depends on it.' });
        r.steps.push('Go to <a href="https://www.mfcentral.com" target="_blank" rel="noopener">MF Central</a> or <a href="https://www.cvlkra.com" target="_blank" rel="noopener">CVL KRA</a> and enter your PAN.');
        r.steps.push('Note the status and any reason shown, then run this checker again.');
      }
      // documents
      if (kyc !== 'validated' && kyc !== 'process') {
        r.docs = ['Passport valid for six months or more', status === 'oci' ? 'OCI card' : status === 'foreign' ? 'Residence permit or visa' : 'Visa, residence permit or work permit', 'PAN card (operative)', 'Overseas address proof dated within three months', 'Recent photograph and signature', 'Email and mobile for OTP', 'FATCA/CRS self-certification'];
      }
      // contextual notes
      if (usca) r.notes.push('Residents of ' + esc(country) + ' can be onboarded only by a short list of fund houses. <a href="/amc-directory">See who still accepts you</a>.' + (/United States/.test(country) ? ' As a US person, read about <a href="/guides/pfic-indian-mutual-funds">PFIC</a> before buying Indian funds.' : ''));
      if (status === 'returning') r.notes.push('Moving back? Once you are resident again, update tax status to Resident on every folio and re-designate NRE/NRO accounts. See <a href="/guides/returning-nri-rnor">returning NRIs</a>.');
      if (status === 'foreign') r.notes.push('Foreign nationals without OCI can buy listed Indian shares since 12 June 2026, but most fund houses do not onboard them for mutual funds. See the <a href="/path-finder">path finder</a>.');
      if (kyc !== 'validated') r.notes.push(DIGITAL);
      var time = kyc === 'onhold' && (reason === 'contact') ? 'Usually 2–7 days' : reason === 'pan' ? '2–6 weeks (PAN status update)' : kyc === 'validated' ? 'Nothing to wait for' : '1–3 weeks';
      var html = '<div class="result-top">' + stamp(r.cls, r.big, r.small, true) + '<p>' + r.sum + '</p></div>' +
        '<dl class="kv" style="margin-bottom:16px"><dt>New purchases</dt><dd>' + ({ validated: 'Allowed', registered: 'Existing fund houses usually; new ones may refuse', onhold: 'Blocked', rejected: 'Blocked', process: 'Wait', none: 'Not yet', unknown: 'Unknown' }[kyc]) + '</dd><dt>Redemptions</dt><dd>' + ({ validated: 'Allowed', registered: 'Allowed', onhold: 'Often blocked', rejected: 'Blocked until fixed', process: 'Existing holdings unaffected', none: '—', unknown: 'Unknown' }[kyc]) + '</dd><dt>Typical time to fix</dt><dd>' + time + '</dd></dl>' +
        (r.steps.length ? '<h3>Your steps, in order</h3>' + list(r.steps, 'steps') : '') +
        (r.docs.length ? '<h3>Documents to have ready</h3>' + list(r.docs) : '') +
        (r.notes.length ? r.notes.map(function (n) { return '<div class="callout info"><p>' + n + '</p></div>'; }).join('') : '');
      out.innerHTML = html; countdowns(out);
      finish(out, 'kyc', 'KYC fix plan', html, 'Fix KYC / unfreeze a folio', country);
    });
    var q = new URLSearchParams(location.search);
    if (q.get('kyc') && q.get('country')) { toggle(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  }

  // ===================== path finder =====================
  var AMCS = null;
  function amcs() { return AMCS ? Promise.resolve(AMCS) : fetch('/data/amcs.json').then(function (r) { return r.json(); }).then(function (j) { AMCS = j; return j; }).catch(function () { return { amcs: [] }; }); }
  var HOME = {
    'United States': ['FBAR (FinCEN 114) if all foreign accounts together exceed US$10,000 at any time', 'Form 8938 above the FATCA thresholds for your filing status', 'Form 8621 for each Indian mutual fund, ETF, ULIP or pooled GIFT City fund (PFIC)', 'Foreign tax credit (Form 1116) for Indian tax withheld'],
    'Canada': ['Form T1135 if the cost of foreign property exceeds CAD 100,000 at any time', 'Report Indian income and gains in CAD; claim the foreign tax credit', 'Ask a cross-border accountant about any trust reporting for Indian fund units'],
    'United Kingdom': ['Most Indian mutual funds are not UK reporting funds — gains are usually taxed as income', 'Claim foreign tax credit relief for Indian tax', 'Remittance basis ended 6 April 2025; check the four-year FIG regime if newly arrived'],
    'United Arab Emirates': ['No UAE personal income tax on investment income', 'Get a UAE Tax Residency Certificate and file Form 10F to claim treaty rates in India'],
    'Singapore': ['Capital gains are generally not taxed in Singapore', 'Gains on Indian shares acquired from 1 April 2017 are taxable in India under the treaty', 'Certificate of residence from IRAS plus Form 10F for treaty rates'],
    'Australia': ['Report Indian income and gains; 50% CGT discount for assets held 12 months or more', 'Claim the foreign income tax offset for Indian tax']
  };
  function pathTool() {
    var form = $('#path-tool'); if (!form) return;
    var out = $('#path-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var country = val(form, 'country'), status = val(form, 'status'), product = val(form, 'product'), money = val(form, 'money'), repat = val(form, 'repat'), usp = val(form, 'usperson');
      if (!country) { var c = $('#p-country'); c.setCustomValidity('Choose your country'); c.reportValidity(); c.setCustomValidity(''); return; }
      var us = usp === 'yes' || (usp === 'auto' && /United States/.test(country)), ca = /Canada/.test(country), foreign = status === 'foreign';
      var acc = [], can = [], cannot = [], kyc = [], notes = [], cls = 'ok', big = 'Route clear', small = 'Standard path';
      var abroadMoney = money !== 'india', indiaMoney = money !== 'abroad';
      var repatAcct = foreign ? 'A repatriable rupee account allowed for overseas individuals (for example an SNRR account), or invest by direct inward remittance' : 'NRE savings account for money earned abroad';
      if (product === 'stocks' || product === 'ipo') {
        if (abroadMoney || repat === 'yes') { acc.push(repatAcct + (product === 'stocks' ? ', <b>designated</b> with your bank for listed-share investment (often called NRE-PIS)' : '')); acc.push('Repatriable demat account and a trading account with a broker that serves non-residents'); }
        if (indiaMoney && !foreign) { acc.push('NRO savings account for Indian income'); acc.push('Non-repatriable (NRO) demat account'); }
        can.push('Buy listed shares for delivery, up to 10% of a company\'s paid-up capital (24% for all overseas individuals together), subject to sector caps');
        if (product === 'ipo') can.push('Apply in IPOs through net-banking ASBA from your NRE or NRO account, in the non-resident category');
        cannot.push('Intraday trading or short selling in the cash market'); cannot.push('Exceed 10% in one company — the excess must be sold within 5 trading days');
        if (product === 'ipo') notes.push('UPI-based IPO bids usually need an Indian mobile linked to the bank account; net-banking ASBA avoids that.');
        if (foreign) notes.push('Opened to foreign nationals on 12 June 2026 under the FEMA amendment. Brokers are still adapting onboarding; confirm your broker accepts your category. Investors from countries sharing a land border with India need approval for significant stakes.');
      } else if (product === 'mf') {
        if (foreign) { cls = 'stop'; big = 'Restricted'; small = 'Few options'; notes.push('Indian mutual funds are generally not offered to foreign nationals without Indian origin outside the foreign portfolio investor framework. Look at GIFT City funds or India ETFs listed in your country.'); }
        acc.push(abroadMoney || repat === 'yes' ? 'NRE savings account as the bank mandate, so redemptions are repatriable' : 'NRO savings account as the bank mandate');
        if (indiaMoney && (abroadMoney || repat === 'yes')) acc.push('NRO savings account for money from Indian income');
        acc.push('No PIS designation needed for mutual funds');
        can.push('Lump-sum and SIP investments in the fund houses that accept residents of your country');
        cannot.push('Pay from a third party\'s account or an un-designated resident account');
        if (us || ca) { if (cls !== 'stop') { cls = 'warn'; big = 'Limited'; small = 'Few fund houses'; } }
        if (us) notes.push('As a US person, Indian funds are generally PFICs: one Form 8621 per fund each year and punitive default taxation. <a href="/pfic-check">Run the PFIC check</a> first.');
      } else if (product === 'fno') {
        if (foreign) { cls = 'stop'; big = 'Restricted'; small = 'Not available'; notes.push('Derivatives trading through the non-resident route is set up for NRIs and OCIs; foreign nationals should look at GIFT Nifty on NSE International Exchange.'); }
        acc.push('NRO savings account — derivatives must be funded on a non-repatriable basis (you can send money from abroad into NRO)'); acc.push('NRO trading account with a broker offering F&O to NRIs'); acc.push('Custodial participant (CP) code through a clearing member');
        can.push('Equity futures and options, settled in rupees'); cannot.push('Commodity derivatives'); cannot.push('Using NRE (repatriable) money directly for derivatives');
        notes.push('Profits stay in NRO and fall under the USD 1 million yearly NRO repatriation limit. Derivatives are high risk.');
      } else if (product === 'gift') {
        acc.push('Your overseas bank account in US dollars — most GIFT City products do not need NRE, NRO or PIS'); acc.push('An account with an IFSCA-registered platform or distributor');
        can.push('USD mutual fund schemes, USD deposits with IFSC banking units, portfolio management, AIFs (high minimums)');
        if (us) notes.push('Pooled GIFT City funds are still PFICs for US persons. A PMS holding shares in your own name avoids pooling.');
      } else if (product === 'fd') {
        if (foreign) { cls = 'stop'; big = 'Restricted'; small = 'Not available'; notes.push('NRE, NRO and FCNR(B) deposits are for NRIs and persons of Indian origin. Consider USD deposits with IFSC banking units in GIFT City.'); }
        acc.push('NRE fixed deposit — money earned abroad, interest tax-free in India, fully repatriable'); acc.push('FCNR(B) deposit — held in foreign currency, no exchange-rate risk, tax-free in India'); acc.push('NRO fixed deposit — for Indian income; interest taxed with 30% withholding unless a treaty rate applies');
        notes.push('NRE and FCNR interest is usually taxable in your country of residence.');
      }
      if (status === 'returning') notes.push('Moving back: these accounts apply while you are non-resident. After you return, re-designate NRE/NRO as resident accounts; FCNR deposits can run to maturity. You may be RNOR for two or three years. <a href="/guides/returning-nri-rnor">Read the guide</a>.');
      if (status === 'oci') kyc.push('Foreign passport plus OCI card, PAN, overseas address proof, FATCA/CRS form');
      else if (foreign) kyc.push('Foreign passport, PAN, overseas address document (or foreign-government document or embassy letter if it shows no address), FATCA/CRS form');
      else kyc.push('Indian passport, visa or residence permit, PAN, overseas address proof, FATCA/CRS form');
      kyc.push(/Other/.test(country) ? 'Digital KYC from abroad applies from 3 December 2026 if your country is FATF-compliant; otherwise attested copies and in-person verification' : 'Digital KYC and video verification from abroad from 3 December 2026; attested courier route until then');
      kyc.push('Check that your KRA status is Validated — <a href="/kyc-checker">KYC checker</a>');
      var filings = ['India: tax withheld on gains, dividends and NRO interest; file an Indian return to recover any excess (<a href="/tax-calculator">estimate</a>)'].concat(HOME[us ? 'United States' : country] || ['Report Indian income in your country of residence and claim credit for Indian tax under the treaty']);
      var html = '<div class="result-top">' + stamp(cls, big, small, true) + '<p>Your route from <b>' + esc(country) + '</b> as ' + esc({ nri: 'an NRI', oci: 'an OCI cardholder', foreign: 'a foreign national', returning: 'a returning NRI' }[status]) + '.</p></div>' +
        '<h3>Accounts you need</h3>' + list(acc, 'steps') +
        (can.length ? '<h3>You can</h3>' + list(can) : '') +
        (cannot.length ? '<h3>You cannot</h3><ul>' + cannot.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
        '<h3>KYC route</h3>' + list(kyc) +
        '<div data-amcs></div>' +
        '<h3>Tax and filings</h3>' + list(filings) +
        notes.map(function (n) { return '<div class="callout info"><p>' + n + '</p></div>'; }).join('');
      out.innerHTML = html;
      var need = product === 'mf' ? 'Invest in Indian mutual funds' : product === 'gift' ? 'GIFT City / USD investing' : 'Open NRI bank and demat accounts';
      if (product === 'mf' && !foreign) {
        amcs().then(function (A) {
          var slot = $('[data-amcs]', out); if (!slot) return;
          if (us || ca) {
            var rows = (A.amcs || []).filter(function (a) { return (us ? a.us : a.ca) === 'yes'; });
            slot.innerHTML = '<h3>Fund houses reported to accept ' + esc(us ? 'US' : 'Canada') + ' residents</h3><ul class="checks">' + rows.map(function (a) { return '<li><b>' + esc(a.name) + '</b> — ' + esc(a.mode) + '</li>'; }).join('') + '</ul><p class="muted" style="font-size:.85rem">Last reviewed ' + esc(A.lastReviewed || '') + '. <a href="/amc-directory">Full directory with conditions and daily website checks</a>.</p>';
          } else slot.innerHTML = '<h3>Fund houses</h3><p>Most Indian fund houses accept residents of ' + esc(country) + '. Each still requires Validated KYC and NRI tax status.</p>';
          finish(out, 'path', 'Investing path', out.innerHTML, need, country);
        });
      } else finish(out, 'path', 'Investing path', html, need, country);
    });
    var q = new URLSearchParams(location.search);
    if (q.get('country') && $('#p-country').value) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit'));
  }

  // ===================== PFIC check =====================
  function pficTool() {
    var form = $('#pfic-tool'); if (!form) return;
    var out = $('#pfic-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var us = val(form, 'us'), mf = num(form, 'mf'), etf = num(form, 'etf'), ulip = num(form, 'ulip'), gift = num(form, 'gift'), stocks = num(form, 'stocks'), fd = val(form, 'fd') === '1';
      var maxv = num(form, 'maxval'), endv = num(form, 'endval'), mfj = val(form, 'filing') === 'mfj', abroad = val(form, 'live') === 'abroad';
      if (us === 'no') { out.innerHTML = '<div class="result-top">' + stamp('ink', 'Not US', 'PFIC n/a', true) + '<p>PFIC rules apply only to US persons. Your home country may have its own rules for foreign funds — see the <a href="/countries/">country guides</a>.</p></div>'; return; }
      var n = mf + etf + ulip + gift;
      var t = abroad ? (mfj ? [400000, 600000] : [200000, 300000]) : (mfj ? [100000, 150000] : [50000, 75000]);
      var fbar = maxv > 10000, f8938 = endv > t[0] || maxv > t[1];
      var rows = [];
      if (mf) rows.push('<tr><td>Indian mutual funds</td><td>' + mf + '</td><td class="no">Likely PFIC</td></tr>');
      if (etf) rows.push('<tr><td>Indian-listed ETFs</td><td>' + etf + '</td><td class="no">Likely PFIC</td></tr>');
      if (ulip) rows.push('<tr><td>ULIPs</td><td>' + ulip + '</td><td class="no">Likely PFIC</td></tr>');
      if (gift) rows.push('<tr><td>Pooled GIFT City funds</td><td>' + gift + '</td><td class="no">Likely PFIC</td></tr>');
      if (stocks) rows.push('<tr><td>Indian company shares</td><td>' + stocks + '</td><td class="yes">Generally not PFIC</td></tr>');
      if (fd) rows.push('<tr><td>Bank deposits</td><td>—</td><td class="yes">Not PFIC; interest taxable</td></tr>');
      var html = '<div class="result-top">' + (n ? stamp('stop', '8621 × ' + n, 'Every year', true) : stamp('ok', 'No PFIC', 'From these holdings', true)) + '<p>' + (n ? 'You likely need <b>' + n + ' Form 8621 filing' + (n > 1 ? 's' : '') + '</b> each year. At typical preparer fees of US$100–300 per form, that is roughly <b>' + usd(n * 100) + '–' + usd(n * 300) + ' a year</b> before any tax.' : 'None of the holdings you entered are pooled funds, so PFIC filings are unlikely. Other reporting may still apply.') + '</p></div>' +
        (rows.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Holding</th><th>Count</th><th>PFIC</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '') +
        '<h3>Other US reporting</h3><dl class="kv"><dt>FBAR (FinCEN 114)</dt><dd class="' + (fbar ? 'no' : 'yes') + '">' + (fbar ? 'Required — highest combined value above US$10,000' : 'Not triggered by the values entered') + '</dd><dt>Form 8938</dt><dd class="' + (f8938 ? 'no' : 'yes') + '">' + (f8938 ? 'Required — above ' + usd(t[0]) + ' at year end or ' + usd(t[1]) + ' at any time' : 'Below the ' + usd(t[0]) + ' / ' + usd(t[1]) + ' thresholds for your situation') + '</dd></dl>' +
        (n ? '<h3>Structures US persons commonly use instead</h3>' + list(['Direct shares of Indian companies in an NRI demat account', 'India-focused ETFs listed on a US exchange', 'Portfolio management that holds shares in your own name', 'NRE/FCNR deposits (interest taxable in the US)']) + '<div class="callout"><p>Already hold Indian funds? Do not sell in a panic — the timing of a disposal and any elections matter. Talk to a cross-border preparer.</p></div>' : '') +
        '<p class="muted" style="font-size:.85rem">General information, not tax advice. Thresholds per IRS guidance; fees are typical market ranges.</p>';
      out.innerHTML = html;
      finish(out, 'pfic', 'PFIC check result', html, 'US tax / PFIC', 'United States');
    });
  }

  // ===================== document check =====================
  var AUDIT = {
    a_passport: [true, 'Renew your passport before applying — many intermediaries reject passports with under six months left.'],
    a_name: [true, 'Make names match. Correct the PAN record (online PAN correction) or get a bank/broker to record the full name exactly as on the passport.'],
    a_dob: [true, 'Correct the date of birth on PAN to match your passport before applying.'],
    a_address: [false, 'Get a fresh address proof in your name: a utility bill, bank statement or government document dated within three months.'],
    a_attest: [true, 'Have each copy attested by a notary, Indian embassy/consulate or an Indian bank\'s overseas branch, with signature, seal, name and date — or use the digital route from 3 December 2026.'],
    a_contact: [true, 'Verify your email by OTP with the KRA; overseas mobile numbers often fail SMS checks.'],
    a_pan: [true, 'If PAN is inoperative, update your residential status with the Income Tax Department first.'],
    a_fatca: [false, 'Fill a fresh FATCA/CRS form showing the same country and address as your KYC.'],
    a_lang: [false, 'Get a certified English translation of any non-English document, attested with the original.'],
    a_photo: [false, 'Take a recent passport-style photo on a plain background and scan your signature in dark ink.']
  };
  function docTool() {
    var form = $('#doc-tool'); if (!form) return;
    var out = $('#doc-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = val(form, 'status'), country = val(form, 'country') || 'your country', goal = val(form, 'goal'), route = val(form, 'route');
      var docs = [status === 'nri' ? 'Indian passport (six months\' validity)' : 'Foreign passport (six months\' validity)'];
      if (status === 'oci') docs.push('OCI card');
      docs.push(status === 'nri' ? 'Visa, work or residence permit for ' + esc(country) : 'Residence permit or proof of residence in ' + esc(country));
      docs.push('PAN card (or PAN number for database verification on the digital route)');
      docs.push('Overseas address proof dated within three months');
      docs.push('Recent passport-style photograph and signature');
      docs.push('FATCA/CRS self-certification');
      if (goal === 'demat' || goal === 'bank') docs.push('Cancelled cheque or statement of your NRE/NRO account');
      if (goal === 'demat') docs.push('Bank letter designating your repatriable account for listed-share investment');
      if (goal === 'bank') docs.push('Proof of NRI status for the bank (visa/permit or OCI) and initial remittance details');
      if (goal === 'rekyc') docs.push('KYC modification form from your KRA or registrar');
      var routeNote = route === 'digital' ? 'Digital route: PAN is verified against the tax database, you show originals (or DigiLocker/e-documents) on a recorded video call, and your IP must be in a FATF-compliant country matching your declaration. Available from 3 December 2026.' : route === 'courier' ? 'Courier route: every copy must be attested, and originals stay with you. Send by tracked courier to the registrar or broker address on the form.' : 'In person in India: carry originals and self-attested copies; the intermediary verifies them on the spot.';
      var miss = Object.keys(AUDIT).filter(function (k) { if (k === 'a_attest' && route !== 'courier') return false; return !form.elements[k].checked; });
      var critical = miss.filter(function (k) { return AUDIT[k][0]; });
      var score = Math.round(100 * (1 - miss.length / Object.keys(AUDIT).length));
      var cls = critical.length ? 'stop' : miss.length ? 'warn' : 'ok', big = critical.length ? 'High risk' : miss.length ? 'Fix first' : 'Ready', small = critical.length ? critical.length + ' critical issue' + (critical.length > 1 ? 's' : '') : miss.length ? miss.length + ' minor issue' + (miss.length > 1 ? 's' : '') : 'Score ' + score + '/100';
      var html = '<div class="result-top">' + stamp(cls, big, small, true) + '<p>' + (critical.length ? 'Fix the critical items before you apply — each is a common reason for outright rejection.' : miss.length ? 'You are close. Clearing the remaining items avoids back-and-forth with the registrar.' : 'Your documents meet the checks most intermediaries apply. Keep copies of everything you send.') + '</p></div>' +
        (miss.length ? '<h3>Fix these</h3>' + list(miss.map(function (k) { return (AUDIT[k][0] ? '<b>Critical:</b> ' : '') + AUDIT[k][1]; }), 'steps') : '') +
        '<h3>Your document list</h3>' + list(docs) + '<div class="callout info"><p>' + routeNote + '</p></div>';
      out.innerHTML = html;
      finish(out, 'docs', 'KYC document list', html, 'Fix KYC / unfreeze a folio', country);
    });
  }

  // ===================== capital gains & TDS =====================
  function taxTool() {
    var form = $('#tax-tool'); if (!form) return;
    var out = $('#tax-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { var bad = $(':invalid', form); if (bad) bad.reportValidity(); return; }
      var asset = val(form, 'asset'), b = new Date(val(form, 'buy')), s = new Date(val(form, 'sell')), cost = num(form, 'cost'), value = num(form, 'value'), other = num(form, 'other'), sur = num(form, 'income') / 100;
      if (s <= b) { out.innerHTML = '<p class="form-msg err">The sale date must be after the purchase date.</p>'; return; }
      var gain = value - cost;
      var months = (s.getFullYear() - b.getFullYear()) * 12 + (s.getMonth() - b.getMonth()) - (s.getDate() < b.getDate() ? 1 : 0);
      var addYears = function (dt, y) { var x = new Date(dt); x.setFullYear(x.getFullYear() + y); return x; };
      var lt, rate, tdsRate, label, taxable = gain;
      if (asset === 'equity') { lt = s > addYears(b, 1); rate = lt ? 0.125 : 0.20; tdsRate = rate; label = lt ? 'Long-term (held more than 12 months)' : 'Short-term (12 months or less)'; if (lt) taxable = Math.max(0, gain - Math.max(0, 125000 - other)); }
      else if (asset === 'debt') { lt = false; rate = 0.30; tdsRate = 0.30; label = 'Short-term by law (specified fund bought on or after 1 April 2023)'; }
      else { lt = s > addYears(b, 2); rate = lt ? 0.125 : 0.30; tdsRate = rate; label = lt ? 'Long-term (held more than 24 months)' : 'Short-term (24 months or less)'; }
      var eff = function (r) { return r * (1 + Math.min(sur, asset === 'debt' ? sur : 0.15)) * 1.04; };
      if (gain <= 0) {
        out.innerHTML = '<div class="result-top">' + stamp('ink', 'Loss', inr(-gain), true) + '<p>No tax and normally no withholding. ' + (lt ? 'A long-term capital loss can be set off only against long-term gains' : 'A short-term capital loss can be set off against short- or long-term gains') + ' and carried forward for eight tax years if you file your Indian return on time.</p></div>';
        return;
      }
      var tax = taxable * eff(rate), tds = gain * eff(tdsRate), refund = tds - tax;
      var html = '<div class="result-top">' + (refund > 100 ? stamp('ok', 'Refund', inr(refund), true) : stamp('ink', 'TDS ≈ tax', 'No refund', true)) + '<p>' + esc(label) + '. Holding period: ' + Math.max(0, months) + ' months.</p></div>' +
        '<div class="calc-out"><div><small>Capital gain</small><b>' + inr(gain) + '</b></div><div><small>Likely TDS withheld</small><b>' + inr(tds) + '</b></div><div><small>Estimated tax due</small><b>' + inr(tax) + '</b></div></div>' +
        '<dl class="kv"><dt>Rate</dt><dd>' + (rate * 100) + '% + ' + (asset === 'equity' ? Math.min(sur, 0.15) * 100 : sur * 100) + '% surcharge + 4% cess</dd>' + (asset === 'equity' && lt ? '<dt>Exemption used</dt><dd>' + inr(Math.min(gain, Math.max(0, 125000 - other))) + ' of the ₹1.25 lakh annual limit</dd>' : '') + '<dt>Possible refund</dt><dd>' + (refund > 100 ? inr(refund) + ' by filing your Indian return' : 'Little or none') + '</dd></dl>' +
        (asset === 'debt' ? '<div class="callout"><p>Debt fund gains are taxed at slab rates. We use 30% as a top-bracket estimate; if your total Indian income is low, your actual tax may be lower and the refund larger.</p></div>' : '') +
        '<div class="callout info"><p>Treaty relief, other gains and losses, and grandfathered costs for pre-2018 equity are not modelled. A chartered accountant can compute the exact figure. <a href="/guides/nri-tds-capital-gains">Read the TDS guide</a>.</p></div>';
      out.innerHTML = html;
      finish(out, 'tax', 'Capital gains estimate', html, 'Indian tax, TDS refund or ITR', '');
    });
  }

  // ===================== residential status =====================
  function resTool() {
    var form = $('#res-tool'); if (!form) return;
    var out = $('#res-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { var bad = $(':invalid', form); if (bad) bad.reportValidity(); return; }
      var days = num(form, 'days'), d4 = num(form, 'days4'), cit = val(form, 'cit'), emp = val(form, 'emp'), high = val(form, 'inc') === 'high', taxed = val(form, 'taxed') === 'yes', nr9 = val(form, 'nr9') === 'yes', d7raw = val(form, 'd7'), d7 = d7raw === '' ? null : +d7raw;
      var indianOrPio = cit !== 'other', resident = false, rnorForced = false, why = '';
      if (days >= 182) { resident = true; why = 'You were in India 182 days or more.'; }
      else if (days >= 60 && d4 >= 365) {
        if (emp === 'crew' || (cit === 'indian' && emp === 'left')) why = 'The 60-day test does not apply to you (182 days is required), so you are not resident on days alone.';
        else if (indianOrPio && emp === 'visit') {
          if (high && days >= 120) { resident = true; rnorForced = true; why = 'As a visiting Indian citizen or person of Indian origin with Indian income above ₹15 lakh, the 120-day test applies and you meet it.'; }
          else why = 'As a visiting Indian citizen or person of Indian origin, the 60-day test is replaced by ' + (high ? '120' : '182') + ' days, which you do not meet.';
        } else { resident = true; why = 'You were in India 60 days or more this year and 365 days or more in the previous four years.'; }
      } else why = 'You were in India fewer than 182 days and do not meet the 60-day/365-day test.';
      var deemed = false;
      if (!resident && cit === 'indian' && high && !taxed) { resident = true; deemed = true; rnorForced = true; why = 'You are an Indian citizen with Indian income above ₹15 lakh and not liable to tax elsewhere by residence, so you are deemed resident.'; }
      var rnor = resident && (rnorForced || nr9 || (d7 !== null && d7 <= 729));
      var r = !resident ? ['', 'Non-resident', 'NRI for tax', 'Only income earned or received in India is taxable in India. NRE and FCNR interest stays tax-free.'] : rnor ? ['warn', 'RNOR', 'Not ordinarily resident', 'Indian income is taxable; most foreign income stays outside Indian tax unless it comes from a business controlled or profession set up in India.'] : ['ink', 'Resident', 'Ordinarily resident', 'Your worldwide income is taxable in India, and foreign assets must be disclosed in your Indian return. Treaty relief may prevent double taxation.'];
      var html = '<div class="result-top">' + stamp(r[0], r[1], r[2], true) + '<p>' + why + (deemed ? ' Deemed residents are always treated as not ordinarily resident.' : '') + '</p></div><p>' + r[3] + '</p>' +
        (resident ? '<div class="callout"><p>Your bank, broker and fund houses use FEMA residence (based on why you are in India), which can differ from tax residence. Keep both up to date. <a href="/guides/returning-nri-rnor">Returning NRIs and RNOR</a>.</p></div>' : '<div class="callout info"><p>Keep a record of travel dates — passport stamps and boarding passes — in case the tax department asks.</p></div>');
      out.innerHTML = html;
      finish(out, 'residential', 'Residential status result', html, 'Indian tax, TDS refund or ITR', '');
    });
  }

  // ===================== rates: converter + trend =====================
  function fxTool() {
    var box = $('#fx-tool'); if (!box) return;
    var data = { rates: {}, history: [] };
    try { data = JSON.parse(($('#fx-data') || {}).textContent.replace(/<!--\/?ni:fx-json-->/g, '') || '{}'); } catch (e) {}
    var amt = $('#fx-amt'), ccy = $('#fx-ccy'), dir = $('#fx-dir'), mg = $('#fx-margin');
    function fmt(c, n) { return c === 'INR' ? inr(n) : n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + c; }
    function calc() {
      var c = ccy.value, r = data.rates[c]; if (!r) return;
      var a = parseFloat(amt.value) || 0, m = (parseFloat(mg.value) || 0) / 100;
      var mid, net;
      if (dir.value === 'to') { mid = a * r; net = mid * (1 - m); $('[data-fx-out]').textContent = fmt('INR', mid); $('[data-fx-net]').textContent = fmt('INR', net); $('[data-fx-cost]').textContent = fmt('INR', mid - net); }
      else { mid = a / r; net = mid * (1 - m); $('[data-fx-out]').textContent = fmt(c, mid); $('[data-fx-net]').textContent = fmt(c, net); $('[data-fx-cost]').textContent = fmt(c, mid - net); }
      chart(c);
    }
    function chart(c) {
      var host = $('[data-fx-chart]'); var pts = (data.history || []).filter(function (h) { return h[c]; });
      if (pts.length < 2) { host.innerHTML = '<p class="muted" style="font-size:.88rem">The trend line builds up as daily rates are recorded. Check back in a few days.</p>'; return; }
      var W = 560, H = 170, P = { l: 46, r: 12, t: 12, b: 24 };
      var vs = pts.map(function (p) { return p[c]; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs); if (hi === lo) { hi += 0.5; lo -= 0.5; }
      var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
      var x = function (i) { return P.l + (W - P.l - P.r) * i / (pts.length - 1); }, y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo)); };
      var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[c]).toFixed(1); }).join(' ');
      var grid = [0, 0.5, 1].map(function (f) { var v = lo + (hi - lo) * f; return '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="#e6eaf1" stroke-width="1"/><text x="' + (P.l - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#6b7590">' + v.toFixed(v < 10 ? 3 : 2) + '</text>'; }).join('');
      var last = pts[pts.length - 1];
      host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Rupees per ' + c + ' over the last ' + pts.length + ' recorded days, from ' + pts[0][c] + ' to ' + last[c] + '" style="width:100%;height:auto;display:block;touch-action:none">' + grid +
        '<text x="' + P.l + '" y="' + (H - 6) + '" font-size="11" fill="#6b7590">' + pts[0].d + '</text><text x="' + (W - P.r) + '" y="' + (H - 6) + '" text-anchor="end" font-size="11" fill="#6b7590">' + last.d + '</text>' +
        '<path d="' + line + '" fill="none" stroke="#5a3fc0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<line data-x stroke="#44506a" stroke-width="1" y1="' + P.t + '" y2="' + (H - P.b) + '" visibility="hidden"/><circle data-dot r="4" fill="#5a3fc0" stroke="#fff" stroke-width="2" visibility="hidden"/>' +
        '<rect x="' + P.l + '" y="0" width="' + (W - P.l - P.r) + '" height="' + H + '" fill="transparent" data-hit/></svg><p class="muted" data-fx-tip style="font-size:.85rem;margin:4px 0 0">Rupees per ' + c + '. Hover or tap the line for a day\'s rate.</p>';
      var svg = $('svg', host), hit = $('[data-hit]', svg), xl = $('[data-x]', svg), dot = $('[data-dot]', svg), tip = $('[data-fx-tip]', host);
      function move(ev) {
        var rect = svg.getBoundingClientRect(), px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left) * W / rect.width;
        var i = Math.max(0, Math.min(pts.length - 1, Math.round((px - P.l) / (W - P.l - P.r) * (pts.length - 1))));
        xl.setAttribute('x1', x(i)); xl.setAttribute('x2', x(i)); xl.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(pts[i][c])); dot.setAttribute('visibility', 'visible');
        tip.textContent = pts[i].d + ': ₹' + pts[i][c].toFixed(pts[i][c] < 10 ? 3 : 2) + ' per ' + c;
      }
      hit.addEventListener('mousemove', move); hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('mouseleave', function () { xl.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
    }
    [amt, ccy, dir, mg].forEach(function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
    calc();
    if (NI.fx) NI.fx().then(function (live) { if (!live) return; $$('option', ccy).forEach(function (o) { if (live[o.value]) data.rates[o.value] = live[o.value]; }); calc(); });
  }

  // ===================== directory and updates filters =====================
  function amcFilter() {
    var bar = $('#amc-filter'); if (!bar) return;
    var q = $('#amc-q'), m = $('#amc-mode');
    function run() { var t = q.value.trim().toLowerCase(), mode = m.value; $$('#amc-table tbody tr').forEach(function (tr) { tr.hidden = (t && tr.textContent.toLowerCase().indexOf(t) < 0) || (mode && tr.getAttribute('data-mode') !== mode); }); }
    q.addEventListener('input', run); m.addEventListener('change', run);
  }
  function updFilter() {
    var bar = $('#upd-filter'); if (!bar) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tag]'); if (!b) return;
      var t = b.getAttribute('data-tag');
      $$('[data-tag]', bar).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); x.style.borderColor = x === b ? 'var(--stamp)' : ''; });
      $$('#upd-list li').forEach(function (li) { li.hidden = t && (' ' + li.getAttribute('data-tags') + ' ').indexOf(' ' + t + ' ') < 0; });
      $$('#upd-list .ud-day').forEach(function (s) { s.hidden = !$$('li', s).some(function (li) { return !li.hidden; }); });
    });
  }

  heroCheck(); kycTool(); pathTool(); pficTool(); docTool(); taxTool(); resTool(); fxTool(); amcFilter(); updFilter();
})();
