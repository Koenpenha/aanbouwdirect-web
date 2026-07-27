#!/usr/bin/env node
/**
 * Daily SEO go-live — max 2 approved queue items per run.
 * Run from repo root: node _seo/daily-golive.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const QUEUE_PATH = join(ROOT, "_seo", "QUEUE.csv");
const SITEMAP_PATH = join(ROOT, "sitemap.xml");
const INDEX_FILES = [
  join(ROOT, "kennisbank", "index.html"),
  join(ROOT, "blog", "index.html"),
];

const MAX_LIVE = 2;
const ALLOWED_STATUS = new Set(["approved"]);

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

function pickCandidates(rows, headers, today) {
  const statusIdx = headers.indexOf("status");
  const datumIdx = headers.indexOf("datum");
  const slugIdx = headers.indexOf("slug");

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const status = row[statusIdx]?.trim().toLowerCase();
      const datum = row[datumIdx]?.trim();
      return ALLOWED_STATUS.has(status) && datum && datum <= today;
    })
    .sort((a, b) => {
      const dateCmp = a.row[datumIdx].localeCompare(b.row[datumIdx]);
      if (dateCmp !== 0) return dateCmp;
      return a.row[slugIdx].localeCompare(b.row[slugIdx]);
    })
    .slice(0, MAX_LIVE);
}

function main() {
  const today = todayAmsterdam();
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

  const candidates = pickCandidates(rows, headers, today);
  if (candidates.length === 0) {
    console.log("niets te publiceren");
    return;
  }

  const liveSlugs = [];

  for (const { row, index } of candidates) {
    const slug = row[slugIdx];
    row[statusIdx] = "live";
    const suffix = ` · auto live ${today}`;
    row[notitieIdx] = row[notitieIdx]?.includes(suffix)
      ? row[notitieIdx]
      : `${row[notitieIdx] || ""}${suffix}`.trim();
    rows[index] = row;

    ensureSitemap(slug);
    for (const indexFile of INDEX_FILES) {
      updateIndexForSlug(indexFile, slug);
    }
    liveSlugs.push(slug);
  }

  writeFileSync(QUEUE_PATH, serializeCsv([headers, ...rows]));
  console.log(`live: ${liveSlugs.join(", ")}`);
}

main();
