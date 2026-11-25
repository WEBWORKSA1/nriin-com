#!/usr/bin/env node
// NRIin.com daily refresh — zero dependencies, Node 18+.
// Runs in GitHub Actions twice a day (.github/workflows/daily-refresh.yml) and can be run locally.
// Pulls, into /data:
//   updates.json   NRI investing news (Google News RSS per topic) + regulator feeds
//   regwatch.json  SEBI / RBI items that mention non-residents (the "Regulatory radar")
//   videos.json    explainer videos (YouTube Data API if YOUTUBE_API_KEY is set, else public search)
//   fx.json        INR against 15 currencies, with 120 days of history
//   amcs.json      daily website check of every fund house in the US/Canada directory
//   brief.json     today's short brief (Claude API if ANTHROPIC_API_KEY is set, else extractive)
// Every source is optional: a failure is logged in data/refresh-log.json and skipped, never fatal.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rj = (p, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return d; } };
const wj = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o, null, 1) + '\n');
const UA = 'Mozilla/5.0 (compatible; NRIinBot/1.0; +https://nriin.com/editorial-policy)';
const SRC = rj('scripts/sources.json', {});
const log = { started: new Date().toISOString(), feeds: [], errors: [] };
const MAX_AGE_DAYS = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, ms = 15000, headers = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.8', ...headers }, signal: ctl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
const decode = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };
function parseRss(xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((it) => ({
    title: tag(it, 'title'), url: tag(it, 'link'), date: tag(it, 'pubDate') || tag(it, 'dc:date'), source: tag(it, 'source'),
  })).filter((x) => x.title && /^https?:\/\//.test(x.url));
}
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const iso = (d) => { const t = Date.parse(d); return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString(); };

// topic tags: drive the filter chips on /updates and the per-page news blocks
const KW = {
  kyc: [/\bkyc\b/i, /\bkra\b/i, /know your (client|customer)/i, /re-?kyc/i],
  mf: [/mutual fund/i, /\bamc\b/i, /\bsip\b/i, /\bamfi\b/i],
  stocks: [/\bshares?\b/i, /stock market/i, /equit/i, /portfolio investment/i, /\bpis\b/i, /\bipo\b/i, /demat/i],
  tax: [/\btax/i, /\btds\b/i, /\bdtaa\b/i, /treaty/i, /\bitr\b/i, /capital gains/i, /\bpfic\b/i],
  banking: [/\bnre\b/i, /\bnro\b/i, /fcnr/i, /deposit/i, /remittance/i, /repatriat/i, /\brupee\b/i],
  gift: [/gift city/i, /\bifsc/i, /ifsca/i, /gift nifty/i],
  oci: [/\boci\b/i, /overseas citizen/i],
  property: [/property/i, /real estate/i, /\bland\b/i],
  regulator: [/\bsebi\b/i, /\brbi\b/i, /\bfema\b/i, /\bcbdt\b/i, /income tax department/i],
  us: [/\bus\b|\busa\b|united states|america|\birs\b/i], canada: [/canad/i], uk: [/\buk\b|britain|united kingdom|hmrc/i], uae: [/\buae\b|dubai|abu dhabi|emirates/i],
};
const RELEVANT = /\bnri|non-resident|non resident|\boci\b|overseas indian|diaspora|\bpis\b|fema|gift city|ifsc|nre\b|nro\b|fcnr|repatriat|remittance|dtaa|pfic|proi/i;
const SCAM = /lottery|giveaway|betting|casino|astrolog|horoscope/i;
function tagsFor(title, seed) {
  const t = new Set(seed || []);
  for (const [k, res] of Object.entries(KW)) if (res.some((r) => r.test(title))) t.add(k);
  return [...t].filter((x) => x !== 'general');
}
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:30d')}&hl=en-IN&gl=IN&ceid=IN:en`;

async function news() {
  const prev = rj('data/updates.json', { items: [] }).items || [];
  const fresh = [];
  for (const { q, tags } of SRC.newsQueries || []) {
    try {
      let xml;
      try { xml = await get(gnews(q)); }
      catch (e) { if (!/429|5\d\d/.test(e.message)) throw e; await sleep(9000); xml = await get(gnews(q)); }
      const list = parseRss(xml).slice(0, 15).map((x) => {
        let title = x.title, source = x.source;
        const m = title.match(/^(.*)\s+-\s+([^-]{2,60})$/); if (m) { title = m[1]; source = source || m[2]; }
        return { title, url: x.url, date: iso(x.date), source, tags: tagsFor(title, tags), via: 'gnews' };
      });
      fresh.push(...list); log.feeds.push({ q, n: list.length });
    } catch (e) { log.errors.push(`news "${q}": ${e.message}`); }
    await sleep(2500);
  }
  const reg = [];
  for (const f of SRC.rss || []) {
    try {
      const all = parseRss(await get(f.url)).slice(0, 60);
      const list = all.filter((x) => RELEVANT.test(x.title) || /\bkyc\b|foreign portfolio|foreign investment|overseas/i.test(x.title))
        .map((x) => ({ title: x.title, url: x.url, date: iso(x.date), source: f.name, tags: tagsFor(x.title, ['regulator']), via: 'rss' }));
      reg.push(...all.slice(0, 15).map((x) => ({ title: x.title, url: x.url, date: iso(x.date), source: f.name, nri: RELEVANT.test(x.title) || /\bkyc\b|foreign/i.test(x.title) })));
      fresh.push(...list); log.feeds.push({ rss: f.name, n: list.length, total: all.length });
    } catch (e) { log.errors.push(`rss ${f.name}: ${e.message}`); }
  }
  if (reg.length) {
    const prevReg = rj('data/regwatch.json', { items: [] }).items || [];
    const seenR = new Set(); const items = [];
    for (const r of [...reg, ...prevReg]) { const k = norm(r.title).slice(0, 90); if (seenR.has(k)) continue; seenR.add(k); items.push(r); }
    items.sort((a, b) => b.date.localeCompare(a.date));
    wj('data/regwatch.json', { updated: new Date().toISOString(), items: items.slice(0, 60) });
  }
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const seen = new Map();
  for (const raw of [...fresh, ...prev]) {
    if (!raw.title || Date.parse(raw.date) < cutoff || SCAM.test(raw.title)) continue;
    const it = { ...raw, tags: tagsFor(raw.title, raw.tags) };
    if (it.via === 'gnews' && !RELEVANT.test(it.title) && !(it.tags || []).some((t) => ['kyc', 'gift', 'oci'].includes(t))) continue;
    const k = norm(it.title).slice(0, 90);
    if (seen.has(k)) { const ex = seen.get(k); ex.tags = [...new Set([...(ex.tags || []), ...(it.tags || [])])]; continue; }
    seen.set(k, { ...it, id: crypto.createHash('sha1').update(k).digest('hex').slice(0, 16) });
  }
  const items = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 400);
  if (items.length || !prev.length) wj('data/updates.json', { updated: new Date().toISOString(), count: items.length, items });
  log.news = items.length;
}

