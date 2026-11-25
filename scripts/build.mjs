#!/usr/bin/env node
// NRIin.com build — zero dependencies, Node 18+.
// Runs in GitHub Actions after scripts/refresh.mjs, and locally with `node scripts/build.mjs`. It:
//  1. generates /guides/* and /countries/* pages from scripts/content/** (add a file → a page appears),
//  2. normalises every page's <head> (AdSense, fonts, icons, social cards),
//  3. bakes the shared header/footer and fills dynamic blocks <!--ni:NAME--> … <!--/ni:NAME--> from /data,
//  4. writes sitemap.xml, feed.xml, robots.txt, ads.txt, data/search-index.json, data/lastmod.json,
//  5. enforces guardrails (inbox never exposed, owner domain never shown as text, one AdSense ID,
//     sponsorship top bar on every page) — exits 1 on failure so a bad build is never published.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SITE, esc, header, footer } from './site.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p, d = null) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return d; } };
const rj = (p, d) => { try { const v = JSON.parse(rd(p)); return v == null ? d : v; } catch { return d; } };
const wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), s); };

// ---------- time (IST) ----------
const now = new Date();
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: SITE.tz }).format(now);
const fmtDate = (iso) => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: SITE.tz, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)); } catch { return ''; } };
const STAMP = fmtDate(now.toISOString());
const dayNum = Math.floor(Date.parse(TODAY + 'T00:00:00Z') / 86400000);

