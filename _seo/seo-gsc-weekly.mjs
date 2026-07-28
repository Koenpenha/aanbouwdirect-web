#!/usr/bin/env node
/**
 * Wekelijkse GSC-checklistrapport (zonder API).
 *
 * Maakt een dated markdown-stub onder _seo/reports/ (live-repo)
 * of marketing/reports/ (workspace via wrapper).
 * Koen plakt GSC-cijfers in de open checklist.
 *
 * Usage:
 *   node _seo/seo-gsc-weekly.mjs
 *   node _seo/seo-gsc-weekly.mjs --out=../marketing/reports
 *
 * Env: SEO_ROOT, SEO_QUEUE_PATH, REPORT_DIR
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SEO_ROOT ? process.env.SEO_ROOT : join(SCRIPT_DIR, "..");
const QUEUE_PATH = process.env.SEO_QUEUE_PATH
  ? process.env.SEO_QUEUE_PATH
  : join(ROOT, "_seo", "QUEUE.csv");
const SITEMAP_PATH = join(ROOT, "sitemap.xml");

const args = parseArgs(process.argv.slice(2));
const OUT_DIR =
  args.get("out") ||
  process.env.REPORT_DIR ||
  join(ROOT, "_seo", "reports");

function parseArgs(argv) {
  const map = new Map();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) map.set(body, "true");
    else map.set(body.slice(0, eq), body.slice(eq + 1));
  }
  map.get = Map.prototype.get.bind(map);
  return map;
}

function todayAmsterdam() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i += 1;
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

function loadQueueRows() {
  if (!existsSync(QUEUE_PATH)) return [];
  const table = parseCsv(readFileSync(QUEUE_PATH, "utf8").trimEnd());
  if (table.length < 2) return [];
  const headers = table[0];
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  return table.slice(1).map((row) => ({
    datum: (row[idx.datum] || "").trim(),
    type: (row[idx.type] || "").trim(),
    slug: (row[idx.slug] || "").trim(),
    keyword: (row[idx.keyword] || "").trim(),
    status: (row[idx.status] || "").trim().toLowerCase(),
    prioriteit: (row[idx.prioriteit] || "").trim(),
    onderwerp: (row[idx.onderwerp] || "").trim(),
  }));
}

function sitemapUrls() {
  if (!existsSync(SITEMAP_PATH)) return [];
  const xml = readFileSync(SITEMAP_PATH, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function weekKey(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function main() {
  const today = todayAmsterdam();
  const wk = weekKey(today);
  mkdirSync(OUT_DIR, { recursive: true });

  const outPath = join(OUT_DIR, `gsc-${today}.md`);
  if (existsSync(outPath)) {
    console.log(`bestaat al: ${outPath}`);
    return;
  }

  const rows = loadQueueRows();
  const live = rows.filter((r) => r.status === "live");
  const approved = rows.filter((r) => r.status === "approved");
  const refresh = rows.filter((r) => r.status === "refresh");
  const idee = rows.filter((r) => r.status === "idee" || r.status === "draft");
  const highIntentLive = live
    .filter((r) => r.type === "blog" && r.prioriteit === "1")
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const recentLive = [...live]
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 8);
  const urls = sitemapUrls();
  const blogUrls = urls.filter((u) => u.includes("/blog/"));

  const body = `# GSC weekrapport — ${today} (${wk})

Automatische stub (geen Search Console API). Plak hieronder cijfers uit [Google Search Console](https://search.google.com/search-console) → property **aanbouw.direct**.

Handleiding: \`marketing/GSC-WEEKLY.md\` · Overzicht: \`marketing/VINDABAARHEID-AUTOMATISERING.md\`

---

## 1. Snapshot (plak uit GSC · laatste 7 of 28 dagen)

| Metric | Waarde | Notitie |
|--------|--------|---------|
| Totaal impressies | _plak_ | |
| Totaal clicks | _plak_ | |
| Gem. CTR | _plak_ | |
| Gem. positie | _plak_ | |

---

## 2. Queries positie 11–20 (strikende afstand)

Top queries met impressies maar positie 11–20 → kandidaat voor interne links of refresh.

| Query | Impressies | Clicks | Positie | Actie (link / refresh / nieuw) |
|-------|------------|--------|---------|--------------------------------|
| | | | | |
| | | | | |
| | | | | |

---

## 3. Indexering / pagina’s

| Check | Status | Notitie |
|-------|--------|---------|
| Sitemap ingediend + HTTP 200 | ☐ | \`https://aanbouw.direct/sitemap.xml\` |
| Nieuwe blogs geïndexeerd | ☐ | zie recente live hieronder |
| Coverage / pagina met fout | ☐ | plak URL’s |
| Soft 404 / redirect | ☐ | |

Sitemap-URL’s in repo: **${urls.length}** totaal · **${blogUrls.length}** blog.

---

## 4. QUEUE-stand (auto)

| Status | Aantal |
|--------|--------|
| live | ${live.length} |
| approved (wacht op go-live) | ${approved.length} |
| refresh | ${refresh.length} |
| idee/draft | ${idee.length} |

### Recente live (max 8)

${recentLive.map((r) => `- \`${r.datum}\` · [${r.slug}](https://aanbouw.direct/blog/${r.slug}.html) · ${r.keyword}`).join("\n") || "_geen_"}

### Oudste high-intent live blogs (refresh-kandidaten)

${highIntentLive.slice(0, 6).map((r) => `- \`${r.datum}\` · \`${r.slug}\` · ${r.keyword}`).join("\n") || "_geen_"}

---

## 5. Acties deze week

- [ ] Queries 11–20: interne link of content-refresh inplannen
- [ ] Index-fouten oplossen / URL-inspectie
- [ ] Open prio-1 \`idee\` checken in QUEUE
- [ ] Eventueel refresh-status zetten (of wachten op maandelijkse refresh-Action)

---

## 6. Later: GSC API (optioneel)

Nog **geen** API-credentials in deze repo. Om live data te pullen:

1. Google Cloud project + Search Console API aanzetten
2. Service account met toegang tot property \`aanbouw.direct\`
3. Secret \`GSC_SERVICE_ACCOUNT_JSON\` op \`aanbouwdirect-web\` (GitHub Actions)
4. Script uitbreiden — zie \`marketing/GSC-WEEKLY.md\` § API

Tot die tijd: dit rapport + 5 min handmatig plakken is genoeg.

---

_Gegenereerd door \`seo-gsc-weekly.mjs\` · ${today}_
`;

  writeFileSync(outPath, body, "utf8");
  console.log(`geschreven: ${outPath}`);

  // Mirror hint: list reports
  const count = readdirSync(OUT_DIR).filter((f) => f.startsWith("gsc-")).length;
  console.log(`rapporten in map: ${count}`);
}

main();
