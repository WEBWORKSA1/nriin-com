// NRIin.com — site-wide constants and the shared chrome (top bar, header, footer).
// Edited here, baked into every page by scripts/build.mjs (runs daily in GitHub Actions).

export const SITE = {
  name: 'NRIin',
  domain: 'NRIin.com',
  origin: 'https://nriin.com',
  adsenseClient: 'ca-pub-6620975821265271',
  sponsorUrl: 'https://web.works/contact',
  ownerUrl: 'https://web.works',
  tz: 'Asia/Kolkata',
  year: 2026,
  tagline: 'Investing in India from abroad, made workable',
};

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
};
export const ICONS = I;

// The brand mark: a round passport-control stamp with "in" at its centre.
export const MARK = `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.4 2.2"/><text x="24" y="30.5" text-anchor="middle" font-family="Schibsted Grotesk, Arial, sans-serif" font-weight="800" font-size="17" fill="currentColor">in</text></svg>`;

const dd = (label, href, items) =>
  `<div class="nav-dd"><a href="${href}" class="nav-dd-trigger">${label}<span class="caret" aria-hidden="true"></span></a><div class="nav-dd-menu">` +
  items.map(([t, h, s]) => `<a href="${h}"><span>${t}</span>${s ? `<small>${s}</small>` : ''}</a>`).join('') + '</div></div>';

export const NAV = {
  tools: [
    ['KYC status checker', '/kyc-checker', 'On hold, registered or validated? Get the fix'],
    ['Investing path finder', '/path-finder', 'Accounts, KYC and platforms that work for you'],
    ['Mutual fund houses for US & Canada', '/amc-directory', 'Who still onboards you, checked daily'],
    ['PFIC check for US persons', '/pfic-check', 'Which holdings trigger Form 8621'],
    ['KYC document check', '/document-check', 'Catch rejections before you courier anything'],
    ['Capital gains & TDS estimator', '/tax-calculator', 'What will be withheld, what you can claim back'],
    ['Residential status calculator', '/residential-status', 'NRI, RNOR or resident this tax year'],
    ['Live INR rates', '/rates', 'Rupee against 15 currencies, updated daily'],
  ],
  countries: [
    ['United States', '/countries/usa', 'PFIC, FBAR, limited fund houses'],
    ['Canada', '/countries/canada', 'T1135, FATCA-style declarations'],
    ['United Kingdom', '/countries/uk', 'Offshore fund rules, treaty relief'],
    ['United Arab Emirates', '/countries/uae', 'No personal income tax, TRC matters'],
    ['Singapore', '/countries/singapore', 'Treaty, CPF money and Indian funds'],
    ['Australia', '/countries/australia', 'CGT discount and foreign income'],
  ],
  more: [
    ['Get expert help', '/get-help', 'Matched to a cross-border specialist'],
    ['For professionals', '/for-professionals', 'RIAs, CAs and CPAs: list with us'],
    ['Contests & prizes', '/contests', 'Share your story, win prizes'],
    ['Careers', '/careers', 'Writers, researchers, developers'],
    ['Support NRIin', '/support', 'Keep the tools free'],
    ['Advertise & partner', '/advertise', 'Sponsorships and placements'],
    ['Free checklist', '/checklist', 'Printable paperwork checklist'],
    ['About', '/about', ''],
    ['Contact', '/contact', ''],
  ],
};

export function header({ stamp, usdinr }) {
  return `<a class="skip" href="#main">Skip to content</a>
<div class="topbar" role="note"><div class="wrap"><a href="${SITE.sponsorUrl}" target="_blank" rel="noopener" data-ni-ev="sponsor_topbar">Contact, if you are interested in this website / domain name / Sponsorship / Advertisement / Partnership</a></div></div>
<div class="util"><div class="wrap">
<p class="util-note">Independent guide for NRIs and OCIs. Not a bank, broker or adviser.<span class="hide-sm"> Updated ${esc(stamp)}.</span></p>
<div class="util-r"><span class="clock" title="Time in India">India <b data-ni-ist>--:--</b></span><a class="fx-chip" href="/rates" title="Rupees per US dollar">USD/INR <b data-ni-fx="USD">${esc(usdinr || '—')}</b></a></div>
</div></div>
<header class="site-hd"><div class="wrap hd-in">
<a href="/" class="brand" aria-label="NRIin home">${MARK}<span class="brand-tx"><b>NRIin</b><small>${esc(SITE.tagline)}</small></span></a>
<nav class="main-nav" aria-label="Main">${dd('Tools', '/kyc-checker', NAV.tools)}<a href="/guides/">Guides</a>${dd('By country', '/countries/usa', NAV.countries)}<a href="/updates" class="nav-live"><span class="live-dot" aria-hidden="true"></span>Updates</a><a href="/videos">Videos</a>${dd('More', '/advertise', NAV.more)}</nav>
<div class="hd-actions"><button type="button" class="icon-btn" data-ni-search aria-label="Search the site">${I.search}</button><a href="/get-help" class="btn btn-stamp btn-sm">Get expert help</a><button type="button" class="icon-btn menu-btn" data-ni-menu aria-label="Open menu" aria-expanded="false" aria-controls="mnav">${I.menu}</button></div>
</div>
<div class="mnav" id="mnav" hidden><div class="wrap">
<div class="mnav-grp"><b>Tools</b>${NAV.tools.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div>
<div class="mnav-grp"><b>By country</b>${NAV.countries.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div>
<div class="mnav-grp"><b>Read and watch</b><a href="/guides/">All guides</a><a href="/updates">Daily updates</a><a href="/videos">Videos</a><a href="/checklist">Free checklist</a></div>
<div class="mnav-grp"><b>Community</b>${NAV.more.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div>
</div></div>
</header>`;
}