// ---------- data ----------
const UPD = rj('data/updates.json', { items: [] });
const REG = rj('data/regwatch.json', { items: [] });
const VID = rj('data/videos.json', { items: [], topics: [] });
const FX = rj('data/fx.json', { rates: {}, history: [] });
const AMC = rj('data/amcs.json', { amcs: [], sources: {}, watch: {} });
const TL = rj('data/timeline.json', { events: [] });
const TIPS = rj('data/tips.json', { tips: [] }).tips || [];
const CONTESTS = rj('data/contests.json', { contests: [] });
const CAREERS = rj('data/careers.json', { roles: [] });
const BRIEF = rj('data/brief.json', null);
const LASTMOD = rj('data/lastmod.json', {});
const SRC = rj('scripts/sources.json', {});
const USDINR = FX.rates && FX.rates.USD ? FX.rates.USD.toFixed(2) : '';
const OTHER_PUB = /ca-pub-(?!6620975821265271)\d{16}/g;
const EMAIL_RE = /webworksa1\s*(@|\[at\]|&#64;|%40|\(at\))\s*gmail/i;

const items = (UPD.items || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const TIP = TIPS.length ? TIPS[dayNum % TIPS.length] : '';

// ---------- helpers ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (['.git', 'node_modules', 'scripts', '.github', '_site'].includes(e.name)) continue; walk(rel, out); }
    else out.push(rel.replace(/^\.\//, ''));
  }
  return out;
}
const urlOf = (f) => { let u = '/' + f.replace(/\.html$/, ''); if (u.endsWith('/index')) u = u.slice(0, -5); return u || '/'; };
function block(html, name, content) {
  const re = new RegExp(`<!--ni:${name}(\\s[^>]*)?-->[\\s\\S]*?<!--/ni:${name}-->`, 'g');
  if (!re.test(html)) return html;
  return html.replace(re, (m, attrs = '') => `<!--ni:${name}${attrs || ''}-->${typeof content === 'function' ? content(attrs) : content}<!--/ni:${name}-->`);
}
const attr = (attrs, k) => ((attrs || '').match(new RegExp(`${k}="([^"]*)"`)) || [])[1];
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const words = (t) => new Set(String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3));
function diverse(list, n) {
  const out = [];
  for (const it of list) {
    const w = words(it.title);
    if (out.some((o) => { let inter = 0; w.forEach((x) => { if (o._w.has(x)) inter++; }); return inter / Math.max(1, Math.min(w.size, o._w.size)) > 0.5; })) continue;
    out.push(Object.assign({}, it, { _w: w })); if (out.length >= n) break;
  }
  return out;
}
const TAGNAME = { kyc: 'KYC', mf: 'Mutual funds', stocks: 'Stocks', tax: 'Tax', banking: 'Banking', gift: 'GIFT City', oci: 'OCI', property: 'Property', regulator: 'Regulator', us: 'USA', canada: 'Canada', uk: 'UK', uae: 'UAE' };
function newsList(list, opts = {}) {
  if (!list.length) return opts.empty || '';
  return `<ul class="news-list">${list.map((n) => `<li data-tags="${esc((n.tags || []).join(' '))}"><a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a><span class="nl-meta">${opts.tags ? (n.tags || []).filter((t) => TAGNAME[t]).slice(0, 3).map((t) => `<span class="tag-pill">${TAGNAME[t]}</span>`).join('') : ''}${esc(n.source || '')}${n.date ? ', ' + esc(fmtDate(n.date)) : ''}</span></li>`).join('')}</ul>`;
}
const newsFor = (tag, n = 5) => diverse(items.filter((x) => (x.tags || []).includes(tag)), n);
function videoCard(v) {
  return `<article class="vcard"><div class="yt" data-yt="${esc(v.id)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><button type="button" class="yt-play" aria-label="Play video: ${esc(v.title)}"></button></div><h3>${esc(v.title)}</h3><p class="v-meta">${esc(v.channel || '')}</p></article>`;
}
const TOPICS = VID.topics && VID.topics.length ? VID.topics : (SRC.videoQueries || []);
const topicLinks = () => `<div class="topic-grid">${TOPICS.map(([t, q]) => `<a class="topic" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>`;
const yn = (v) => (v === 'yes' ? '<span class="yes">Accepts</span>' : v === 'no' ? '<span class="no">Declines</span>' : '<span class="maybe">Unclear</span>');

// ---------- content pages: guides & countries ----------
function readContent(dir) {
  const base = path.join(ROOT, 'scripts/content', dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((f) => f.endsWith('.html')).map((f) => {
    const raw = fs.readFileSync(path.join(base, f), 'utf8');
    const m = raw.match(/^<!--meta\s+([\s\S]*?)\s*-->/);
    let meta = {}; try { meta = m ? JSON.parse(m[1]) : {}; } catch (e) { throw new Error(`Bad meta JSON in ${dir}/${f}: ${e.message}`); }
    return { slug: f.replace(/\.html$/, ''), meta, body: raw.replace(/^<!--meta[\s\S]*?-->\s*/, '') };
  });
}
const GUIDES = readContent('guides').sort((a, b) => (a.meta.cat || '').localeCompare(b.meta.cat || '') || a.meta.title.localeCompare(b.meta.title));
const COUNTRIES = readContent('countries');
const guideBy = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));
const GOTD = GUIDES.length ? GUIDES[dayNum % GUIDES.length] : null;

function shell({ title, desc, url, body, jsonld = [], tools = false }) {
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.origin}${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="NRIin">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE.origin}${url}">
<meta name="twitter:card" content="summary_large_image">
${ld}
</head>
<body>
<!--ni:header--><!--/ni:header-->
<main id="main">
${body}
</main>
<!--ni:footer--><!--/ni:footer-->
<script src="/partials.js" defer></script>${tools ? '\n<script src="/assets/tools.js" defer></script>' : ''}
</body>
</html>
`;
}
const crumbs = (trail) => `<nav class="crumbs" aria-label="Breadcrumb">${trail.map(([t, h], i) => (h && i < trail.length - 1 ? `<a href="${h}">${esc(t)}</a>` : esc(t))).join(' / ')}</nav>`;
const crumbLd = (trail) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([t, h], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: SITE.origin + (h || '') })) });
const faqLd = (faqs) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (faqs) => (faqs && faqs.length ? `<h2 id="faq">Questions people ask</h2><div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>` : '');
const toc = (body) => { const hs = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)]; return hs.length > 2 ? `<nav class="panel-flat toc" aria-label="On this page"><b>On this page</b>${hs.map((h) => `<a href="#${h[1]}">${h[2].replace(/<[^>]+>/g, '')}</a>`).join('')}</nav>` : ''; };
const leadSide = (need) => `<div class="panel-flat"><h3>Stuck on this?</h3><p class="muted">Tell us what is blocking you. We match you with a specialist who handles exactly this for non-residents.</p><a class="btn btn-stamp" style="width:100%" href="/get-help?need=${encodeURIComponent(need || '')}&amp;from=guide">Get expert help</a></div>`;