// ---------------- videos ----------------
const VKW = /nri|non.?resident|\boci\b|nre|nro|demat|mutual fund|kyc|pfic|gift city|repatriat|15ca|dtaa|capital gains|invest(ing|ment)? in india|fema/i;
const PROMO = /use code|coupon|discount|promo|offer ends|limited offer|free course|\bcode:|giveaway|#shorts/i;
async function channelId(handle) {
  const html = await get(`https://www.youtube.com/${handle.startsWith('@') ? handle : '@' + handle}`);
  const m = html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
  if (!m) throw new Error('no channel id'); return m[1];
}
async function ytSearchPublic(q, label) {
  // public results page, filtered to this year's uploads; parses the embedded initial data
  const html = await get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIIBQ%253D%253D&hl=en`, 20000, { 'Accept-Language': 'en-US,en;q=0.8', Cookie: 'CONSENT=YES+1' });
  const out = []; const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,1500}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"[\s\S]{0,2500}?"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
  let m; while ((m = re.exec(html)) && out.length < 4) {
    const title = JSON.parse('"' + m[2] + '"'), channel = JSON.parse('"' + m[3] + '"');
    if (!VKW.test(title) || PROMO.test(title)) continue;
    out.push({ id: m[1], title, channel, date: new Date().toISOString(), topic: label, via: 'search' });
  }
  return out;
}
async function videos() {
  const prev = rj('data/videos.json', { items: [] });
  const out = [];
  const key = process.env.YOUTUBE_API_KEY;
  for (const [label, q] of SRC.videoQueries || []) {
    try {
      if (key) {
        const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=4&order=relevance&safeSearch=strict&videoEmbeddable=true&publishedAfter=${encodeURIComponent(new Date(Date.now() - 365 * 864e5).toISOString())}&q=${encodeURIComponent(q)}&key=${key}`;
        const j = JSON.parse(await get(u));
        for (const it of j.items || []) { const v = { id: it.id.videoId, title: decode(it.snippet.title), channel: decode(it.snippet.channelTitle), date: it.snippet.publishedAt, topic: label, via: 'api' }; if (!PROMO.test(v.title)) out.push(v); }
      } else {
        out.push(...await ytSearchPublic(q, label));
      }
      log.feeds.push({ yt: label });
    } catch (e) { log.errors.push(`yt "${q}": ${e.message}`); }
    await sleep(1500);
  }
  for (const ch of SRC.youtubeChannels || []) {
    try {
      const id = ch.id || await channelId(ch.handle);
      const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
      const entries = (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).map((e) => ({
        id: (e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/) || [])[1], title: tag(e, 'title'), channel: ch.name || tag(xml, 'title'), date: tag(e, 'published'), topic: ch.topic || '', via: 'channel',
      })).filter((v) => v.id && VKW.test(v.title) && !PROMO.test(v.title)).slice(0, ch.max || 6);
      out.push(...entries);
    } catch (e) { log.errors.push(`yt ${ch.name || ch.handle}: ${e.message}`); }
  }
  // keep the first-seen date for videos found via public search (no publish date there)
  const prevMap = new Map((prev.items || []).map((v) => [v.id, v]));
  const seen = new Set(); const items = [];
  for (const v of [...out, ...(prev.items || [])]) {
    if (!v.id || seen.has(v.id) || PROMO.test(v.title || '')) continue; seen.add(v.id);
    const old = prevMap.get(v.id); if (old && v.via === 'search') v.date = old.date;
    items.push(v);
  }
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (items.length) wj('data/videos.json', { updated: new Date().toISOString(), topics: SRC.videoQueries || [], items: items.slice(0, 60) });
  log.videos = items.length;
}

