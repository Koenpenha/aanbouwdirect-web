#!/usr/bin/env node
/**
 * Daily SEO go-live — max 2 approved queue items per run.
 *
 * Rules:
 * - Only status "approved" (never idee/draft)
 * - datum ≤ today (Europe/Amsterdam)
 * - oldest first, max 2
 * - requires website/blog/{slug}.html
 * - updates QUEUE → live, sitemap, kennisbank/blog indexes
 *
 * Run from aanbouwdirect-web root: node _seo/daily-golive.mjs
 * Or from workspace via scripts/seo-golive-deploy.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Script leeft in <site-root>/_seo/ — default ROOT = parent van _seo
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SEO_ROOT ? process.env.SEO_ROOT : join(SCRIPT_DIR, "..");
const QUEUE_PATH = process.env.SEO_QUEUE_PATH
  ? process.env.SEO_QUEUE_PATH
  : join(ROOT, "_seo", "QUEUE.csv");
const SITEMAP_PATH = join(ROOT, "sitemap.xml");
const BLOG_DIR = join(ROOT, "blog");
const INDEX_FILES = [
  join(ROOT, "kennisbank", "index.html"),
  join(ROOT, "blog", "index.html"),
];

const MAX_LIVE = 2;
const ALLOWED_STATUS = new Set(["approved"]);
const FORBIDDEN_STATUS = new Set(["idee", "draft"]);

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

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i += 1;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function serializeCsv(rows) {
  return `${rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")}\n`;
}

function ensureSitemap(slug) {
  const url = `https://aanbouw.direct/blog/${slug}.html`;
  let xml = readFileSync(SITEMAP_PATH, "utf8");
  if (xml.includes(url)) return;

  const entry = [
    "  <url>",
    `    <loc>${url}</loc>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>0.75</priority>",
    "  </url>",
    "",
  ].join("\n");

  xml = xml.replace("</urlset>", `${entry}</urlset>`);
  writeFileSync(SITEMAP_PATH, xml);
}

function stripDraftLabels(block) {
  return block
    .replace(/\s*·\s*draft/gi, "")
    .replace(/Review draft →/g, "Lees →")
    .replace(/Review draft &rarr;/g, "Lees &rarr;");
}

function updateIndexForSlug(filePath, slug) {
  if (!existsSync(filePath)) return;
  let html = readFileSync(filePath, "utf8");
  const cardPattern = new RegExp(
    `<a\\s+class="blog-card"[^>]*href="[^"]*${slug}\\.html"[^>]*>[\\s\\S]*?</a>`,
    "g"
  );

  const updated = html.replace(cardPattern, (card) => stripDraftLabels(card));
  if (updated !== html) {
    writeFileSync(filePath, updated);
  }
}

function blogPathForSlug(slug) {
  return join(BLOG_DIR, `${slug}.html`);
}

function pickCandidates(rows, headers, today) {
  const statusIdx = headers.indexOf("status");
  const datumIdx = headers.indexOf("datum");
  const slugIdx = headers.indexOf("slug");
  const prioIdx = headers.indexOf("prioriteit");

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const status = row[statusIdx]?.trim().toLowerCase();
      const datum = row[datumIdx]?.trim();
      if (FORBIDDEN_STATUS.has(status)) return false;
      if (!ALLOWED_STATUS.has(status)) return false;
      if (!datum || datum > today) return false;
      const slug = row[slugIdx]?.trim();
      if (!slug) return false;
      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.row[datumIdx].localeCompare(b.row[datumIdx]);
      if (dateCmp !== 0) return dateCmp;
      const prioA = Number(a.row[prioIdx] || 99);
      const prioB = Number(b.row[prioIdx] || 99);
      if (prioA !== prioB) return prioA - prioB;
      return a.row[slugIdx].localeCompare(b.row[slugIdx]);
    })
    .slice(0, MAX_LIVE);
}

function main() {
  const today = todayAmsterdam();
  console.log(`seo-golive · today=${today} · queue=${QUEUE_PATH}`);

  if (!existsSync(QUEUE_PATH)) {
    console.error(`QUEUE ontbreekt: ${QUEUE_PATH}`);
    process.exit(1);
  }

  const raw = readFileSync(QUEUE_PATH, "utf8");
  const table = parseCsv(raw.trimEnd());

  if (table.length === 0) {
    console.log("niets te publiceren");
    return;
  }

  const headers = table[0];
  const rows = table.slice(1);
  const statusIdx = headers.indexOf("status");
  const slugIdx = headers.indexOf("slug");
  const notitieIdx = headers.indexOf("notitie");

  for (const required of ["status", "datum", "slug"]) {
    if (headers.indexOf(required) === -1) {
      console.error(`QUEUE mist kolom: ${required}`);
      process.exit(1);
    }
  }

  const candidates = pickCandidates(rows, headers, today);
  if (candidates.length === 0) {
    console.log("niets te publiceren (geen approved met datum ≤ vandaag)");
    return;
  }

  const liveSlugs = [];
  const skipped = [];

  for (const { row, index } of candidates) {
    const slug = row[slugIdx]?.trim();
    const htmlPath = blogPathForSlug(slug);

    if (!existsSync(htmlPath)) {
      skipped.push(`${slug} (HTML ontbreekt: blog/${slug}.html)`);
      console.warn(`skip: ${slug} — blog/${slug}.html niet gevonden`);
      continue;
    }

    row[statusIdx] = "live";
    const suffix = ` · auto live ${today}`;
    if (notitieIdx >= 0) {
      row[notitieIdx] = row[notitieIdx]?.includes(suffix)
        ? row[notitieIdx]
        : `${row[notitieIdx] || ""}${suffix}`.trim();
    }
    rows[index] = row;

    ensureSitemap(slug);
    for (const indexFile of INDEX_FILES) {
      updateIndexForSlug(indexFile, slug);
    }
    liveSlugs.push(slug);
  }

  if (liveSlugs.length === 0) {
    console.log("niets te publiceren");
    if (skipped.length) console.log(`overgeslagen: ${skipped.join("; ")}`);
    return;
  }

  writeFileSync(QUEUE_PATH, serializeCsv([headers, ...rows]));
  console.log(`live: ${liveSlugs.join(", ")}`);
  if (skipped.length) console.log(`overgeslagen: ${skipped.join("; ")}`);
}

main();
