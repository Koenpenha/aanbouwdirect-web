#!/usr/bin/env node
/**
 * SEO internal links — voeg 2–3 gerelateerde bloglinks toe.
 *
 * Richting:
 * - Nieuwe/recente live posts → gerelateerd-blok vullen met oudere blogs
 * - Oudere blogs → teruglink naar nieuwe post (als die ontbreekt)
 *
 * Alleen website/blog/*.html (of blog/ op live-repo). Dry-run default.
 *
 * Usage (site-root = parent van _seo):
 *   node _seo/seo-internal-links.mjs
 *   node _seo/seo-internal-links.mjs --apply
 *   node _seo/seo-internal-links.mjs --apply --days=14 --links=3
 *   node _seo/seo-internal-links.mjs --apply --slugs=kosten-dakopbouw,kosten-nokverhoging
 *
 * Env: SEO_ROOT, SEO_QUEUE_PATH, NEW_SLUGS (comma)
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SEO_ROOT ? process.env.SEO_ROOT : join(SCRIPT_DIR, "..");
const QUEUE_PATH = process.env.SEO_QUEUE_PATH
  ? process.env.SEO_QUEUE_PATH
  : join(ROOT, "_seo", "QUEUE.csv");
const BLOG_DIR = join(ROOT, "blog");

const args = parseArgs(process.argv.slice(2));
const APPLY = args.has("apply");
const DRY = !APPLY || args.has("dry-run");
const DAYS = Number(args.get("days") || 14);
const MAX_LINKS = Number(args.get("links") || 3);
const MAX_NEW = Number(args.get("max-new") || 8);
const MAX_BACKLINKS = Number(args.get("backlinks") || 3);

const STOP = new Set([
  "de", "het", "een", "van", "en", "of", "in", "op", "voor", "bij", "met",
  "aan", "uit", "vs", "ipv", "i", "p", "v", "je", "jouw", "wat", "hoe",
  "nodig", "html", "blog", "direct", "tips",
]);

/** Losse clusters voor fallback als token-overlap 0 is */
const CLUSTERS = [
  ["kosten", "prijs", "prijsindicatie", "bandbreedte"],
  ["vergunning", "omgevingsloket", "vergunningsvrij"],
  ["casco", "afbouw", "oplevering"],
  ["nokverhoging", "dakopbouw", "dakkapel", "nok"],
  ["verbouwen", "verhuizen", "uitbreiden", "uitbreiding"],
  ["fundering", "constructie"],
  ["uitbouw", "achterkant", "aanbouw"],
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

function daysAgo(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
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

function tokens(...parts) {
  const raw = parts.join(" ").toLowerCase();
  return new Set(
    raw
      .replace(/[^a-z0-9à-ÿ\s-]/gi, " ")
      .split(/[\s_-]+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  );
}

function scoreOverlap(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

function clusterBonus(a, b) {
  let bonus = 0;
  for (const cluster of CLUSTERS) {
    const hitA = cluster.some((k) => a.has(k));
    const hitB = cluster.some((k) => b.has(k));
    if (hitA && hitB) bonus += 2;
  }
  return bonus;
}

function relatedScore(target, other) {
  let score = scoreOverlap(target.tokens, other.tokens) + clusterBonus(target.tokens, other.tokens);
  // Zelfde type (blog↔blog) iets zwaarder dan blog↔gemeente
  if (target.type && other.type && target.type === other.type) score += 1;
  return score;
}

function loadQueue() {
  if (!existsSync(QUEUE_PATH)) {
    throw new Error(`QUEUE ontbreekt: ${QUEUE_PATH}`);
  }
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
    tokens: tokens(
      row[idx.slug] || "",
      row[idx.keyword] || "",
      row[idx.onderwerp] || "",
      row[idx.type] || ""
    ),
  }));
}

function titleFromHtml(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    return h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    return title[1].split("|")[0].trim();
  }
  return fallback;
}

function existingRelatedHrefs(html) {
  const aside = html.match(
    /<aside class="blog-related"[\s\S]*?<\/aside>/i
  );
  if (!aside) return new Set();
  const hrefs = [...aside[0].matchAll(/href="([^"]+\.html)"/gi)].map((m) =>
    m[1].replace(/^\.\//, "")
  );
  return new Set(hrefs);
}