function guidePage(g) {
  const m = g.meta; const url = `/guides/${g.slug}`;
  const trail = [['Home', '/'], ['Guides', '/guides/'], [m.short || m.title, url]];
  const related = (m.related || []).map((s) => guideBy[s]).filter(Boolean);
  const sources = (m.sources || []).map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(t)}</a></li>`).join('');
  const body = `<div class="page-head"><div class="wrap">${crumbs(trail)}<h1>${esc(m.title)}</h1><p class="lead">${esc(m.desc)}</p><p class="reviewed">Last reviewed ${esc(fmtDate(m.reviewed + 'T12:00:00Z'))} by the NRIin editorial desk. ${m.read || 5} minute read.</p></div></div>
<div class="section-tight"><div class="wrap two-col">
<article class="article">
${g.body}
<div class="ad-slot" data-ad="in-article"></div>
${faqHtml(m.faqs)}
${sources ? `<h2 id="sources">Sources</h2><ul class="sources">${sources}</ul>` : ''}
<p class="reviewed">General information only, not investment, legal or tax advice. Rules for non-residents change often; confirm with the relevant regulator or a qualified professional before acting. See our <a href="/editorial-policy">editorial policy</a>.</p>
<div class="share" data-ni-share></div>
</article>
<aside class="sticky-side">
${m.tool ? `<a class="tool feature" href="${esc(m.tool[0])}"><span>Free tool</span><b>${esc(m.tool[1])}</b><span class="go">Open the tool</span></a>` : ''}
${toc(g.body)}
${leadSide(m.cat)}
${related.length ? `<div class="panel-flat"><h3>Read next</h3>${related.map((r) => `<p><a href="/guides/${r.slug}">${esc(r.meta.short || r.meta.title)}</a></p>`).join('')}</div>` : ''}
<div class="ad-slot" data-ad="sidebar"></div>
</aside>
</div></div>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: m.title, description: m.desc, dateModified: m.reviewed, datePublished: m.published || m.reviewed, author: { '@type': 'Organization', name: 'NRIin editorial desk', url: SITE.origin + '/about' }, publisher: { '@type': 'Organization', name: 'NRIin', logo: { '@type': 'ImageObject', url: SITE.origin + '/favicon.svg' } }, mainEntityOfPage: SITE.origin + url }, crumbLd(trail)];
  if (m.faqs && m.faqs.length) ld.push(faqLd(m.faqs));
  return shell({ title: `${m.title} | NRIin`, desc: m.desc, url, body, jsonld: ld });
}
function guidesIndex() {
  const cats = [...new Set(GUIDES.map((g) => g.meta.cat))];
  const body = `<div class="page-head"><div class="wrap">${crumbs([['Home', '/'], ['Guides', '/guides/']])}<h1>Guides for investing in India from abroad</h1><p class="lead">Plain-language explanations of the rules that trip up NRIs and OCI cardholders — accounts, KYC, stocks, mutual funds and tax. Each guide is reviewed against regulator sources and dated.</p></div></div>
<div class="section-tight"><div class="wrap">${cats.map((c) => `<h2 style="margin-top:28px">${esc(c)}</h2><div class="glist">${GUIDES.filter((g) => g.meta.cat === c).map((g) => `<a href="/guides/${g.slug}"><b>${esc(g.meta.title)}</b><span>${esc(g.meta.desc)}</span></a>`).join('')}</div>`).join('')}
<div class="ad-slot" data-ad="display"></div></div></div>`;
  return shell({ title: 'Guides for NRIs and OCIs investing in India | NRIin', desc: 'Plain-language guides on NRE and NRO accounts, KYC, PIS, mutual funds for US and Canada NRIs, PFIC, TDS, DTAA and repatriation.', url: '/guides/', body, jsonld: [crumbLd([['Home', '/'], ['Guides', '/guides/']])] });
}
function countryPage(c) {
  const m = c.meta; const url = `/countries/${c.slug}`;
  const trail = [['Home', '/'], ['By country', '/countries/'], [m.name, url]];
  const tagKey = { usa: 'us', canada: 'canada', uk: 'uk', uae: 'uae' }[c.slug];
  const related = (m.related || []).map((s) => guideBy[s]).filter(Boolean);
  const body = `<div class="page-head"><div class="wrap">${crumbs(trail)}<h1>${esc(m.title.replace(/: the NRI.*$/, ''))}</h1><p class="lead">${esc(m.desc)}</p><p class="reviewed">Last reviewed ${esc(fmtDate(m.reviewed + 'T12:00:00Z'))}.</p></div></div>
<div class="section-tight"><div class="wrap two-col">
<article class="article">
<dl class="kv panel-flat" style="margin-bottom:24px">${(m.facts || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
${c.body}
${tagKey ? `<!--ni:news tag="${tagKey}"--><!--/ni:news-->` : ''}
<div class="ad-slot" data-ad="in-article"></div>
<p class="reviewed">General information only, not tax or investment advice. Tax rules in ${esc(m.name)} and India change; confirm with a qualified cross-border professional.</p>
<div class="share" data-ni-share></div>
</article>
<aside class="sticky-side">
<a class="tool feature" href="/path-finder?country=${encodeURIComponent(m.country || m.name)}"><span>Free tool</span><b>Your investing path from ${esc(m.name)}</b><span class="go">Open the path finder</span></a>
${leadSide(m.name + ' investor')}
${related.length ? `<div class="panel-flat"><h3>Guides for you</h3>${related.map((r) => `<p><a href="/guides/${r.slug}">${esc(r.meta.short || r.meta.title)}</a></p>`).join('')}</div>` : ''}
</aside>
</div></div>`;
  return shell({ title: `${m.title} | NRIin`, desc: m.desc, url, body, jsonld: [crumbLd(trail)] });
}
function countriesIndex() {
  const body = `<div class="page-head"><div class="wrap">${crumbs([['Home', '/'], ['By country', '/countries/']])}<h1>Investing in India, country by country</h1><p class="lead">Where you live changes which fund houses accept you, how your home country taxes Indian gains and which treaty documents you need.</p></div></div>
<div class="section-tight"><div class="wrap"><div class="glist">${COUNTRIES.map((c) => `<a href="/countries/${c.slug}"><b>${esc(c.meta.name)}</b><span>${esc(c.meta.desc)}</span></a>`).join('')}</div>
<p class="muted" style="margin-top:24px">Live somewhere else? The <a href="/path-finder">path finder</a> covers every country, and we add new country guides regularly.</p></div></div>`;
  return shell({ title: 'Investing in India by country of residence | NRIin', desc: 'Country guides for NRIs and OCIs in the USA, Canada, UK, UAE, Singapore and Australia investing in Indian stocks and mutual funds.', url: '/countries/', body, jsonld: [crumbLd([['Home', '/'], ['By country', '/countries/']])] });
}
// regenerate generated pages from source every run (manual edits there are overwritten)
for (const g of GUIDES) wr(`guides/${g.slug}.html`, guidePage(g));
wr('guides/index.html', guidesIndex());
for (const c of COUNTRIES) wr(`countries/${c.slug}.html`, countryPage(c));
wr('countries/index.html', countriesIndex());

