# NRIin.com

Independent, self-updating tools and guides for NRIs and OCI cardholders investing in Indian stocks and mutual funds — KYC status fixes, an investing path finder, a daily-checked directory of fund houses that accept US and Canada residents, a PFIC check, a document checker, tax and residential-status calculators, live INR rates, daily news and videos. Monetised with Google AdSense, a lead-generation funnel to vetted specialists, sponsorships, donations and contests.

Static HTML, zero dependencies, hosted free on **GitHub Pages** from this repository (`WEBWORKSA1/nriin-com`). All automation runs in GitHub Actions.

## How it updates itself

`.github/workflows/daily-refresh.yml` runs twice a day (05:53 and 17:53 IST), on demand, and on every push to `main`:

1. `scripts/refresh.mjs` pulls into `/data`:
   - `updates.json` — NRI investing news (Google News RSS for 19 topic queries) plus SEBI/RBI feed items about non-residents
   - `regwatch.json` — the Regulatory radar (SEBI and RBI releases)
   - `videos.json` — explainer videos (YouTube Data API if a `YOUTUBE_API_KEY` secret exists, otherwise public search results)
   - `fx.json` — INR against 16 currencies with 120 days of history
   - `amcs.json` → `watch` — a daily check of every fund house website in the US/Canada directory; a change to the passages mentioning the US, Canada or FATCA flags that row “re-verify”
   - `brief.json` — today's brief: written by Claude if an `ANTHROPIC_API_KEY` secret exists (factual summary of linked headlines only), otherwise selected automatically
2. `scripts/build.mjs`
   - generates `/guides/*` and `/countries/*` from `scripts/content/**` (add an HTML file there and a page, sitemap entry, search entry and feed item appear on the next run),
   - normalises every page head (AdSense loader + `google-adsense-account` meta, fonts, icons, social cards), bakes header and footer, fills the `<!--ni:NAME-->` blocks,
   - writes `sitemap.xml`, `feed.xml`, `robots.txt`, `ads.txt`, `data/search-index.json`,
   - **fails the run** if the inbox address appears anywhere, if the owner's domain appears as visible text, if another AdSense publisher ID appears, or if any page lacks the sponsorship top bar.
3. The workflow commits the result and publishes to GitHub Pages (`scripts/`, `.github/` and this README are never published when Pages uses the Actions source).

Every source is optional. A failing feed is logged in `data/refresh-log.json` and skipped.

### One-time setup

1. **Pages:** Settings → Pages → Build and deployment → **GitHub Actions** (recommended) or **Deploy from a branch → main / (root)**. Custom domain: `nriin.com` → Save → tick **Enforce HTTPS** once the certificate is issued.
2. **DNS** at the registrar: A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; AAAA `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`; `www` CNAME → `webworksa1.github.io`.
3. **FormSubmit:** the first live form submission sends a one-time activation email to the inbox. Confirm it. Then paste the random alias FormSubmit gives you into `CONFIG.FORM_ALIAS` in `partials.js`.
4. **AdSense:** add the site in AdSense → Sites, turn on Auto ads, and enable Google's consent message for EEA/UK visitors (Privacy & messaging). `ads.txt` is generated automatically.
5. **Optional secrets** (Settings → Secrets and variables → Actions): `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL` env override in the workflow).

## Files you edit

| File | Controls |
|---|---|
| `partials.js` (CONFIG block) | GA4 and Clarity IDs, WhatsApp number, manual AdSense slot IDs, FormSubmit alias, donation links (PayPal, Stripe, Buy Me a Coffee, Ko-fi, UPI), social links |
| `data/amcs.json` | Fund house directory (mode, conditions, sources, last verified) |
| `data/timeline.json` | Dated rule changes on the homepage and updates page |
| `data/tips.json` | Daily tip rotation |
| `data/contests.json`, `data/careers.json` | Contests and open roles |
| `scripts/content/guides/*.html`, `scripts/content/countries/*.html` | Guides and country pages (JSON meta comment + HTML body) |
| `scripts/sources.json` | News queries, regulator feeds, video topics, YouTube channels |
| `scripts/site.mjs` | Header, footer, navigation, trademark line |

## Leads

Every form posts through `NI.send()` in `partials.js` to FormSubmit with a lead score (HOT / WARM / NEW), source page and first-touch attribution in the subject and body. The inbox address is never written in page source — it is assembled only at send time, and the build fails if it ever appears in a file. Tool pages can email the visitor their own plan (FormSubmit autoresponse) while sending you the lead.

Lead sources: homepage help form, `/get-help` (three-step), every tool's “Email this to myself” and “Have a specialist do this”, `/for-professionals` (supply side), `/advertise`, `/contests`, `/careers`, `/support` pledges, `/amc-directory` reports, newsletter and the exit-intent checklist offer.