function allInternalBlogHrefs(html) {
  const hrefs = [...html.matchAll(/href="((?:\.\/)?[a-z0-9-]+\.html)"/gi)].map(
    (m) => m[1].replace(/^\.\//, "")
  );
  return new Set(hrefs);
}

function ensureRelatedAside(html, items) {
  const lis = items
    .map(
      (it) =>
        `            <li><a href="${it.href}">${escapeHtml(it.label)}</a></li>`
    )
    .join("\n");

  const block = [
    '        <aside class="blog-related" aria-labelledby="related-heading">',
    '          <h2 id="related-heading">Gerelateerd</h2>',
    "          <ul>",
    lis,
    "          </ul>",
    "        </aside>",
  ].join("\n");

  if (/<aside class="blog-related"[\s\S]*?<\/aside>/i.test(html)) {
    return html.replace(
      /<aside class="blog-related"[\s\S]*?<\/aside>/i,
      block
    );
  }

  // Insert before closing </article> if possible
  if (/<\/article>/i.test(html)) {
    return html.replace(/<\/article>/i, `${block}\n      </article>`);
  }
  return html;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addRelatedLink(html, href, label) {
  const existing = existingRelatedHrefs(html);
  if (existing.has(href)) return { html, changed: false };

  const asideMatch = html.match(
    /<aside class="blog-related"[\s\S]*?<\/aside>/i
  );
  if (!asideMatch) {
    const next = ensureRelatedAside(html, [{ href, label }]);
    return { html: next, changed: next !== html };
  }

  const aside = asideMatch[0];
  const li = `            <li><a href="${href}">${escapeHtml(label)}</a></li>\n`;
  let nextAside;
  if (/<\/ul>/i.test(aside)) {
    nextAside = aside.replace(/<\/ul>/i, `${li}          </ul>`);
  } else {
    return { html, changed: false };
  }
  return {
    html: html.replace(aside, nextAside),
    changed: true,
  };
}

function relatedCandidates(target, pool, limit) {
  const scored = pool
    .filter((p) => p.slug !== target.slug)
    .map((p) => ({
      post: p,
      score: relatedScore(target, p),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const prioA = Number(a.post.prioriteit || 99);
      const prioB = Number(b.post.prioriteit || 99);
      if (prioA !== prioB) return prioA - prioB;
      return a.post.datum.localeCompare(b.post.datum);
    });

  if (scored.length > 0) {
    return scored.slice(0, limit).map((x) => x.post);
  }

  // Fallback: andere blogs / zelfde type op prioriteit
  return pool
    .filter((p) => p.slug !== target.slug)
    .filter((p) => p.type === "blog" || p.type === target.type)
    .sort((a, b) => {
      const prioA = Number(a.prioriteit || 99);
      const prioB = Number(b.prioriteit || 99);
      if (prioA !== prioB) return prioA - prioB;
      return a.datum.localeCompare(b.datum);
    })
    .slice(0, limit);
}

function resolveSlugList() {
  const fromArg = (args.get("slugs") || "").trim();
  const fromEnv = (process.env.NEW_SLUGS || "").trim();
  const raw = fromArg || fromEnv;
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  const today = todayAmsterdam();
  const cutoff = daysAgo(today, DAYS);
  console.log(
    `seo-internal-links · today=${today} · cutoff=${cutoff} · mode=${DRY ? "dry-run" : "apply"}`
  );

  const queue = loadQueue().filter((r) => r.status === "live" && r.slug);
  const withHtml = queue.filter((r) =>
    existsSync(join(BLOG_DIR, `${r.slug}.html`))
  );

  if (withHtml.length === 0) {
    console.log("geen live posts met HTML");
    return;
  }

  const forced = resolveSlugList();
  let recent;
  if (forced) {
    recent = withHtml.filter((r) => forced.includes(r.slug));
  } else {
    recent = withHtml
      .filter((r) => r.datum && r.datum >= cutoff)
      .sort((a, b) => b.datum.localeCompare(a.datum))
      .slice(0, MAX_NEW);
  }

  if (recent.length === 0) {
    // Fallback: newest live by datum
    recent = [...withHtml]
      .sort((a, b) => b.datum.localeCompare(a.datum))
      .slice(0, Math.min(2, MAX_NEW));
    console.log(
      `geen posts in venster ${DAYS}d — fallback nieuwste: ${recent.map((r) => r.slug).join(", ")}`
    );
  } else {
    console.log(`targets: ${recent.map((r) => r.slug).join(", ")}`);
  }

  const older = withHtml.filter((r) => !recent.some((n) => n.slug === r.slug));
  const changes = [];

  for (const neo of recent) {
    const neoPath = join(BLOG_DIR, `${neo.slug}.html`);
    let neoHtml = readFileSync(neoPath, "utf8");
    const neoTitle = titleFromHtml(neoHtml, neo.onderwerp || neo.keyword || neo.slug);
    const related = relatedCandidates(neo, older.length ? older : withHtml, MAX_LINKS);
    if (related.length === 0) {
      console.log(`skip ${neo.slug}: geen gerelateerde kandidaten`);
      continue;
    }

    // A) Vul gerelateerd-blok op nieuwe post
    const existing = existingRelatedHrefs(neoHtml);
    const wanted = related
      .map((p) => {
        const path = join(BLOG_DIR, `${p.slug}.html`);
        const html = readFileSync(path, "utf8");
        return {
          href: `${p.slug}.html`,
          label: titleFromHtml(html, p.onderwerp || p.keyword || p.slug),
        };
      })
      .filter((it) => !existing.has(it.href))
      .slice(0, MAX_LINKS);

    if (wanted.length) {
      const keep = [...existing]
        .filter((href) => href.endsWith(".html") && !href.includes("/"))
        .slice(0, Math.max(0, MAX_LINKS - wanted.length))
        .map((href) => {
          const slug = href.replace(/\.html$/, "");
          const path = join(BLOG_DIR, href);
          const label = existsSync(path)
            ? titleFromHtml(readFileSync(path, "utf8"), slug)
            : slug;
          return { href, label };
        });
      const merged = [...keep, ...wanted].slice(0, MAX_LINKS);
      const next = ensureRelatedAside(neoHtml, merged);
      if (next !== neoHtml) {
        changes.push({
          file: `blog/${neo.slug}.html`,
          action: `related ← ${wanted.map((w) => w.href).join(", ")}`,
        });
        if (!DRY) writeFileSync(neoPath, next, "utf8");
        neoHtml = next;
      }
    }

    // B) Backlinks vanuit oudere posts naar nieuwe
    let backlinked = 0;
    for (const old of related) {
      if (backlinked >= MAX_BACKLINKS) break;
      const oldPath = join(BLOG_DIR, `${old.slug}.html`);
      let oldHtml = readFileSync(oldPath, "utf8");
      const all = allInternalBlogHrefs(oldHtml);
      if (all.has(`${neo.slug}.html`)) continue;

      const { html: updated, changed } = addRelatedLink(
        oldHtml,
        `${neo.slug}.html`,
        neoTitle
      );
      if (!changed) continue;

      // Cap related list length
      const hrefs = [...existingRelatedHrefs(updated)];
      if (hrefs.length > MAX_LINKS + 1) {
        // keep first MAX_LINKS + new — rebuild from current aside items truncated
        const aside = updated.match(
          /<aside class="blog-related"[\s\S]*?<\/aside>/i
        );
        if (aside) {
          const items = [
            ...aside[0].matchAll(/<li>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/li>/gi),
          ].map((m) => ({
            href: m[1],
            label: m[2].replace(/<[^>]+>/g, "").trim(),
          }));
          // Prefer keeping the newly added link
          const neoHref = `${neo.slug}.html`;
          const neoItem = items.find((it) => it.href === neoHref);
          const rest = items.filter((it) => it.href !== neoHref).slice(0, MAX_LINKS - 1);
          const capped = neoItem ? [...rest, neoItem] : rest;
          const rebuilt = ensureRelatedAside(updated, capped.slice(0, MAX_LINKS));
          if (!DRY) writeFileSync(oldPath, rebuilt, "utf8");
        } else if (!DRY) {
          writeFileSync(oldPath, updated, "utf8");
        }
      } else if (!DRY) {
        writeFileSync(oldPath, updated, "utf8");
      }

      changes.push({
        file: `blog/${old.slug}.html`,
        action: `backlink → ${neo.slug}.html`,
      });
      backlinked += 1;
    }
  }

  if (changes.length === 0) {
    console.log("geen wijzigingen nodig");
    return;
  }

  console.log(`${DRY ? "zou wijzigen" : "gewijzigd"} (${changes.length}):`);
  for (const c of changes) {
    console.log(`  - ${c.file}: ${c.action}`);
  }
  if (DRY) {
    console.log("dry-run — voeg --apply toe om te schrijven");
  }
}

main();
