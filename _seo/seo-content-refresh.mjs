#!/usr/bin/env node
/**
 * Maandelijkse content-refresh — markeer 1–2 oudste high-intent live gidsen.
 *
 * Zet QUEUE-status → refresh + notitie met update-checklist.
 * Schrijft géén HTML — dat doet WRITE / Cursor Automation met AUTOMATION-REFRESH-PROMPT.
 *
 * Usage:
 *   node _seo/seo-content-refresh.mjs
 *   node _seo/seo-content-refresh.mjs --apply --max=2
 *   node _seo/seo-content-refresh.mjs --apply --also-marketing=/path/to/marketing/QUEUE.csv
 *
 * Dry-run default. Env: SEO_ROOT, SEO_QUEUE_PATH, MARKETING_QUEUE_PATH
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SEO_ROOT ? process.env.SEO_ROOT : join(SCRIPT_DIR, "..");
const QUEUE_PATH = process.env.SEO_QUEUE_PATH
  ? process.env.SEO_QUEUE_PATH
  : join(ROOT, "_seo", "QUEUE.csv");
const NOTES_DIR = join(ROOT, "_seo", "refresh-notes");

const args = parseArgs(process.argv.slice(2));
const APPLY = args.has("apply");
const DRY = !APPLY || args.has("dry-run");
const MAX = Number(args.get("max") || 2);
const MARKETING_QUEUE =
  args.get("also-marketing") || process.env.MARKETING_QUEUE_PATH || "";

const HIGH_INTENT = [
  "kosten",
  "vergunning",
  "prijsindicatie",
  "verbouwen",
  "verhuizen",
  "casco",
  "nokverhoging",
  "dakopbouw",
  "uitbouw",
  "dakkapel",
  "fundering",
  "plaatsen",
];

function parseArgs(argv) {
  const map = new Map();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) map.set(body, "true");
    else map.set(body.slice(0, eq), body.slice(eq + 1));
  }
  map.has = Map.prototype.has.bind(map);
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

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function serializeCsv(rows) {
  return `${rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")}\n`;
}

function isHighIntent(row, idx) {
  const type = (row[idx.type] || "").trim().toLowerCase();
  if (type !== "blog") return false;
  const prio = (row[idx.prioriteit] || "").trim();
  if (prio === "1") return true;
  const hay = `${row[idx.slug] || ""} ${row[idx.keyword] || ""} ${row[idx.onderwerp] || ""}`.toLowerCase();
  return HIGH_INTENT.some((k) => hay.includes(k));
}

function pickCandidates(headers, rows) {
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const status = (row[idx.status] || "").trim().toLowerCase();
      if (status !== "live") return false;
      if (!isHighIntent(row, idx)) return false;
      const notitie = (row[idx.notitie] || "").toLowerCase();
      // Skip if refreshed in last ~90 days marker
      if (/refresh\s+\d{4}-\d{2}-\d{2}/i.test(notitie)) {
        const m = notitie.match(/refresh\s+(\d{4}-\d{2}-\d{2})/i);
        if (m) {
          const d = new Date(`${m[1]}T12:00:00Z`);
          const age = (Date.now() - d.getTime()) / 86400000;
          if (age < 90) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.row[idx.datum].localeCompare(b.row[idx.datum]);
      if (dateCmp !== 0) return dateCmp;
      const prioA = Number(a.row[idx.prioriteit] || 99);
      const prioB = Number(b.row[idx.prioriteit] || 99);
      return prioA - prioB;
    })
    .slice(0, MAX);
}

function noteFor(slug, keyword, today) {
  return `# Refresh-notities — ${slug}

Datum taak: ${today}  
Keyword: ${keyword}  
Status QUEUE: \`refresh\` → na update quality gate → \`approved\` → GO-LIVE (of terug \`live\` als alleen cosmetisch)

## Wat updaten (niet herschrijven vanaf nul)

- [ ] Jaartal / “actueel in …” in intro of FAQ
- [ ] Cijfers/bandbreedtes checken — **geen** €2800/m² of vaste m²-prijs in title/meta/H1
- [ ] FAQ: 1–2 nieuwe vragen die nu in SERP/GSC opduiken
- [ ] Vergunning/proces: links Omgevingsloket / Rijksoverheid nog geldig?
- [ ] Interne links: minstens 2 gerelateerde blogs + calculator-tekstlink
- [ ] Bookmark-test: blijft dit bewaarwaardig?

## Prompt

Zie \`marketing/AUTOMATION-REFRESH-PROMPT.md\` — of in chat: \`Ververs volgende refresh uit de queue\`.
`;
}

function applyToQueueFile(queuePath, today) {
  const raw = readFileSync(queuePath, "utf8");
  const table = parseCsv(raw.trimEnd());
  if (table.length < 2) {
    console.log(`${queuePath}: leeg`);
    return [];
  }
  const headers = table[0];
  const rows = table.slice(1);
  for (const required of ["status", "datum", "slug"]) {
    if (headers.indexOf(required) === -1) {
      throw new Error(`${queuePath} mist kolom ${required}`);
    }
  }
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const candidates = pickCandidates(headers, rows);
  if (candidates.length === 0) {
    console.log(`${queuePath}: geen refresh-kandidaten`);
    return [];
  }

  const picked = [];
  for (const { row, index } of candidates) {
    const slug = row[idx.slug].trim();
    const keyword = (row[idx.keyword] || slug).trim();
    row[idx.status] = "refresh";
    const marker = `refresh ${today}`;
    if (idx.notitie >= 0) {
      const prev = row[idx.notitie] || "";
      row[idx.notitie] = prev.includes(marker)
        ? prev
        : `${prev} · ${marker} · update jaar/FAQ/cijfers (geen €/m²-spam)`.trim();
    }
    rows[index] = row;
    picked.push({ slug, keyword });
  }

  if (!DRY) {
    writeFileSync(queuePath, serializeCsv([headers, ...rows]), "utf8");
  }
  return picked;
}

function main() {
  const today = todayAmsterdam();
  console.log(
    `seo-content-refresh · today=${today} · mode=${DRY ? "dry-run" : "apply"} · max=${MAX}`
  );

  if (!existsSync(QUEUE_PATH)) {
    console.error(`QUEUE ontbreekt: ${QUEUE_PATH}`);
    process.exit(1);
  }

  const picked = applyToQueueFile(QUEUE_PATH, today);
  if (MARKETING_QUEUE && existsSync(MARKETING_QUEUE)) {
    applyToQueueFile(MARKETING_QUEUE, today);
    console.log(`ook gespiegeld: ${MARKETING_QUEUE}`);
  }

  if (picked.length === 0) {
    console.log("niets te refreshen");
    return;
  }

  mkdirSync(NOTES_DIR, { recursive: true });
  for (const { slug, keyword } of picked) {
    const notePath = join(NOTES_DIR, `${today}-${slug}.md`);
    console.log(`kandidaat: ${slug} (${keyword})`);
    if (!DRY) {
      writeFileSync(notePath, noteFor(slug, keyword, today), "utf8");
      console.log(`  notitie: ${notePath}`);
    }
  }

  if (DRY) {
    console.log("dry-run — voeg --apply toe om QUEUE → refresh te zetten");
  } else {
    console.log(
      `QUEUE status → refresh: ${picked.map((p) => p.slug).join(", ")}`
    );
  }
}

main();