export function footer({ stamp, year }) {
  const col = (t, links) => `<div class="fcol"><b>${t}</b>${links.map(([a, h]) => `<a href="${h}">${a}</a>`).join('')}</div>`;
  return `<section class="nl-band" aria-labelledby="nl-h"><div class="wrap nl-in"><div><h2 id="nl-h">Know when the rules change</h2><p>One short email when SEBI, RBI or the tax department changes something that affects NRI investing. Nothing else.</p></div>
<form class="nl-form" data-ni-form="newsletter" data-subject="Newsletter signup" novalidate>
<label class="sr" for="nl-email">Email</label><input id="nl-email" class="field" type="email" name="email" placeholder="you@example.com" required autocomplete="email">
<label class="sr" for="nl-country">Country you live in</label><select id="nl-country" class="field" name="country" data-ni-countries><option value="">Country you live in</option></select>
<input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<label class="consent"><input type="checkbox" name="consent" value="yes" required> Send me rule-change alerts. I accept the <a href="/privacy">privacy policy</a>.</label>
<button type="submit" class="btn btn-stamp">Subscribe</button><p class="form-msg" role="status" aria-live="polite"></p></form></div></section>
<footer class="site-ft"><div class="wrap">
<div class="ft-grid">
<div class="fcol fbrand"><a href="/" class="brand brand-ft" aria-label="NRIin home">${MARK}<span class="brand-tx"><b>NRIin</b></span></a><p>Free, independent tools and plain-language guides for Non-Resident Indians and OCI cardholders investing in Indian stocks and mutual funds. Refreshed every day from regulators, tax authorities and the press.</p><p class="fraud">${I.shield}<span><b>Stay safe.</b> We never ask for passwords, OTPs or card numbers, and we never hold your money. Anyone promising guaranteed returns or “instant KYC approval” for a fee is not us.</span></p></div>
${col('Tools', NAV.tools.slice(0, 8).map(([t, h]) => [t, h]))}
${col('Learn', [['All guides', '/guides/'], ['Daily updates', '/updates'], ['Videos', '/videos'], ['Free checklist', '/checklist'], ['United States', '/countries/usa'], ['Canada', '/countries/canada'], ['United Kingdom', '/countries/uk'], ['UAE', '/countries/uae'], ['Search', '/search']])}
${col('Company', [['About', '/about'], ['Contact', '/contact'], ['Get expert help', '/get-help'], ['For professionals', '/for-professionals'], ['Careers', '/careers'], ['Contests', '/contests'], ['Support NRIin', '/support'], ['Advertise & partner', '/advertise'], ['Editorial policy', '/editorial-policy']])}
${col('Legal', [['Privacy policy', '/privacy'], ['Terms of use', '/terms'], ['Disclaimer', '/disclaimer'], ['Cookie policy', '/cookie-policy'], ['Copyright & trademarks', '/copyright'], ['Sitemap', '/sitemap.xml'], ['RSS feed', '/feed.xml']])}
</div>
<p class="disc"><b>Important:</b> NRIin.com publishes general information and free calculators. It is not a SEBI-registered investment adviser, research analyst, stock broker, mutual fund distributor, bank or tax practitioner, and nothing here is investment, legal or tax advice or a recommendation to buy or sell any security. Rules for non-residents change often; confirm current requirements with the regulator, your bank, broker or fund house, and a qualified professional before you act. Mutual fund and equity investments are subject to market risks. Regulator, bank, fund house and broker names are used only to identify them; we are not affiliated with or endorsed by any of them. News headlines link to their original publishers. <a href="/disclaimer">Read the full disclaimer</a>.</p>
<p class="copy">© ${year} NRIin.com. All rights reserved. NRIin™, the NRIin wordmark and the NRIin stamp mark are trademarks of the <a href="${SITE.ownerUrl}" target="_blank" rel="noopener">site owner</a>. Original text, data compilations, calculators, code and design are protected by copyright; reproduction without written permission is prohibited. See <a href="/copyright">Copyright &amp; trademarks</a>. Data refreshed ${esc(stamp)}.</p>
</div></footer>`;
}
