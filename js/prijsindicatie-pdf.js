/**
 * Client-side prijsindicatie → PDF via print-dialoog (Opslaan als PDF).
 * Geen backend, geen externe PDF-lib — data blijft in de browser.
 */
(() => {
  const CONTACT = {
    email: "info@aanbouw.direct",
    phone: "023 205 2483",
    phoneTel: "+31232052483",
    address: "Molenweg 133, Aalsmeerderbrug",
    site: "https://aanbouw.direct/",
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function liRows(items, kind) {
    if (!items || !items.length) return "";
    return items
      .map((item) => {
        const label = escapeHtml(item.short || item.title || item);
        const mark = kind === "in" ? "✓" : "–";
        return `<li><span class="mark mark--${kind}" aria-hidden="true">${mark}</span>${label}</li>`;
      })
      .join("");
  }

  function choiceRows(rows) {
    if (!rows || !rows.length) return "";
    return rows
      .map(
        (row) =>
          `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
      )
      .join("");
  }

  function buildDocument(data) {
    const date = data.date || new Date().toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const includeHtml = liRows(data.include, "in");
    const excludeHtml = liRows(data.exclude, "out");
    const choicesHtml = choiceRows(data.choices);
    const naam = data.naam ? escapeHtml(data.naam) : "";
    const logoSrc = escapeHtml(
      data.logoUrl ||
        (typeof window !== "undefined"
          ? new URL("assets/aanbouwdirect-mark.svg", window.location.href).href
          : "assets/aanbouwdirect-mark.svg")
    );

    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prijsindicatie — Aanbouwdirect</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ad-teal: #007694;
      --ad-teal-dark: #005A72;
      --ad-orange: #E07830;
      --ad-sand: #F3E0D0;
      --ad-graphite: #1C2428;
      --ad-stone: #6B7378;
      --ad-chalk: #F5F7F8;
      --ad-white: #FFFFFF;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Source Sans 3", system-ui, sans-serif;
      color: var(--ad-graphite);
      background: #e8ecee;
      font-size: 10.5pt;
      line-height: 1.45;
    }
    h1, h2, h3 {
      font-family: "Manrope", system-ui, sans-serif;
      letter-spacing: -0.02em;
      margin: 0 0 0.35em;
    }
    .toolbar {
      width: min(210mm, 96vw);
      margin: 16px auto 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .toolbar button {
      font-family: "Manrope", sans-serif;
      font-weight: 600;
      border: none;
      background: var(--ad-orange);
      color: white;
      padding: 10px 14px;
      border-radius: 4px;
      cursor: pointer;
    }
    .toolbar p {
      margin: 0;
      font-size: 9.5pt;
      color: var(--ad-stone);
      flex: 1;
      min-width: 180px;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 16px auto 24px;
      background: var(--ad-white);
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      padding: 0 0 14mm;
      display: flex;
      flex-direction: column;
    }
    .band {
      background: linear-gradient(105deg, var(--ad-teal-dark), var(--ad-teal) 55%, #0490b0);
      color: var(--ad-white);
      padding: 9mm 16mm 8mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10mm;
    }
    .brand { display: flex; align-items: center; gap: 3.5mm; }
    .brand img { height: 38px; width: auto; display: block; }
    .brand-text strong {
      display: block;
      font-family: "Manrope", sans-serif;
      font-weight: 800;
      font-size: 13pt;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .brand-text span {
      display: block;
      margin-top: 1.5mm;
      font-size: 9pt;
      opacity: 0.9;
    }
    .doc-meta { text-align: right; font-size: 9.5pt; line-height: 1.5; }
    .doc-type {
      display: inline-block;
      font-family: "Manrope", sans-serif;
      font-weight: 700;
      font-size: 11pt;
      background: var(--ad-orange);
      color: var(--ad-white);
      padding: 1.5mm 3.5mm;
      border-radius: 2px;
      margin-bottom: 2.5mm;
    }
    .body {
      padding: 8mm 16mm 0;
      display: flex;
      flex-direction: column;
      gap: 6mm;
      flex: 1;
    }
    .block h2 {
      font-size: 9.5pt;
      color: var(--ad-teal-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid rgba(0,118,148,0.25);
      padding-bottom: 1.5mm;
      margin-bottom: 3mm;
    }
    .muted { color: var(--ad-stone); }
    .price-hero {
      background: var(--ad-chalk);
      border-left: 3.5px solid var(--ad-orange);
      padding: 5mm 6mm;
    }
    .price-hero .label {
      font-family: "Manrope", sans-serif;
      font-weight: 700;
      font-size: 8.5pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ad-stone);
      margin: 0 0 1.5mm;
    }
    .price-hero .range {
      font-family: "Manrope", sans-serif;
      font-weight: 800;
      font-size: 22pt;
      color: var(--ad-orange);
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0;
    }
    .price-hero .hint {
      margin: 2.5mm 0 0;
      font-size: 9pt;
      color: var(--ad-stone);
    }
    table.choices {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    table.choices th, table.choices td {
      text-align: left;
      padding: 2.4mm 2mm;
      border-bottom: 1px solid rgba(28,36,40,0.12);
      vertical-align: top;
    }
    table.choices th {
      width: 38%;
      font-family: "Manrope", sans-serif;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ad-stone);
      background: var(--ad-chalk);
      font-weight: 700;
    }
    .scope-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6mm;
    }
    .scope-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .scope-list li {
      display: flex;
      gap: 2.5mm;
      align-items: flex-start;
      margin: 0 0 2mm;
      font-size: 9.5pt;
    }
    .mark {
      flex: 0 0 auto;
      width: 5mm;
      height: 5mm;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      line-height: 1;
      margin-top: 0.4mm;
    }
    .mark--in {
      color: #2F7D4A;
      background: rgba(47,125,74,0.14);
    }
    .mark--out {
      color: var(--ad-orange);
      background: rgba(224,120,48,0.14);
    }
    .disclaimer {
      background: rgba(0,118,148,0.06);
      border: 1px solid rgba(0,118,148,0.2);
      padding: 4mm 5mm;
      font-size: 9pt;
      color: var(--ad-stone);
      border-radius: 2px;
    }
    .disclaimer strong {
      display: block;
      color: var(--ad-teal-dark);
      font-family: "Manrope", sans-serif;
      font-size: 9.5pt;
      margin-bottom: 1.5mm;
    }
    .footer {
      margin-top: auto;
      padding: 5mm 16mm 0;
      border-top: 1px solid rgba(28,36,40,0.12);
      display: flex;
      justify-content: space-between;
      gap: 6mm;
      font-size: 8.5pt;
      color: var(--ad-stone);
    }
    .footer a { color: var(--ad-teal); text-decoration: none; }
    @media print {
      body { background: white; }
      .toolbar { display: none !important; }
      .page {
        margin: 0;
        box-shadow: none;
        width: auto;
        min-height: 100vh;
      }
    }
    @media (max-width: 700px) {
      .page { width: auto; margin: 12px; }
      .scope-grid { grid-template-columns: 1fr; }
      .band { flex-direction: column; }
      .doc-meta { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Opslaan als PDF / printen</button>
    <p>Kies in het dialoogvenster <strong>Opslaan als PDF</strong> (of Print naar PDF). Niets wordt naar onze servers gestuurd.</p>
  </div>
  <article class="page">
    <header class="band">
      <div class="brand">
        <img src="${logoSrc}" alt="" width="48" height="42" onerror="this.style.display='none'" />
        <div class="brand-text">
          <strong>Aanbouwdirect</strong>
          <span>Waarom verhuizen als je kan uitbouwen?</span>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-type">Prijsindicatie</div>
        <div>Datum: ${escapeHtml(date)}</div>
        ${naam ? `<div>Voor: ${naam}</div>` : ""}
      </div>
    </header>
    <div class="body">
      <section class="price-hero">
        <p class="label">Richtprijs (casco)</p>
        <p class="range">${escapeHtml(data.priceRange)}</p>
        <p class="hint">Indicatie op basis van jouw keuzes — geen definitieve offerte. Definitieve prijs na afspraak op locatie.</p>
      </section>

      <section class="block">
        <h2>Jouw keuzes</h2>
        <table class="choices">
          <tbody>
            ${choicesHtml}
          </tbody>
        </table>
      </section>

      <section class="block">
        <h2>Wat zit erbij</h2>
        <p class="muted" style="margin:0 0 3mm;font-size:9.5pt;">${escapeHtml(data.scopeLead || "Casco: wind- & waterdicht, geïsoleerd, met kozijnen. Geen binnenafwerking.")}</p>
        <div class="scope-grid">
          <div>
            <h3 style="font-size:10pt;color:var(--ad-teal-dark);margin-bottom:2mm;">Inbegrepen</h3>
            <ul class="scope-list">${includeHtml}</ul>
          </div>
          <div>
            <h3 style="font-size:10pt;color:var(--ad-orange);margin-bottom:2mm;">Niet inbegrepen</h3>
            <ul class="scope-list">${excludeHtml}</ul>
          </div>
        </div>
      </section>

      <section class="disclaimer">
        <strong>Let op: dit is een prijsindicatie</strong>
        Geen definitieve offerte. De bandbreedte hangt af van situatie op locatie (fundering, bereikbaarheid, details).
        Na een afspraak sturen we een heldere, bindende offerte. Vragen? Bel ${CONTACT.phone} of mail ${CONTACT.email}.
      </section>
    </div>
    <footer class="footer">
      <div>
        Aanbouw-direct.nl<br />
        ${CONTACT.address}
      </div>
      <div style="text-align:right;">
        <a href="mailto:${CONTACT.email}">${CONTACT.email}</a><br />
        <a href="tel:${CONTACT.phoneTel}">${CONTACT.phone}</a><br />
        <a href="${CONTACT.site}">aanbouw.direct</a>
      </div>
    </footer>
  </article>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 280);
    });
  </script>
</body>
</html>`;
  }

  /**
   * @param {object} data
   * @param {string} data.priceRange
   * @param {{label:string,value:string}[]} data.choices
   * @param {{title?:string,short?:string}[]} [data.include]
   * @param {{title?:string,short?:string}[]} [data.exclude]
   * @param {string} [data.scopeLead]
   * @param {string} [data.naam]
   * @param {string} [data.date]
   */
  function open(data) {
    if (!data || !data.priceRange) {
      console.warn("AanbouwPrijsPdf: ontbrekende prijsdata");
      return false;
    }
    const html = buildDocument(data);
    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up geblokkeerd. Sta pop-ups toe voor aanbouw.direct om je prijsindicatie te downloaden.");
      return false;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    try {
      win.focus();
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  window.AanbouwPrijsPdf = { open, buildDocument };
})();