// ---------------- exchange rates ----------------
const CCY = ['USD', 'CAD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'NZD', 'HKD', 'JPY', 'CHF'];
async function fx() {
  const prev = rj('data/fx.json', { history: [] });
  let rates = null, source = '';
  try {
    const j = JSON.parse(await get('https://open.er-api.com/v6/latest/USD'));
    if (j.result === 'success' && j.rates && j.rates.INR) { rates = {}; for (const c of CCY) if (j.rates[c]) rates[c] = +(j.rates.INR / j.rates[c]).toFixed(4); source = 'ExchangeRate-API (open access)'; }
  } catch (e) { log.errors.push('fx primary: ' + e.message); }
  if (!rates) {
    try {
      const j = JSON.parse(await get('https://api.frankfurter.app/latest?from=INR'));
      rates = {}; for (const c of CCY) if (j.rates && j.rates[c]) rates[c] = +(1 / j.rates[c]).toFixed(4); source = 'European Central Bank via Frankfurter';
    } catch (e) { log.errors.push('fx fallback: ' + e.message); }
  }
  if (!rates || !rates.USD) return;
  const day = new Date().toISOString().slice(0, 10);
  const hist = (prev.history || []).filter((h) => h.d !== day);
  hist.push({ d: day, ...Object.fromEntries(['USD', 'CAD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD'].map((c) => [c, rates[c]])) });
  hist.sort((a, b) => a.d.localeCompare(b.d));
  wj('data/fx.json', { updated: new Date().toISOString(), source, base: 'INR per unit of currency', rates, history: hist.slice(-120) });
  log.fx = rates.USD;
}

// ---------------- fund house website watch ----------------
async function watchAmcs() {
  const A = rj('data/amcs.json', null); if (!A) return;
  A.watch = A.watch || {};
  const today = new Date().toISOString().slice(0, 10);
  for (const a of A.amcs || []) {
    const w = A.watch[a.id] || {};
    try {
      const html = await get(a.site, 20000);
      const text = decode(html);
      // only sentences that talk about US/Canada investors, so routine homepage changes do not trigger alerts
      const hits = (text.match(/[^.!?]{0,220}(U\.S\.|\bUSA\b|United States|Canada|FATCA)[^.!?]{0,220}[.!?]/g) || []).map((s) => s.trim()).sort();
      const h = crypto.createHash('sha1').update(hits.join('|')).digest('hex').slice(0, 12);
      if (w.hash && w.hash !== h && hits.length) w.changed = today;
      Object.assign(w, { checked: today, ok: true, hash: h, mentions: hits.length });
    } catch (e) {
      Object.assign(w, { checked: today, ok: false, error: e.message });
      log.errors.push(`watch ${a.id}: ${e.message}`);
    }
    A.watch[a.id] = w;
    await sleep(800);
  }
  wj('data/amcs.json', A);
  log.watch = Object.values(A.watch).filter((x) => x.ok).length;
}

// ---------------- daily brief ----------------
async function brief() {
  const U = rj('data/updates.json', { items: [] });
  const R = rj('data/regwatch.json', { items: [] });
  const since = Date.now() - 3 * 864e5;
  const recent = (U.items || []).filter((x) => Date.parse(x.date) > since).slice(0, 25);
  const regs = (R.items || []).filter((x) => x.nri).slice(0, 5);
  const day = new Date().toISOString().slice(0, 10);
  let out = null;
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && recent.length) {
    try {
      const list = recent.map((x, i) => `${i + 1}. ${x.title} (${x.source || 'news'}, ${x.date.slice(0, 10)})`).join('\n');
      const body = {
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 600,
        system: 'You write a neutral, factual daily brief for Non-Resident Indians and OCI cardholders about investing in India. Use only the headlines given. No investment advice, no predictions, no recommendations to buy or sell. Plain English, 3 to 5 short bullet points, each under 35 words, each naming what changed and who it affects. If nothing material changed, say so in one bullet.',
        messages: [{ role: 'user', content: `Headlines from the last three days:\n${list}\n\nWrite the brief as bullet lines starting with "- ".` }],
      };
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const text = (j.content || []).map((c) => c.text || '').join('\n');
      const points = text.split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter((l) => l.length > 10).slice(0, 5);
      if (points.length) out = { date: day, mode: 'ai', points };
    } catch (e) { log.errors.push('brief ai: ' + e.message); }
  }
  if (!out) {
    // extractive: one headline per topic, most recent first
    const order = ['kyc', 'tax', 'stocks', 'mf', 'banking', 'gift', 'oci', 'regulator'];
    const picked = []; const used = new Set();
    for (const t of order) { const it = recent.find((x) => (x.tags || []).includes(t) && !used.has(x.id)); if (it) { used.add(it.id); picked.push(it); } if (picked.length >= 4) break; }
    for (const r of regs) { if (picked.length >= 5) break; picked.push(r); }
    out = { date: day, mode: 'extractive', points: picked.map((x) => `${x.title} (${x.source || 'news'})`), links: picked.map((x) => x.url) };
  }
  wj('data/brief.json', out);
  log.brief = out.mode;
}

await news().catch((e) => log.errors.push('news fatal: ' + e.message));
await videos().catch((e) => log.errors.push('videos fatal: ' + e.message));
await fx().catch((e) => log.errors.push('fx fatal: ' + e.message));
await watchAmcs().catch((e) => log.errors.push('watch fatal: ' + e.message));
await brief().catch((e) => log.errors.push('brief fatal: ' + e.message));
log.finished = new Date().toISOString();
wj('data/refresh-log.json', log);
console.log(`refresh done · ${log.news ?? 0} news · ${log.videos ?? 0} videos · USD/INR ${log.fx ?? '—'} · ${log.watch ?? 0} fund sites checked · brief ${log.brief ?? '—'} · ${log.errors.length} feed errors`);