// ---------- dynamic blocks ----------
const tlSorted = (TL.events || []).slice().sort((a, b) => b.date.localeCompare(a.date));
function timeline(n) {
  return `<ol class="tl">${tlSorted.slice(0, n || 99).map((e) => { const done = e.date <= TODAY; return `<li class="${done ? 'done' : ''}"><time datetime="${esc(e.date)}">${esc(fmtDate(e.date + 'T12:00:00Z'))} <span class="badge ${done ? 'ok' : ''}">${done ? 'In effect' : `Starts <span data-countdown="${esc(e.date)}">soon</span>`}</span> <span class="badge">${esc(e.tag)}</span></time><h3><a href="${esc(e.url)}">${esc(e.title)}</a></h3><p>${esc(e.body)}</p></li>`; }).join('')}</ol>`;
}
function briefHtml() {
  if (!BRIEF || !BRIEF.points || !BRIEF.points.length) return '';
  const pts = BRIEF.points.map((p, i) => (BRIEF.links && BRIEF.links[i] ? `<li><a href="${esc(safeUrl(BRIEF.links[i]))}" target="_blank" rel="noopener nofollow">${esc(p)}</a></li>` : `<li>${esc(p)}</li>`)).join('');
  return `<div class="brief"><h3>Today's brief, ${esc(fmtDate(BRIEF.date + 'T12:00:00Z'))}</h3><ul>${pts}</ul><p class="muted" style="font-size:.8rem;margin:0">${BRIEF.mode === 'ai' ? 'Summarised automatically from the linked headlines below; check the original sources.' : 'Selected automatically from the day’s headlines.'}</p></div>`;
}
const FXC = [['USD', 'US dollar'], ['CAD', 'Canadian dollar'], ['GBP', 'British pound'], ['EUR', 'Euro'], ['AED', 'UAE dirham'], ['SGD', 'Singapore dollar'], ['AUD', 'Australian dollar'], ['SAR', 'Saudi riyal'], ['QAR', 'Qatari riyal'], ['KWD', 'Kuwaiti dinar'], ['OMR', 'Omani rial'], ['BHD', 'Bahraini dinar'], ['NZD', 'NZ dollar'], ['HKD', 'Hong Kong dollar'], ['JPY', 'Japanese yen'], ['CHF', 'Swiss franc']];
function fxChange(c) {
  const h = (FX.history || []).filter((x) => x[c]); if (h.length < 2) return '';
  const a = h[h.length - 1][c], b = (h.length > 30 ? h[h.length - 31] : h[0])[c];
  const pct = ((a - b) / b) * 100; return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
const fxv = (v) => (v == null ? '—' : v < 10 ? v.toFixed(3) : v.toFixed(2));

const BLOCKS = {
  stamp: STAMP,
  'home-today': () => `<div class="today-grid"><div class="panel">${briefHtml()}<div style="margin-top:${BRIEF ? '22px' : '0'}"><div class="sec-head" style="margin-bottom:6px"><h3 style="margin:0"><span class="live-dot" aria-hidden="true"></span> Latest news for NRI investors</h3><a href="/updates">All updates</a></div>${newsList(diverse(items, 7), { tags: true, empty: '<p class="muted">Headlines refresh twice a day. <a href="/updates">Open the updates page</a>.</p>' })}</div></div>
<div class="side-stack">${TIP ? `<div class="tip"><h3>Tip of the day</h3><p>${esc(TIP)}</p></div>` : ''}
<div class="panel-flat"><div class="sec-head" style="margin-bottom:4px"><h3 style="margin:0">Rupee today</h3><a href="/rates">All rates</a></div><table class="fx-mini">${FXC.slice(0, 7).map(([c, n]) => `<tr><td>${n}</td><td><span data-ni-fx="${c}">${fxv(FX.rates[c])}</span></td></tr>`).join('')}</table><p class="muted" style="font-size:.78rem;margin:8px 0 0">Rupees per unit. Indicative mid-market rates, refreshed daily.</p></div>
${GOTD ? `<a class="tool" href="/guides/${GOTD.slug}"><span>Guide of the day</span><b>${esc(GOTD.meta.short || GOTD.meta.title)}</b><span>${esc(GOTD.meta.desc)}</span></a>` : ''}</div></div>`,
  timeline: (attrs) => timeline(+attr(attrs, 'n') || 0),
  'home-guides': () => `<div class="glist">${GUIDES.slice().sort((a, b) => (b.meta.reviewed || '').localeCompare(a.meta.reviewed || '')).slice(0, 8).map((g) => `<a href="/guides/${g.slug}"><b>${esc(g.meta.short || g.meta.title)}</b><span>${esc(g.meta.desc)}</span></a>`).join('')}</div>`,
  'home-videos': () => ((VID.items || []).length ? `<div class="vgrid">${VID.items.slice(0, 3).map(videoCard).join('')}</div>` : topicLinks()),
  updates: () => {
    const recent = items.slice(0, 200);
    if (!recent.length) return '<p class="muted">The first automated refresh runs within hours of publishing; headlines appear here after each cycle.</p>';
    const groups = {};
    for (const n of recent) { const dd = (n.date || '').slice(0, 10) || 'Recent'; (groups[dd] = groups[dd] || []).push(n); }
    return Object.entries(groups).map(([dd, list]) => `<section class="ud-day"><h2 style="font-size:1.15rem;margin-top:26px">${esc(fmtDate(dd + 'T12:00:00Z'))}</h2>${newsList(list, { tags: true })}</section>`).join('');
  },
  'updates-count': () => String(items.length),
  regwatch: () => {
    const list = (REG.items || []).filter((x) => x.nri).slice(0, 8);
    const all = (REG.items || []).slice(0, 8);
    const use = list.length ? list : all;
    return use.length ? newsList(use) : '<p class="muted">Regulator feeds are checked twice a day.</p>';
  },
  news: (attrs) => { const l = newsFor(attr(attrs, 'tag'), 6); return l.length ? `<h2 id="news">Latest news</h2>${newsList(l)}<p class="reviewed">Refreshed automatically ${esc(STAMP)}. Headlines link to their original publishers.</p>` : ''; },
  videos: () => ((VID.items || []).length ? `<div class="vgrid">${VID.items.slice(0, 30).map(videoCard).join('')}</div>` : '<p class="muted">New explainer videos are added automatically on each refresh. Meanwhile, start with the topics below.</p>'),
  'video-topics': topicLinks,
  'amc-table': () => `<div class="table-wrap"><table class="data-table" id="amc-table"><thead><tr><th scope="col">Fund house</th><th scope="col">US residents</th><th scope="col">Canada residents</th><th scope="col">How to apply</th><th scope="col">Conditions</th><th scope="col">Website check</th></tr></thead><tbody>${(AMC.amcs || []).map((a) => {
    const w = (AMC.watch || {})[a.id] || {};
    const watch = w.changed && w.changed >= new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) ? `<span class="badge warn">Page changed ${esc(fmtDate(w.changed + 'T12:00:00Z'))} — re-verify</span>` : w.checked ? `<span class="badge ok">Checked ${esc(fmtDate(w.checked + 'T12:00:00Z'))}</span>` : '<span class="badge">Pending</span>';
    return `<tr data-mode="${esc(/online/i.test(a.mode) ? 'online' : /offline/i.test(a.mode) ? 'offline' : 'unknown')}"><th scope="row"><a href="${esc(a.site)}" target="_blank" rel="noopener nofollow">${esc(a.name)}</a><br><small class="muted">Registrar: ${esc(a.registrar)}</small></th><td>${yn(a.us)}</td><td>${yn(a.ca)}</td><td>${esc(a.mode)}</td><td>${esc(a.conditions)}<br><small class="muted">Sources: ${(a.sources || []).map((s) => AMC.sources[s] ? `<a href="${esc(AMC.sources[s].url)}" target="_blank" rel="noopener nofollow">${esc(AMC.sources[s].name.split(' — ')[0])}</a>` : '').join(', ')}; last verified ${esc(fmtDate(a.lastVerified + 'T12:00:00Z'))}</small></td><td>${watch}</td></tr>`;
  }).join('')}</tbody></table></div>`,
  'amc-count': () => String((AMC.amcs || []).length),
  'amc-options': () => (AMC.amcs || []).map((a) => `<option>${esc(a.name)}</option>`).join(''),
  'fx-table': () => `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Currency</th><th scope="col">Rupees per unit</th><th scope="col">Units per ₹1,00,000</th><th scope="col">Change, 30 days</th></tr></thead><tbody>${FXC.map(([c, n]) => `<tr><th scope="row">${n} <small class="muted">${c}</small></th><td><b data-ni-fx="${c}">${fxv(FX.rates[c])}</b></td><td>${FX.rates[c] ? (100000 / FX.rates[c]).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}</td><td>${fxChange(c) || '—'}</td></tr>`).join('')}</tbody></table></div><p class="muted" style="font-size:.85rem">Source: ${esc(FX.source || 'open exchange-rate feeds')}. Updated ${esc(FX.updated ? fmtDate(FX.updated) : STAMP)}; the table also refreshes live in your browser. Banks and remittance services add a margin to these mid-market rates.</p>`,
  'fx-json': () => JSON.stringify({ rates: FX.rates || {}, history: (FX.history || []).slice(-90) }).replace(/</g, '\\u003c'),
  contests: () => (CONTESTS.contests || []).map((c) => `<article class="ccard" id="${esc(c.id)}"><span class="badge ${c.status === 'open' ? 'ok' : ''}">${esc(c.statusLabel || c.status)}</span><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p><ul class="facts"><li><b>Prize</b> ${esc(c.prize)}</li><li><b>Who</b> ${esc(c.who)}</li><li><b>When</b> ${esc(c.timeline)}</li></ul><a class="btn btn-line btn-sm" href="#enter" data-prefill="contest=${esc(c.title)}">${c.status === 'open' ? 'Enter now' : 'Register interest'}</a></article>`).join(''),
  'contest-options': () => (CONTESTS.contests || []).map((c) => `<option>${esc(c.title)}</option>`).join(''),
  careers: () => (CAREERS.roles || []).map((r) => `<article class="ccard"><span class="badge">${esc(r.type)}</span><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p><ul class="checks">${(r.points || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="muted" style="font-size:.88rem">${esc(r.location)}. ${esc(r.pay)}.</p><a class="btn btn-line btn-sm" href="#apply" data-prefill="role=${esc(r.title)}">Apply for this role</a></article>`).join(''),
  'career-options': () => (CAREERS.roles || []).map((r) => `<option>${esc(r.title)}</option>`).join(''),
  counts: () => `${GUIDES.length} guides, ${COUNTRIES.length} country pages, ${(AMC.amcs || []).length} fund houses tracked and ${items.length} recent headlines`,
};

// ---------- head normalisation ----------
const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">';
function normalizeHead(html, file) {
  const isNoindex = /<meta name="robots" content="noindex/i.test(html);
  const noAds = isNoindex || /data-noads/.test(html) || file === '404.html';
  html = html.replace(/<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>\s*/g, '');
  html = html.replace(/<meta name="google-adsense-account"[^>]*>\s*/g, '');
  const add = [];
  add.push(`<meta name="google-adsense-account" content="${SITE.adsenseClient}">`);
  if (!noAds) add.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>`);
  if (!/fonts\.googleapis\.com\/css2/.test(html)) add.push(FONT);
  if (!/href="\/styles\.css"/.test(html)) add.push('<link rel="stylesheet" href="/styles.css">');
  if (!/property="og:image"/.test(html)) add.push(`<meta property="og:image" content="${SITE.origin}/og-image.png">`);
  if (!/name="twitter:image"/.test(html)) add.push(`<meta name="twitter:image" content="${SITE.origin}/og-image.png">`);
  if (!/rel="icon"/.test(html)) add.push('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  if (!/rel="apple-touch-icon"/.test(html)) add.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  if (!/name="theme-color"/.test(html)) add.push('<meta name="theme-color" content="#14213d">');
  if (!/rel="manifest"/.test(html)) add.push('<link rel="manifest" href="/site.webmanifest">');
  if (!/application\/rss\+xml/.test(html)) add.push(`<link rel="alternate" type="application/rss+xml" title="NRIin updates" href="${SITE.origin}/feed.xml">`);
  html = html.replace(/<\/head>/, add.join('\n') + '\n</head>');
  if (!/src="\/partials\.js"/.test(html)) html = html.replace(/<\/body>/, '<script src="/partials.js" defer></script>\n</body>');
  return html;
}
function fillBlocks(html) {
  html = block(html, 'header', '\n' + header({ stamp: STAMP, usdinr: USDINR }) + '\n');
  html = block(html, 'footer', '\n' + footer({ stamp: STAMP, year: SITE.year }) + '\n');
  for (const [name, fn] of Object.entries(BLOCKS)) html = block(html, name, typeof fn === 'function' ? fn : () => fn);
  // internal .html links -> clean URLs
  html = html.replace(/href="(\/[^"#?]*?)\.html(#[^"]*)?"/g, (m, h, hash = '') => `href="${h.replace(/\/index$/, '/')}${hash}"`);
  return html;
}

// ---------- run ----------
const files = walk('.');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const pages = [];
for (const f of htmlFiles) {
  let html = rd(f);
  const before = html;
  html = normalizeHead(html, f);
  html = fillBlocks(html);
  if (html !== before) wr(f, html);
  pages.push({ f, html });
}

// ---------- lastmod (content hash excluding chrome and stamps) ----------
const strip = (h) => h.replace(/<!--ni:(header|footer|stamp|home-today|counts|fx-table|fx-json)[\s\S]*?<!--\/ni:\1-->/g, '').replace(/Refreshed automatically [^<.]+/g, '');
const lm = {};
for (const p of pages) {
  const h = crypto.createHash('sha1').update(strip(p.html)).digest('hex').slice(0, 12);
  const prev = LASTMOD[p.f];
  lm[p.f] = prev && prev.h === h ? prev : { h, d: TODAY };
}
wr('data/lastmod.json', JSON.stringify(lm));

// ---------- sitemap / search index / feed ----------
const meta = (h, re) => ((h.match(re) || [])[1] || '').replace(/\s+/g, ' ').trim();
const indexable = pages.filter((p) => !/<meta name="robots" content="noindex/i.test(p.html) && p.f !== '404.html');
const prio = (u) => (u === '/' ? '1.0' : /^\/(kyc-checker|path-finder|amc-directory|get-help|updates)$/.test(u) ? '0.9' : /^\/(guides|countries)\//.test(u) ? '0.8' : '0.6');
const sm = indexable.map((p) => { const u = urlOf(p.f); return `  <url><loc>${SITE.origin}${u}</loc><lastmod>${lm[p.f].d}</lastmod><changefreq>${/^\/(|updates|videos|rates|amc-directory)$/.test(u) ? 'daily' : 'weekly'}</changefreq><priority>${prio(u)}</priority></url>`; }).sort();
wr('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm.join('\n')}\n</urlset>\n`);

const kind = (u) => (u.startsWith('/guides/') ? 'Guide' : u.startsWith('/countries/') ? 'Country' : /checker|finder|check|calculator|directory|rates|status/.test(u) ? 'Tool' : 'Page');
const idx = indexable.map((p) => {
  const u = urlOf(p.f);
  const t = meta(p.html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, '') || meta(p.html, /<title>([^<]*)/).replace(/\s*\|\s*NRIin.*$/, '');
  return { t: t.replace(/&amp;/g, '&').replace(/&#39;/g, "'"), u, d: meta(p.html, /<meta name="description" content="([^"]*)"/).replace(/&amp;/g, '&').replace(/&#39;/g, "'").slice(0, 160), k: kind(u) };
});
wr('data/search-index.json', JSON.stringify(idx));

const rfc822 = (dd) => new Date(dd || now).toUTCString();
const feedItems = items.slice(0, 40).map((n) => `<item><title>${esc(n.title)}</title><link>${esc(safeUrl(n.url))}</link><guid isPermaLink="false">${esc(n.id || n.url)}</guid><pubDate>${rfc822(n.date)}</pubDate><source url="${SITE.origin}/updates">${esc(n.source || 'NRIin')}</source></item>`).join('\n');
const guideItems = GUIDES.map((g) => `<item><title>${esc(g.meta.title)}</title><link>${SITE.origin}/guides/${g.slug}</link><guid isPermaLink="true">${SITE.origin}/guides/${g.slug}</guid><pubDate>${rfc822(g.meta.reviewed + 'T06:00:00Z')}</pubDate><description>${esc(g.meta.desc)}</description></item>`).join('\n');
wr('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>NRIin — Investing in India from abroad</title><link>${SITE.origin}/updates</link><description>Daily rule changes, news and guides for NRIs and OCI cardholders investing in Indian stocks and mutual funds.</description><language>en</language><lastBuildDate>${now.toUTCString()}</lastBuildDate>\n${guideItems}\n${feedItems}\n</channel></rss>\n`);

wr('robots.txt', `User-agent: *\nAllow: /\nDisallow: /scripts/\nDisallow: /data/lastmod.json\nDisallow: /data/refresh-log.json\n\nSitemap: ${SITE.origin}/sitemap.xml\n`);
wr('ads.txt', `google.com, ${SITE.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
wr('data/build.json', JSON.stringify({ built: now.toISOString(), date: TODAY, stamp: STAMP, pages: pages.length, indexable: indexable.length, guides: GUIDES.length, countries: COUNTRIES.length, updates: items.length, videos: (VID.items || []).length, usdinr: USDINR }, null, 1));

// ---------- guardrails ----------
const problems = [];
const deployable = walk('.').filter((f) => !/^(README\.md|data\/pages-status\.json)$/.test(f));
for (const f of deployable) {
  if (!/\.(html|js|json|xml|txt|css|svg|webmanifest)$/.test(f)) continue;
  const s = rd(f, '');
  if (EMAIL_RE.test(s)) problems.push(`inbox address exposed in ${f}`);
  OTHER_PUB.lastIndex = 0; if (OTHER_PUB.test(s)) problems.push(`other AdSense publisher ID in ${f}`);
}
for (const p of pages) {
  const h = rd(p.f);
  if (p.f !== '404.html' && !/class="topbar"/.test(h)) problems.push(`no sponsorship top bar: ${p.f}`);
  // the owner's domain may sit inside a link's href, never in visible text
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ');
  if (/web\.works|webworks/i.test(visible)) problems.push(`owner domain shown as text in ${p.f}`);
  if (/formsubmit\.co\/(ajax\/)?[\w.-]+/i.test(h) || /action="[^"]*formsubmit/i.test(h)) problems.push(`form endpoint written into ${p.f}`);
  if (!/<title>[^<]{10,}<\/title>/.test(h)) problems.push(`missing or short <title>: ${p.f}`);
}
if (problems.length) { console.error('GUARDRAIL FAILURES:\n' + problems.join('\n')); process.exit(1); }
console.log(`build ok · ${pages.length} pages (${indexable.length} indexable) · ${GUIDES.length} guides · ${COUNTRIES.length} countries · ${items.length} updates · ${(VID.items || []).length} videos · USD/INR ${USDINR || '—'} · ${STAMP}`);
