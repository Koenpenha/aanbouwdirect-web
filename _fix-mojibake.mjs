/**
 * Fix UTF-8 mojibake sitewide (CP1252 misread of UTF-8, then re-saved as UTF-8).
 * Also maps C1 controls U+0080–U+009F back to bytes 0x80–0x9F (←, etc.).
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = process.argv.slice(2);
if (!ROOTS.length) {
  console.error("Usage: node _fix-mojibake.mjs <dir> [dir...]");
  process.exit(1);
}

const EXTS = new Set([".html", ".js", ".css", ".md", ".xml", ".txt", ".svg"]);
const SKIP_DIRS = new Set([".git", "node_modules"]);

const CP1252_FROM_UNICODE = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(ent.name).toLowerCase())) out.push(p);
  }
  return out;
}

function markerScore(s) {
  // Heuristic: count chars typical of mojibake survivors
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    // Ã (0xC3) and Â (0xC2) often start UTF-8-as-Latin1 sequences
    if (c === 0xc3 || c === 0xc2 || c === 0xe2) n++;
    // leftover C1 controls from arrow/etc mojibake
    if (c >= 0x80 && c <= 0x9f) n += 2;
  }
  // common multi-char markers
  const multi = [
    "Ã©",
    "Ã«",
    "Ã¯",
    "Ã—",
    "Â·",
    "Â²",
    "Â©",
    "â€œ",
    "â€",
    "â€™",
    "â€˜",
    "â€”",
    "â€“",
    "â‚¬",
    "â†",
    "â˜",
    "â€¹",
    "â€º",
  ];
  for (const m of multi) {
    let i = 0;
    while ((i = s.indexOf(m, i)) !== -1) {
      n += 3;
      i += m.length;
    }
  }
  return n;
}

function toCp1252Bytes(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    // C1 controls / latin-1 high bytes often stand in for original CP1252 bytes
    if (code >= 0x80 && code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_FROM_UNICODE.get(code);
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    // Not representable as a single CP1252 byte — keep UTF-8 (already-correct Unicode)
    const enc = Buffer.from(ch, "utf8");
    for (const x of enc) bytes.push(x);
  }
  return Buffer.from(bytes);
}

/** Decode UTF-8; invalid bytes stay as Latin-1 (handles mixed mojibake + real ·/©). */
function decodeUtf8Lenient(buf) {
  const out = [];
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    if (b <= 0x7f) {
      out.push(String.fromCharCode(b));
      i++;
      continue;
    }
    let need = 0;
    if (b >= 0xc2 && b <= 0xdf) need = 1;
    else if (b >= 0xe0 && b <= 0xef) need = 2;
    else if (b >= 0xf0 && b <= 0xf4) need = 3;
    else {
      // Invalid lead — keep as Latin-1
      out.push(String.fromCharCode(b));
      i++;
      continue;
    }
    if (i + need >= buf.length) {
      out.push(String.fromCharCode(b));
      i++;
      continue;
    }
    let ok = true;
    for (let k = 1; k <= need; k++) {
      if ((buf[i + k] & 0xc0) !== 0x80) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      out.push(String.fromCharCode(b));
      i++;
      continue;
    }
    const slice = buf.subarray(i, i + 1 + need);
    out.push(Buffer.from(slice).toString("utf8"));
    i += 1 + need;
  }
  return out.join("");
}

function tryDecode(text) {
  try {
    return decodeUtf8Lenient(toCp1252Bytes(text));
  } catch {
    return null;
  }
}

function fixText(text) {
  const before = markerScore(text);
  if (before === 0) return { text, changed: false, before, after: 0 };

  let best = text;
  let bestScore = before;
  let cur = text;
  // Up to 3 passes (handles rare double-encoding)
  for (let pass = 0; pass < 3; pass++) {
    const next = tryDecode(cur);
    if (!next || next === cur) break;
    const sc = markerScore(next);
    if (sc < bestScore) {
      best = next;
      bestScore = sc;
      cur = next;
    } else {
      break;
    }
  }

  if (bestScore < before) {
    return { text: best, changed: true, before, after: bestScore };
  }
  return { text, changed: false, before, after: before };
}

function ensureCharsetInHtml(content, filePath) {
  if (!/\.html?$/i.test(filePath)) return content;
  if (!/<head[^>]*>/i.test(content)) return content;
  // Remove existing charset metas, then insert as first head child
  content = content.replace(/\s*<meta\s+charset\s*=\s*["']?[^"'\s>]+["']?\s*\/?>/gi, "");
  content = content.replace(
    /<head([^>]*)>/i,
    '<head$1>\n  <meta charset="utf-8" />'
  );
  return content;
}

let changedFiles = 0;
let scanned = 0;

for (const root of ROOTS) {
  const abs = path.resolve(root);
  if (!fs.existsSync(abs)) {
    console.error("Missing:", abs);
    continue;
  }
  console.log("===", abs);
  for (const file of walk(abs)) {
    if (path.basename(file).startsWith("_fix-mojibake")) continue;
    if (path.basename(file).startsWith("_debug-mojibake")) continue;
    scanned++;
    const raw = fs.readFileSync(file);
    const start = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? 3 : 0;
    let text = raw.slice(start).toString("utf8");
    const { text: fixed, changed, before, after } = fixText(text);
    let out = ensureCharsetInHtml(fixed, file);
    if (changed || out !== text) {
      fs.writeFileSync(file, out, { encoding: "utf8" });
      changedFiles++;
      const tag = changed ? "FIXED" : "META";
      console.log(
        `${tag} ${path.relative(abs, file)} score ${before}->${changed ? after : before}`
      );
    }
  }
}

console.log(`Done. Scanned ${scanned}, updated ${changedFiles}.`);
