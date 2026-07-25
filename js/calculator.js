(() => {
  const state = {
    step: 1,
    type: null,
    width: 4,
    depth: 3,
    height: 2.8,
    // Casco-opties
    gevel: null,
    kozijn: null,
    isolatie: null,
    heipalen: null,
    // Dakterras
    toegang: null,
    hekwerk: null,
    dek: null,
    // Dakkapel
    dakvorm: null,
    dakkapelMateriaal: null,
  };

  /*
   * Interne basis €/m² (niet tonen in UI).
   * Bronnen (richtprijzen NL, relative — geen garantie):
   * - Aanbouw / bijhuisje ~€2800 (bestaande bedrijfsrichtlijn)
   * - Dakterras ~€750–1250/m² all-in → basis 720 (~20% onder oude 900)
   * - Dakkapel: breedte-tabel kunststof/hout (incl. plaatsing), zie dakkapelBaseByWidth
   */
  const rates = {
    aanbouw: 2800,
    nok: 2200,
    dakopbouw: 3000,
    dakterras: 720,
    bijhuisje: 2800, // zelfde basis als aanbouw (tuinhuis / bijgebouw)
  };

  // Dakkapel ijkpunten breedte × materiaal (incl. plaatsing) — interpolatie daartussen
  const dakkapelBaseByWidth = {
    kunststof: [
      { w: 3, p: 7000 },
      { w: 4, p: 7700 },
      { w: 5, p: 8500 },
      { w: 6, p: 9800 },
    ],
    hout: [
      { w: 3, p: 8500 },
      { w: 4, p: 9300 },
      { w: 5, p: 9800 },
      { w: 6, p: 11800 },
    ],
  };

  // Casco-flow: gevel → kozijn → isolatie (+ heipalen bij aanbouw/bijhuisje)
  const CASCO_TYPES = new Set(["aanbouw", "nok", "dakopbouw", "bijhuisje"]);
  const HEIPALEN_TYPES = new Set(["aanbouw", "bijhuisje"]);

  // Relatieve opslagen t.o.v. baseline per categorie
  const multipliers = {
    gevel: {
      stuc: 0.92,
      steen: 1.0,
      hout: 1.08,
      match: 1.1,
    },
    kozijn: {
      kunststof: 1.0,
      aluminium: 1.1,
      hout: 1.12,
      houtalu: 1.18,
    },
    isolatie: {
      standaard: 1.0,
      onbekend: 1.04,
      extra: 1.1,
    },
    heipalen: {
      nee: 1.0,
      onbekend: 1.08,
      ja: 1.15,
    },
    // Dakterras — toegang: duikluik goedkoper dan dakopgang/hutje + vaste trap
    // (dakluik ~€1450–2650 vs trap+opgang duidelijk hoger; Verbouwkosten/BouwadviesShop)
    toegang: {
      duikluik: 1.0,
      dakopgang: 1.18,
      beide: 1.28,
    },
    // Hekwerk: spijlen/aluminium baseline, hout +, glas ++ (~€120–220 vs €150–300 vs €300–550/m¹)
    hekwerk: {
      spijlen: 1.0,
      hout: 1.08,
      glas: 1.22,
    },
    // Dek/vlonder: tegels goedkoopst, douglas mid, composiet/hardhout duurder
    dek: {
      tegels: 0.95,
      douglas: 1.0,
      composiet: 1.1,
      hardhout: 1.14,
    },
    // Dakkapel dakvorm: plat standaard, lessenaar +, zadel ++ (~€1000–1250 meerprijs)
    dakvorm: {
      plat: 1.0,
      lessenaar: 1.08,
      zadel: 1.15,
    },
    // Dakkapel kozijn: lichte fine-tune (hoofdprijs zit in breedte + materiaal)
    dakkapelKozijn: {
      kunststof: 1.0,
      aluminium: 1.04,
      hout: 1.05,
      houtalu: 1.07,
    },
  };

  const labels = {
    type: {
      aanbouw: "Aanbouw",
      nok: "Nokverhoging",
      dakopbouw: "Dakopbouw",
      dakterras: "Dakterras",
      dakkapel: "Dakkapel",
      bijhuisje: "Bijhuisje",
    },
    gevel: { steen: "Steen", stuc: "Stucwerk", hout: "Hout", match: "Gelijk aan woning" },
    kozijn: {
      kunststof: "Kunststof",
      aluminium: "Aluminium",
      hout: "Hout",
      houtalu: "Hout/aluminium",
    },
    isolatie: {
      standaard: "Standaard isolatie",
      extra: "Extra isolatie",
      onbekend: "Isolatie: weet ik niet",
    },
    heipalen: {
      ja: "Heipalen: ja",
      nee: "Heipalen: nee",
      onbekend: "Heipalen: weet ik niet",
    },
    toegang: {
      duikluik: "Toegang: duikluik",
      dakopgang: "Toegang: dakopgang",
      beide: "Toegang: duikluik + opgang",
    },
    hekwerk: {
      spijlen: "Hekwerk: spijlen",
      hout: "Hekwerk: hout",
      glas: "Hekwerk: glas",
    },
    dek: {
      tegels: "Dek: tegels",
      douglas: "Dek: douglas",
      composiet: "Dek: composiet",
      hardhout: "Dek: hardhout",
    },
    dakvorm: {
      plat: "Dak: plat",
      lessenaar: "Dak: lessenaars",
      zadel: "Dak: zadeldak",
    },
    dakkapelMateriaal: {
      kunststof: "Materiaal: kunststof",
      hout: "Materiaal: hout",
      zink: "Materiaal: zink",
    },
  };

  const typeDefaults = {
    aanbouw: { width: 4, depth: 3, height: 2.8 },
    nok: { width: 6, depth: 8, height: 2.8 },
    dakopbouw: { width: 6, depth: 4, height: 2.6 },
    dakterras: { width: 4, depth: 5, height: 2.8 },
    dakkapel: { width: 3, depth: 1.5, height: 1.5 },
    bijhuisje: { width: 4, depth: 3, height: 2.6 },
  };

  /*
   * Scope “Wat zit erbij” per type — onderhoud hier.
   * include/exclude: { title, detail, short? }
   * short = compacte bullets in calculator-stap 6
   */
  const includesByType = {
    aanbouw: {
      label: "Aanbouw",
      intro:
        "Onze prijsindicatie is <strong>casco</strong>: wind- &amp; waterdicht, geïsoleerd, met kozijnen en elektra tot casco-niveau. Bouwtechnisch klaar om verder af te werken — geen complete binnenafwerking.",
      lead:
        "<strong>Casco aanbouw:</strong> wind- &amp; waterdicht, geïsoleerd, met kozijnen. Geen binnenafwerking.",
      inLead: "Dit zit standaard in de richting van je indicatie.",
      outLead: "Geen vage beloftes: dit is exclusief interieurafbouw.",
      foot: "Wil je wél afbouw meenemen? Zeg het bij de afspraak — we rekenen dat apart uit.",
      include: [
        {
          title: "Hijskraan",
          detail: "bereikbaarheid en hijswerk op de bouw meegenomen waar nodig",
          short: "Hijskraan",
        },
        {
          title: "Kozijnen",
          detail: "ramen en deuren in de schil (type kies je in de calculator)",
          short: "Kozijnen",
        },
        {
          title: "Casco oplevering",
          detail: "constructie, gevels/dak, wind- &amp; waterdicht",
          short: "Casco oplevering",
        },
        {
          title: "Stroom aangelegd",
          detail: "elektra aangebracht tot casco-niveau",
          short: "Stroom aangelegd",
        },
        {
          title: "Waterdicht maken",
          detail: "dak, aansluitingen en dichting tegen weer",
          short: "Waterdicht + isoleren",
        },
        {
          title: "Isoleren",
          detail: "schilisolatie volgens de afgesproken eisen",
        },
        {
          title: "Aansluiting op je woning",
          detail: "openingen, doorbraken en nette aansluiting",
        },
      ],
      exclude: [
        {
          title: "Geen gestucte binnenafwerking",
          detail: "wanden en plafonds blijven ongestuct",
          short: "Geen stucwerk binnen",
        },
        {
          title: "Geen vloeren",
          detail: "geen dekvloer-afwerking of vloerbedekking",
          short: "Geen vloeren / keuken",
        },
        {
          title: "Geen keuken of sanitair",
          detail: "inbouw en afwerking van keuken/bad doe jij apart",
        },
        {
          title: "Geen schilderwerk binnen",
          detail: "binnen schilderen en lakwerk niet inbegrepen",
        },
        {
          title: "Geen complete interieurafwerking",
          detail: "geen turn-key woonklare afbouw",
          short: "Geen complete afbouw",
        },
      ],
    },
    nok: {
      label: "Nokverhoging",
      intro:
        "Indicatie voor een <strong>casco nokverhoging</strong>: dakconstructie hoger, wind- &amp; waterdicht, geïsoleerd, met kozijnen waar van toepassing. Geen complete binnenafwerking van de zolder.",
      lead:
        "<strong>Casco nokverhoging:</strong> dakconstructie, isolatie en waterdicht. Geen binnenafwerking zolder.",
      inLead: "Dit hoort bij de richting van je nok-indicatie.",
      outLead: "Niet inbegrepen: interieurafbouw van de verhoogde ruimte.",
      foot: "Afbouw van de zolder of stahoogte-ruimte rekenen we apart uit bij de afspraak.",
      include: [
        {
          title: "Dakconstructie / nokverhoging",
          detail: "constructie om stahoogte of volume onder het dak te creëren",
          short: "Dakconstructie",
        },
        {
          title: "Waterdicht maken",
          detail: "dakbedekking, nokdetail en aansluitingen op bestaand dak",
          short: "Waterdicht dak",
        },
        {
          title: "Isoleren",
          detail: "dakisolatie volgens de afgesproken eisen",
          short: "Isolatie dak",
        },
        {
          title: "Kozijnen waar van toepassing",
          detail: "ramen in de nieuwe dakvlakken of gevels (type kies je in de calculator)",
          short: "Kozijnen",
        },
        {
          title: "Hijskraan",
          detail: "hijswerk meegenomen waar de bereikbaarheid dat vraagt",
          short: "Hijskraan",
        },
        {
          title: "Stroom aangelegd",
          detail: "elektra tot casco-niveau in de nieuwe constructie",
          short: "Stroom aangelegd",
        },
        {
          title: "Aansluiting op bestaande dakconstructie",
          detail: "nette overgang naar je huidige dak en dragende delen",
        },
      ],
      exclude: [
        {
          title: "Geen gestucte binnenafwerking",
          detail: "zolderwanden en plafonds blijven ongestuct",
          short: "Geen stucwerk binnen",
        },
        {
          title: "Geen vloeren / zolderafbouw",
          detail: "geen dekvloer, vloerbedekking of complete zolderinrichting",
          short: "Geen zolderafbouw",
        },
        {
          title: "Geen schilderwerk binnen",
          detail: "binnen schilderen en lakwerk niet inbegrepen",
        },
        {
          title: "Geen complete interieurafwerking",
          detail: "geen turn-key woonklare zolder",
          short: "Geen complete afbouw",
        },
      ],
    },
    dakopbouw: {
      label: "Dakopbouw",
      intro:
        "Indicatie voor een <strong>casco dakopbouw</strong>: extra volume op plat dak, wind- &amp; waterdicht, geïsoleerd, met kozijnen. Bouwtechnisch klaar om verder af te werken — geen complete binnenafwerking.",
      lead:
        "<strong>Casco dakopbouw:</strong> wind- &amp; waterdicht, geïsoleerd, met kozijnen. Geen binnenafwerking.",
      inLead: "Dit zit in de richting van je dakopbouw-indicatie.",
      outLead: "Exclusief interieurafbouw van de nieuwe verdieping.",
      foot: "Wil je de opbouw ook binnen afwerken? Noem het bij de afspraak.",
      include: [
        {
          title: "Constructie dakopbouw",
          detail: "dragende opbouw op plat dak, inclusief gevels en dak van de opbouw",
          short: "Constructie opbouw",
        },
        {
          title: "Kozijnen",
          detail: "ramen en deuren in de schil (type kies je in de calculator)",
          short: "Kozijnen",
        },
        {
          title: "Casco oplevering",
          detail: "wind- &amp; waterdicht opgeleverd, klaar voor afbouw",
          short: "Casco oplevering",
        },
        {
          title: "Waterdicht maken",
          detail: "dakvlak, goten/aansluitingen en dichting tegen weer",
          short: "Waterdicht + isoleren",
        },
        {
          title: "Isoleren",
          detail: "schilisolatie volgens de afgesproken eisen",
        },
        {
          title: "Hijskraan",
          detail: "hijswerk meegenomen waar nodig",
          short: "Hijskraan",
        },
        {
          title: "Stroom aangelegd",
          detail: "elektra tot casco-niveau",
          short: "Stroom aangelegd",
        },
        {
          title: "Aansluiting op je woning",
          detail: "doorbraak/trapaansluiting en nette overgang naar bestaand",
        },
      ],
      exclude: [
        {
          title: "Geen gestucte binnenafwerking",
          detail: "wanden en plafonds blijven ongestuct",
          short: "Geen stucwerk binnen",
        },
        {
          title: "Geen vloeren",
          detail: "geen dekvloer-afwerking of vloerbedekking",
          short: "Geen vloeren / keuken",
        },
        {
          title: "Geen keuken of sanitair",
          detail: "inbouw en afwerking doe jij apart",
        },
        {
          title: "Geen schilderwerk binnen",
          detail: "binnen schilderen en lakwerk niet inbegrepen",
        },
        {
          title: "Geen complete interieurafwerking",
          detail: "geen turn-key woonklare opbouw",
          short: "Geen complete afbouw",
        },
      ],
    },
    dakterras: {
      label: "Dakterras",
      intro:
        "Indicatie voor een <strong>dakterras</strong> (geen dakopbouw): waterdicht dakvlak, dek, hekwerk en toegang zoals je kiest. Definitief na check van draagkracht op locatie — geen standaard complete binnenafwerking.",
      lead:
        "<strong>Indicatie dakterras:</strong> constructie/versterking, waterdichting, dek, hekwerk en toegang. Definitief na check draagkracht.",
      inLead: "Dit hoort bij de richting van je dakterras-indicatie.",
      outLead: "Geen woonruimte of binnenafbouw — dit is een terras op het dak.",
      foot: "Draagkracht, waterdichting en toegang checken we op locatie voor de definitieve offerte.",
      include: [
        {
          title: "Waterdicht dakvlak",
          detail: "dakbedekking en dichting zodat het terras droog blijft",
          short: "Waterdicht dakvlak",
        },
        {
          title: "Constructie / versterking",
          detail: "waar nodig versterking of opbouw van het dakvlak (definitief na check)",
          short: "Constructie / versterking",
        },
        {
          title: "Dek / vloerafwerking",
          detail: "tegels, douglas, composiet of hardhout — zoals gekozen in de calculator",
          short: "Dek / vloer",
        },
        {
          title: "Hekwerk",
          detail: "veiligheidshek rondom (spijlen, hout of glas)",
          short: "Hekwerk",
        },
        {
          title: "Toegang",
          detail: "duikluik, dakopgang/hutje of beide — volgens je keuze",
          short: "Toegang (luik/hutje)",
        },
        {
          title: "Afwatering",
          detail: "afschot en afvoer zodat water netjes weg kan",
          short: "Afwatering",
        },
      ],
      exclude: [
        {
          title: "Geen complete binnenafwerking",
          detail: "geen stuc, schilderwerk of woonklare afbouw onder het terras",
          short: "Geen binnenafbouw",
        },
        {
          title: "Geen woonruimte / dakopbouw",
          detail: "dit is een terras, geen extra verdieping met muren en dak",
          short: "Geen dakopbouw",
        },
        {
          title: "Geen keuken of sanitair",
          detail: "geen buitenkeuken of sanitair in de standaardindicatie",
          short: "Geen keuken / sanitair",
        },
        {
          title: "Geen meubilair of beplanting",
          detail: "inrichting van het terras doe je zelf",
        },
        {
          title: "Geen garantie zonder draagkrachtcheck",
          detail: "prijs en uitvoering hangen af van de check op locatie",
        },
      ],
    },
    dakkapel: {
      label: "Dakkapel",
      intro:
        "Indicatie voor een <strong>casco dakkapel</strong>: plaatsing inclusief dakwerken, isolatie van de kapel en kozijnen volgens je keuzes. Geen complete binnenafbouw van de zolder tenzij afgesproken.",
      lead:
        "<strong>Indicatie dakkapel:</strong> casco-plaatsing incl. dakwerk, isolatie en kozijnen. Geen complete binnenafbouw.",
      inLead: "Dit zit in de richting van je dakkapel-indicatie.",
      outLead: "Exclusief complete zolderafbouw — tenzij je dat apart afspreekt.",
      foot: "Binnenafwerking van de zolder of extra opties rekenen we bij de afspraak uit.",
      include: [
        {
          title: "Casco plaatsing dakkapel",
          detail: "plaatsing van de kapel inclusief constructieve aansluiting",
          short: "Casco plaatsing",
        },
        {
          title: "Dakwerken",
          detail: "aansluiting op hellend dak, lood/kitwerk en waterdichte overgang",
          short: "Dakwerken",
        },
        {
          title: "Isolatie van de kapel",
          detail: "isolatie in de schil van de dakkapel",
          short: "Isolatie kapel",
        },
        {
          title: "Kozijnen",
          detail: "ramen in de dakkapel (type kies je in de calculator)",
          short: "Kozijnen",
        },
        {
          title: "Buitenafwerking",
          detail: "materiaal zoals kunststof, hout of zink — volgens je keuze",
          short: "Buitenafwerking",
        },
        {
          title: "Waterdicht maken",
          detail: "dakvlak van de kapel en aansluitingen tegen regen",
        },
      ],
      exclude: [
        {
          title: "Geen complete zolderafbouw",
          detail: "geen stuc, vloeren of volledige inrichting van de zolder",
          short: "Geen zolderafbouw",
        },
        {
          title: "Geen gestucte binnenafwerking",
          detail: "binnenkant van de kapel/zolder blijft ongestuct tenzij afgesproken",
          short: "Geen stucwerk binnen",
        },
        {
          title: "Geen schilderwerk binnen",
          detail: "binnen schilderen niet standaard inbegrepen",
        },
        {
          title: "Geen meubilair of inbouw",
          detail: "kasten, bedden of sanitair zitten niet in de indicatie",
          short: "Geen complete afbouw",
        },
      ],
    },
    bijhuisje: {
      label: "Bijhuisje",
      intro:
        "Indicatie voor een <strong>casco bijhuisje</strong> (tuinhuis/bijgebouw): zelfde basis als een aanbouw — wind- &amp; waterdicht, geïsoleerd, met kozijnen en elektra tot casco-niveau. Geen complete binnenafwerking.",
      lead:
        "<strong>Casco bijhuisje:</strong> wind- &amp; waterdicht, geïsoleerd, met kozijnen — zelfde basis als een aanbouw. Geen binnenafwerking.",
      inLead: "Dit zit standaard in de richting van je bijhuisje-indicatie.",
      outLead: "Exclusief interieurafbouw — net als bij een aanbouw.",
      foot: "Afbouw, keuken of sanitair in het bijgebouw? Noem het bij de afspraak.",
      include: [
        {
          title: "Casco oplevering",
          detail: "constructie, gevels/dak, wind- &amp; waterdicht",
          short: "Casco oplevering",
        },
        {
          title: "Kozijnen",
          detail: "ramen en deuren in de schil (type kies je in de calculator)",
          short: "Kozijnen",
        },
        {
          title: "Isoleren",
          detail: "schilisolatie volgens de afgesproken eisen",
          short: "Waterdicht + isoleren",
        },
        {
          title: "Waterdicht maken",
          detail: "dak, aansluitingen en dichting tegen weer",
        },
        {
          title: "Stroom aangelegd",
          detail: "elektra aangebracht tot casco-niveau",
          short: "Stroom aangelegd",
        },
        {
          title: "Hijskraan",
          detail: "hijswerk meegenomen waar nodig",
          short: "Hijskraan",
        },
        {
          title: "Fundering / heipalen (indicatief)",
          detail: "meegenomen in de bandbreedte; definitief na check van de grond",
        },
      ],
      exclude: [
        {
          title: "Geen gestucte binnenafwerking",
          detail: "wanden en plafonds blijven ongestuct",
          short: "Geen stucwerk binnen",
        },
        {
          title: "Geen vloeren",
          detail: "geen dekvloer-afwerking of vloerbedekking",
          short: "Geen vloeren / keuken",
        },
        {
          title: "Geen keuken of sanitair",
          detail: "inbouw en afwerking doe jij apart",
        },
        {
          title: "Geen schilderwerk binnen",
          detail: "binnen schilderen en lakwerk niet inbegrepen",
        },
        {
          title: "Geen complete interieurafwerking",
          detail: "geen turn-key woonklare afbouw",
          short: "Geen complete afbouw",
        },
      ],
    },
  };

  const totalSteps = 6;

  const els = {
    steps: [...document.querySelectorAll(".calc-step")],
    progress: document.querySelector(".calc-progress"),
    price: document.querySelector("[data-price]"),
    priceNote: document.querySelector("[data-price-note]"),
    summary: document.querySelector("[data-summary]"),
    vizExt: document.querySelector('[data-viz-ext="aanbouw"]'),
    vizLabel: document.querySelector("[data-viz-label]"),
    vizScenes: [...document.querySelectorAll("[data-viz-scene]")],
    widthOut: document.querySelector("[data-width-out]"),
    depthOut: document.querySelector("[data-depth-out]"),
    heightOut: document.querySelector("[data-height-out]"),
    areaOut: document.querySelector("[data-area-out]"),
    liveSummary: document.querySelector("[data-live-summary]"),
    livePriceBoxes: [...document.querySelectorAll("[data-live-price-box]")],
    livePrices: [...document.querySelectorAll("[data-live-price]")],
    form: document.querySelector("#lead-form"),
    heipalenStep: document.querySelector('[data-step="5"]'),
    heightRow: document.querySelector("[data-dim-height]"),
    step2Lead: document.querySelector("[data-step2-lead]"),
    widthLabel: document.querySelector("[data-label-width]"),
    depthLabel: document.querySelector("[data-label-depth]"),
  };

  let priceFlashTimer = null;

  function flowFor(type) {
    if (!type) return "casco";
    if (CASCO_TYPES.has(type)) return "casco";
    return type;
  }

  function usesHeight(type) {
    // Dakterras: alleen breedte × diepte. Dakkapel: wel hoogte van de kapel (min 1 m).
    return type !== "dakterras";
  }

  function m2() {
    return Math.round(state.width * state.depth * 10) / 10;
  }

  function interpolateWidthPrice(table, width) {
    const w = Math.max(1.5, Math.min(8, Number(width) || 3));
    if (w <= table[0].w) {
      const slope = (table[1].p - table[0].p) / (table[1].w - table[0].w);
      return table[0].p + (w - table[0].w) * slope;
    }
    const last = table[table.length - 1];
    if (w >= last.w) {
      const prev = table[table.length - 2];
      const slope = (last.p - prev.p) / (last.w - prev.w);
      return last.p + (w - last.w) * slope;
    }
    for (let i = 0; i < table.length - 1; i++) {
      const a = table[i];
      const b = table[i + 1];
      if (w >= a.w && w <= b.w) {
        const t = (w - a.w) / (b.w - a.w);
        return a.p + t * (b.p - a.p);
      }
    }
    return table[0].p;
  }

  function dakkapelTuneFactor() {
    // Referentie: diepte 1,5 m · hoogte 1,5 m · plat dak → factor 1 (breedte-tabel exact)
    const depth = Math.max(1, Math.min(2.5, state.depth));
    const height = Math.max(1, Math.min(2.5, state.height));
    const depthFactor = 1 + (depth - 1.5) * 0.04; // ~0.98–1.04
    const heightFactor = 1 + (height - 1.5) * 0.03; // ~0.985–1.03
    const dakvormFactor = state.dakvorm ? multipliers.dakvorm[state.dakvorm] || 1 : 1;
    const kozijnFactor = state.kozijn
      ? multipliers.dakkapelKozijn[state.kozijn] || 1
      : 1;
    return depthFactor * heightFactor * dakvormFactor * kozijnFactor;
  }

  function dakkapelMaterialPrices() {
    const tune = dakkapelTuneFactor();
    const kunststof = interpolateWidthPrice(dakkapelBaseByWidth.kunststof, state.width) * tune;
    const hout = interpolateWidthPrice(dakkapelBaseByWidth.hout, state.width) * tune;
    const zink = hout * 1.1;
    return { kunststof, hout, zink };
  }

  function estimate() {
    const type = state.type || "aanbouw";

    if (type === "dakkapel") {
      const prices = dakkapelMaterialPrices();
      let mid;
      let low;
      let high;
      const mat = state.dakkapelMateriaal;
      if (mat === "kunststof") {
        mid = prices.kunststof;
        // Band blijft kunststof→hout-span voelen (iets smaller rond keuze)
        low = prices.kunststof * 0.96;
        high = prices.hout * 0.92;
        if (high < mid * 1.05) high = mid * 1.08;
      } else if (mat === "hout") {
        mid = prices.hout;
        low = prices.kunststof * 1.02;
        high = prices.hout * 1.06;
        if (low > mid * 0.95) low = mid * 0.92;
      } else if (mat === "zink") {
        mid = prices.zink;
        low = prices.hout * 0.98;
        high = prices.zink * 1.08;
      } else {
        // Geen materiaal: toon kunststof → hout als live range
        mid = (prices.kunststof + prices.hout) / 2;
        low = prices.kunststof;
        high = prices.hout;
      }
      mid = Math.round(mid / 100) * 100;
      low = Math.round(low / 100) * 100;
      high = Math.round(high / 100) * 100;
      if (high < mid) high = mid;
      if (low > mid) low = mid;
      return { low, high, mid, m2: m2() };
    }

    let mid = rates[type] * m2();

    if (usesHeight(type)) {
      if (state.height >= 3.0) mid *= 1.06;
      else if (state.height >= 2.8) mid *= 1.03;
    }

    if (CASCO_TYPES.has(type)) {
      if (state.gevel) mid *= multipliers.gevel[state.gevel] || 1;
      if (state.kozijn) mid *= multipliers.kozijn[state.kozijn] || 1;
      if (state.isolatie) mid *= multipliers.isolatie[state.isolatie] || 1;
      if (HEIPALEN_TYPES.has(type) && state.heipalen) {
        mid *= multipliers.heipalen[state.heipalen] || 1;
      }
    } else if (type === "dakterras") {
      if (state.toegang) mid *= multipliers.toegang[state.toegang] || 1;
      if (state.hekwerk) mid *= multipliers.hekwerk[state.hekwerk] || 1;
      if (state.dek) mid *= multipliers.dek[state.dek] || 1;
    }

    mid = Math.round(mid / 100) * 100;
    const low = Math.round((mid * 0.9) / 100) * 100;
    const high = Math.round((mid * 1.12) / 100) * 100;
    return { low, high, mid, m2: m2() };
  }

  function formatEuro(n) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  }

  function buildSummaryParts() {
    const parts = [];
    if (state.type) parts.push(labels.type[state.type]);
    parts.push(`${m2()} m²`);
    parts.push(`${state.width} × ${state.depth} m`);
    if (usesHeight(state.type)) {
      if (state.type === "dakkapel") {
        parts.push(`hoogte kapel ${state.height} m`);
      } else {
        parts.push(`hoogte ${state.height} m`);
      }
    }

    const type = state.type;
    if (CASCO_TYPES.has(type)) {
      if (state.gevel) parts.push(labels.gevel[state.gevel]);
      if (state.kozijn) parts.push(labels.kozijn[state.kozijn]);
      if (state.isolatie) parts.push(labels.isolatie[state.isolatie]);
      if (HEIPALEN_TYPES.has(type) && state.heipalen) {
        parts.push(labels.heipalen[state.heipalen]);
      }
    } else if (type === "dakterras") {
      if (state.toegang) parts.push(labels.toegang[state.toegang]);
      if (state.hekwerk) parts.push(labels.hekwerk[state.hekwerk]);
      if (state.dek) parts.push(labels.dek[state.dek]);
    } else if (type === "dakkapel") {
      if (state.dakvorm) parts.push(labels.dakvorm[state.dakvorm]);
      if (state.dakkapelMateriaal) parts.push(labels.dakkapelMateriaal[state.dakkapelMateriaal]);
      if (state.kozijn) parts.push(labels.kozijn[state.kozijn]);
    }
    return parts;
  }

  function syncFlowPanels() {
    const flow = flowFor(state.type);
    document.querySelectorAll("[data-flow]").forEach((panel) => {
      const match = panel.dataset.flow === flow;
      panel.hidden = !match;
    });

    const pileBlock = document.querySelector("[data-heipalen-block]");
    if (pileBlock) {
      pileBlock.hidden = !HEIPALEN_TYPES.has(state.type);
    }

    if (els.heightRow) {
      els.heightRow.hidden = state.type ? !usesHeight(state.type) : false;
    }

    if (els.step2Lead) {
      if (state.type === "dakterras") {
        els.step2Lead.textContent =
          "Breedte × diepte = oppervlakte van je dakterras. Metrage is verplicht voor de indicatie.";
      } else if (state.type === "dakkapel") {
        els.step2Lead.textContent =
          "Breedte bepaalt de prijs het meest. Diepte = uitsteek; hoogte = stahoogte van de kapel (vanaf 1 m).";
      } else if (state.type === "bijhuisje") {
        els.step2Lead.textContent =
          "Breedte × diepte = vloeroppervlak van je bijhuisje. Hoogte telt mee in comfort én prijs.";
      } else {
        els.step2Lead.textContent =
          "Breedte × diepte = totale oppervlakte. Hoogte telt mee in comfort én prijs.";
      }
    }

    if (els.widthLabel) {
      els.widthLabel.textContent =
        state.type === "dakkapel" ? "Breedte (langs de gevel)" : "Breedte";
    }
    if (els.depthLabel) {
      if (state.type === "dakkapel") els.depthLabel.textContent = "Diepte (uitsteek)";
      else if (state.type === "dakterras") els.depthLabel.textContent = "Diepte";
      else els.depthLabel.textContent = "Diepte (lengte)";
    }
    const heightLabel = document.querySelector("[data-label-height]");
    if (heightLabel) {
      heightLabel.textContent =
        state.type === "dakkapel" ? "Hoogte van de kapel" : "Hoogte";
    }

    // Slider ranges per type
    const widthInput = document.querySelector("#calc-width");
    const depthInput = document.querySelector("#calc-depth");
    const heightInput = document.querySelector("#calc-height");
    if (widthInput && depthInput && state.type === "dakkapel") {
      widthInput.min = "1.5";
      widthInput.max = "8";
      depthInput.min = "1";
      depthInput.max = "2.5";
      depthInput.step = "0.25";
      if (heightInput) {
        heightInput.min = "1";
        heightInput.max = "2.5";
        heightInput.step = "0.1";
      }
    } else if (widthInput && depthInput) {
      widthInput.min = "2";
      widthInput.max = "12";
      depthInput.min = "2";
      depthInput.max = state.type === "dakterras" ? "12" : "10";
      depthInput.step = "0.5";
      if (heightInput) {
        heightInput.min = "2.4";
        heightInput.max = "3.4";
        heightInput.step = "0.1";
      }
    }

    updateScopeCopy();
  }

  function scopeMark(kind, size) {
    const s = size || 18;
    if (kind === "in") {
      return `<span class="scope-mark scope-mark--in" aria-hidden="true"><svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M4 10.5 8 14.5 16 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    }
    return `<span class="scope-mark scope-mark--out" aria-hidden="true"><svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M5 5l10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>`;
  }

  function scopeItemHtml(item, kind, size) {
    const mark = scopeMark(kind, size);
    if (item.detail) {
      return `<li>${mark}<span><strong>${item.title}</strong> — ${item.detail}</span></li>`;
    }
    return `<li>${mark}<span>${item.title}</span></li>`;
  }

  function scopeShortHtml(item, kind) {
    const label = item.short || item.title;
    return `<li>${scopeMark(kind, 16)}${label}</li>`;
  }

  function getScopeData(type) {
    const key = type && includesByType[type] ? type : "aanbouw";
    return { key, data: includesByType[key] };
  }

  function updateScopeCopy() {
    const { key, data } = getScopeData(state.type);
    if (!data) return;

    const lead = document.querySelector("[data-scope-lead]");
    if (lead) lead.innerHTML = data.lead;

    const compactIn = document.querySelector("[data-scope-compact-in]");
    const compactOut = document.querySelector("[data-scope-compact-out]");
    if (compactIn) {
      compactIn.innerHTML = data.include
        .filter((item) => item.short)
        .map((item) => scopeShortHtml(item, "in"))
        .join("");
    }
    if (compactOut) {
      compactOut.innerHTML = data.exclude
        .filter((item) => item.short)
        .map((item) => scopeShortHtml(item, "out"))
        .join("");
    }

    const typeLabel = document.querySelector("[data-scope-type-label]");
    const forLine = document.querySelector("[data-scope-for]");
    if (typeLabel) typeLabel.textContent = data.label;
    if (forLine) {
      forLine.hidden = false;
      const isDefault = !state.type;
      forLine.classList.toggle("is-default", isDefault);
      forLine.innerHTML = isDefault
        ? `Standaard getoond: <strong data-scope-type-label>${data.label}</strong>`
        : `Voor jouw keuze: <strong data-scope-type-label>${data.label}</strong>`;
    }

    const intro = document.querySelector("[data-scope-intro]");
    if (intro) intro.innerHTML = data.intro;

    const inLead = document.querySelector("[data-scope-in-lead]");
    const outLead = document.querySelector("[data-scope-out-lead]");
    if (inLead) inLead.textContent = data.inLead;
    if (outLead) outLead.textContent = data.outLead;

    const inList = document.querySelector("[data-scope-in-list]");
    const outList = document.querySelector("[data-scope-out-list]");
    if (inList) {
      inList.innerHTML = data.include.map((item) => scopeItemHtml(item, "in", 18)).join("");
    }
    if (outList) {
      outList.innerHTML = data.exclude.map((item) => scopeItemHtml(item, "out", 18)).join("");
    }

    const foot = document.querySelector("[data-scope-foot]");
    if (foot) foot.textContent = data.foot;

    const section = document.querySelector("[data-scope-section]");
    if (section) {
      section.dataset.scopeType = key;
      section.classList.remove("is-scope-updating");
      // Force reflow so CSS transition can replay
      void section.offsetWidth;
      section.classList.add("is-scope-updating");
    }
  }

  function applyTypeDefaults(type) {
    const d = typeDefaults[type];
    if (!d) return;
    state.width = d.width;
    state.depth = d.depth;
    state.height = d.height;
    const widthInput = document.querySelector("#calc-width");
    const depthInput = document.querySelector("#calc-depth");
    const heightInput = document.querySelector("#calc-height");
    // Eerst min/max zetten — anders clamt de browser value naar de oude min (bijv. 2.4)
    if (type === "dakkapel") {
      if (widthInput) {
        widthInput.min = "1.5";
        widthInput.max = "8";
      }
      if (depthInput) {
        depthInput.min = "1";
        depthInput.max = "2.5";
        depthInput.step = "0.25";
      }
      if (heightInput) {
        heightInput.min = "1";
        heightInput.max = "2.5";
        heightInput.step = "0.1";
      }
    } else {
      if (widthInput) {
        widthInput.min = "2";
        widthInput.max = "12";
      }
      if (depthInput) {
        depthInput.min = "2";
        depthInput.max = type === "dakterras" ? "12" : "10";
        depthInput.step = "0.5";
      }
      if (heightInput) {
        heightInput.min = "2.4";
        heightInput.max = "3.4";
        heightInput.step = "0.1";
      }
    }
    if (widthInput) widthInput.value = String(d.width);
    if (depthInput) depthInput.value = String(d.depth);
    if (heightInput) heightInput.value = String(d.height);
  }

  function updateDimsUI() {
    if (els.widthOut) els.widthOut.textContent = `${state.width} m`;
    if (els.depthOut) els.depthOut.textContent = `${state.depth} m`;
    if (els.heightOut) els.heightOut.textContent = `${state.height} m`;
    if (els.areaOut) {
      els.areaOut.textContent = `${m2()} m²`;
    }
    updateViz();
    updateLiveSummary();
    updatePrice();
  }

  function updateLiveSummary() {
    const text = buildSummaryParts().join(" · ");
    if (els.liveSummary) els.liveSummary.textContent = text;
    if (els.vizLabel) {
      if (!state.type) {
        els.vizLabel.textContent = "Kies een type om te starten";
      } else if (usesHeight(state.type)) {
        const heightBit =
          state.type === "dakkapel"
            ? `${state.height} m hoog (kapel)`
            : `${state.height} m hoog`;
        els.vizLabel.textContent = `${labels.type[state.type]} · ${m2()} m² · ${heightBit}`;
      } else {
        els.vizLabel.textContent = `${labels.type[state.type]} · ${m2()} m² · ${state.width} × ${state.depth} m`;
      }
    }
  }

  function flashLivePrice() {
    els.livePrices.forEach((el) => el.classList.add("is-flash"));
    if (priceFlashTimer) clearTimeout(priceFlashTimer);
    priceFlashTimer = setTimeout(() => {
      els.livePrices.forEach((el) => el.classList.remove("is-flash"));
    }, 160);
  }

  function showVizScene(name) {
    els.vizScenes.forEach((scene) => {
      const match = scene.dataset.vizScene === name;
      if (match) {
        scene.removeAttribute("display");
        scene.removeAttribute("hidden");
      } else {
        scene.setAttribute("display", "none");
        scene.setAttribute("hidden", "");
      }
    });
  }

  function updateViz() {
    const type = state.type;
    if (!type) {
      showVizScene("idle");
      return;
    }
    showVizScene(type);

    const hNorm = (state.height - 2.4) / (3.4 - 2.4);
    const areaNorm = Math.min(state.width * state.depth, 60) / 60;

    if (type === "aanbouw") {
      const ext = document.querySelector('[data-viz-ext="aanbouw"]');
      const seam = document.querySelector("[data-viz-seam]");
      if (!ext) return;
      const seamX = 208;
      const floorY = 210;
      const baseW = 140;
      const baseH = 82;
      const depthFactor = Math.min(Math.max(state.depth / 6, 0.55), 1.45);
      const widthBoost = 0.92 + Math.min(state.width, 12) / 30;
      const extW = Math.min(200, Math.max(95, baseW * depthFactor * widthBoost));
      const hFactor = 0.88 + hNorm * 0.35;
      const extH = Math.min(120, baseH * hFactor * (0.95 + areaNorm * 0.12));
      const y = floorY - extH;
      ext.setAttribute(
        "transform",
        `translate(${seamX}, ${y}) scale(${extW / baseW}, ${extH / baseH})`
      );
      if (seam) {
        seam.setAttribute("y1", String(Math.max(y - 4, 40)));
        seam.setAttribute("y2", String(floorY));
      }
      return;
    }

    if (type === "nok") {
      const ext = document.querySelector('[data-viz-ext="nok"]');
      const newRoof = document.querySelector("[data-viz-new-roof]");
      const newEdge = document.querySelector("[data-viz-new-roof-edge]");
      const oldRoof = document.querySelector("[data-viz-old-roof]");
      if (!ext || !newRoof) return;
      const midX = 220;
      const left = 70 - Math.min(state.width, 12) * 1.2;
      const right = 370 + Math.min(state.width, 12) * 1.2;
      const eavesY = 130;
      const oldPeak = 58 - areaNorm * 4;
      const newPeak = 48 - hNorm * 28 - areaNorm * 6;
      const peakY = Math.max(12, newPeak);
      newRoof.setAttribute(
        "d",
        `M${left} ${eavesY} L${midX} ${peakY} L${right} ${eavesY} Z`
      );
      if (newEdge) {
        newEdge.setAttribute(
          "d",
          `M${left} ${eavesY} L${midX} ${peakY} L${right} ${eavesY}`
        );
      }
      if (oldRoof) {
        oldRoof.setAttribute(
          "d",
          `M${left} ${eavesY} L${midX} ${oldPeak} L${right} ${eavesY}`
        );
      }
      const win = ext.querySelector("rect");
      if (win) {
        const winH = 22 + hNorm * 12;
        const winY = peakY + 18 + (1 - hNorm) * 8;
        win.setAttribute("x", String(midX - 22));
        win.setAttribute("y", String(winY));
        win.setAttribute("width", "44");
        win.setAttribute("height", String(winH));
      }
      return;
    }

    if (type === "dakopbouw") {
      const ext = document.querySelector('[data-viz-ext="dakopbouw"]');
      if (!ext) return;
      const baseW = 224;
      const baseH = 70;
      const roofTop = 118;
      const wFactor = 0.85 + Math.min(state.width, 12) / 20;
      const dFactor = 0.9 + Math.min(state.depth, 10) / 25;
      const extW = Math.min(280, baseW * wFactor * dFactor);
      const extH = Math.min(110, 52 + hNorm * 48 + areaNorm * 10);
      const x = 220 - extW / 2;
      const y = roofTop - extH;
      const sx = extW / baseW;
      const sy = extH / baseH;
      ext.setAttribute("transform", `translate(${x}, ${y}) scale(${sx}, ${sy})`);
      return;
    }

    if (type === "dakterras") {
      const deck = document.querySelector("[data-viz-deck]");
      const rail = document.querySelector("[data-viz-rail]");
      if (!deck) return;
      const roofY = 118;
      const wFactor = 0.7 + Math.min(state.width, 12) / 18;
      const dFactor = 0.75 + Math.min(state.depth, 12) / 20;
      const deckW = Math.min(260, 160 * wFactor * dFactor);
      const deckH = Math.min(28, 14 + areaNorm * 10);
      const x = 220 - deckW / 2;
      const y = roofY - deckH - 4;
      deck.setAttribute("x", String(x));
      deck.setAttribute("y", String(y));
      deck.setAttribute("width", String(deckW));
      deck.setAttribute("height", String(deckH));
      if (rail) {
        rail.setAttribute("d", `M${x} ${y} H${x + deckW} V${y - 22} H${x} Z`);
      }
      return;
    }

    if (type === "dakkapel") {
      const ext = document.querySelector('[data-viz-ext="dakkapel"]');
      if (!ext) return;
      const baseW = 110;
      const wFactor = 0.7 + Math.min(state.width, 8) / 10;
      const dFactor = 0.85 + Math.min(state.depth, 2.5) / 8;
      const hFactor = 0.75 + Math.min(Math.max(state.height, 1), 2.5) / 5;
      const extW = Math.min(200, baseW * wFactor);
      const extH = Math.min(78, 36 + dFactor * 12 + hFactor * 22);
      const x = 220 - extW / 2;
      const y = 88 - extH * 0.15;
      ext.setAttribute(
        "transform",
        `translate(${x}, ${y}) scale(${extW / baseW}, ${extH / 55})`
      );
      return;
    }

    if (type === "bijhuisje") {
      const ext = document.querySelector('[data-viz-ext="bijhuisje"]');
      if (!ext) return;
      const baseW = 130;
      const baseH = 88;
      const wFactor = 0.8 + Math.min(state.width, 12) / 18;
      const dFactor = 0.85 + Math.min(state.depth, 10) / 22;
      const extW = Math.min(200, baseW * wFactor * dFactor);
      const extH = Math.min(115, 72 + hNorm * 28 + areaNorm * 8);
      const x = 268;
      const y = 210 - extH;
      ext.setAttribute(
        "transform",
        `translate(${x}, ${y}) scale(${extW / baseW}, ${extH / baseH})`
      );
    }
  }

  function updatePrice() {
    const show = Boolean(state.type);
    const rangeText = show
      ? (() => {
          const { low, high } = estimate();
          return `${formatEuro(low)} – ${formatEuro(high)}`;
        })()
      : "€ –";

    els.livePriceBoxes.forEach((box) => {
      box.hidden = !show;
    });

    const prev = els.livePrices[0] ? els.livePrices[0].textContent : "";
    els.livePrices.forEach((el) => {
      el.textContent = rangeText;
    });
    if (show && prev && prev !== rangeText) flashLivePrice();

    if (els.price) els.price.textContent = rangeText;
    if (els.priceNote) {
      const { m2: area } = estimate();
      els.priceNote.textContent = show
        ? `Indicatie · verandert mee met je keuzes · ca. ${area} m² ${labels.type[state.type]}. Geen definitieve offerte.`
        : "Indicatie · verandert mee met je keuzes. Geen definitieve offerte.";
    }
    if (els.summary) els.summary.textContent = buildSummaryParts().join(" · ");
  }

  function renderProgress(active) {
    if (!els.progress) return;
    els.progress.innerHTML = "";
    for (let i = 1; i <= totalSteps; i++) {
      const span = document.createElement("span");
      if (i < active) span.classList.add("is-done");
      if (i === active) span.classList.add("is-active");
      els.progress.appendChild(span);
    }
  }

  function setStep(n) {
    state.step = n;
    els.steps.forEach((step) => {
      step.classList.toggle("is-active", Number(step.dataset.step) === n);
    });
    renderProgress(n);
    syncFlowPanels();
    updateLiveSummary();
    updatePrice();
  }

  function requireChoice(value, message) {
    if (!value) {
      alert(message);
      return false;
    }
    return true;
  }

  function validateStepOptions(step) {
    const type = state.type;
    const flow = flowFor(type);

    if (step === 3) {
      if (flow === "casco") return requireChoice(state.gevel, "Kies een gevelmateriaal.");
      if (flow === "dakterras") return requireChoice(state.toegang, "Kies hoe je het dakterras bereikt.");
      if (flow === "dakkapel") return requireChoice(state.dakvorm, "Kies een dakvorm.");
    }
    if (step === 4) {
      if (flow === "casco") return requireChoice(state.kozijn, "Kies een type kozijn.");
      if (flow === "dakterras") return requireChoice(state.hekwerk, "Kies een soort hekwerk.");
      if (flow === "dakkapel") return requireChoice(state.dakkapelMateriaal, "Kies een materiaal/afwerking.");
    }
    if (step === 5) {
      if (flow === "casco") {
        if (!requireChoice(state.isolatie, "Kies een isolatieniveau.")) return false;
        if (HEIPALEN_TYPES.has(type) && !requireChoice(state.heipalen, "Geef aan of er heipalen nodig zijn (of weet je het nog niet).")) {
          return false;
        }
        return true;
      }
      if (flow === "dakterras") return requireChoice(state.dek, "Kies een dek-/vloerafwerking.");
      if (flow === "dakkapel") return requireChoice(state.kozijn, "Kies een type kozijn.");
    }
    return true;
  }

  // Choice buttons — prijs update meteen bij click
  document.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.choice;
      const value = btn.dataset.value;
      state[group] = value;

      document
        .querySelectorAll(`[data-choice="${group}"]`)
        .forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");

      if (group === "type") {
        applyTypeDefaults(value);
        syncFlowPanels();
        updateDimsUI();
      } else {
        updateLiveSummary();
        updatePrice();
      }
    });
  });

  const widthInput = document.querySelector("#calc-width");
  const depthInput = document.querySelector("#calc-depth");
  const heightInput = document.querySelector("#calc-height");

  if (widthInput) {
    widthInput.addEventListener("input", () => {
      state.width = Number(widthInput.value);
      updateDimsUI();
    });
  }
  if (depthInput) {
    depthInput.addEventListener("input", () => {
      state.depth = Number(depthInput.value);
      updateDimsUI();
    });
  }
  if (heightInput) {
    heightInput.addEventListener("input", () => {
      state.height = Number(heightInput.value);
      updateDimsUI();
    });
  }

  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = Number(btn.dataset.next);
      if (state.step === 1 && !requireChoice(state.type, "Kies eerst een type project.")) return;
      if (state.step === 3 && !validateStepOptions(3)) return;
      if (state.step === 4 && !validateStepOptions(4)) return;
      if (state.step === 5 && !validateStepOptions(5)) return;
      setStep(next);
    });
  });

  document.querySelectorAll("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => setStep(Number(btn.dataset.prev)));
  });

  const emailCfg = window.AANBOUW_EMAIL || {};
  const LEAD_EMAIL = emailCfg.leadEmail || "info@maatkozijndirect.nl";
  const PHONE_DISPLAY = emailCfg.phoneDisplay || "023 205 2483";
  const CustomerMail = window.AanbouwCustomerMail;

  function buildCustomerMessages({ naam, low, high }) {
    const summaryLines = buildSummaryParts();
    const lowLabel = formatEuro(low);
    const highLabel = formatEuro(high);
    if (CustomerMail) {
      return {
        summaryLines,
        plain: CustomerMail.buildPlain({ naam, summaryLines, lowLabel, highLabel }),
        html: CustomerMail.buildHtml({ naam, summaryLines, lowLabel, highLabel }),
        lowLabel,
        highLabel,
      };
    }
    const plain = [
      `Hoi ${(naam || "").trim().split(/\s+/)[0] || "daar"},`,
      ``,
      `Bedankt voor je aanvraag via Aanbouw-direct. We hebben je gegevens ontvangen en nemen zo snel mogelijk contact met je op.`,
      ``,
      `Jouw indicatie: ${lowLabel} – ${highLabel}`,
      ``,
      `Jouw keuzes`,
      summaryLines.map((line) => `· ${line}`).join("\n"),
      ``,
      `Dit is een goede richting op basis van wat je hebt ingevuld. De definitieve prijs leggen we samen vast op locatie — na een afspraak.`,
      ``,
      `Liever zelf bellen of WhatsAppen? ${PHONE_DISPLAY}.`,
      ``,
      `Groet,`,
      `Aanbouw-direct`,
      PHONE_DISPLAY,
    ].join("\n");
    return { summaryLines, plain, html: "", lowLabel, highLabel };
  }

  function buildLeadMailto({ data, summary, low, high, area }) {
    const prijs = `${formatEuro(low)} – ${formatEuro(high)}`;
    const subject = `Calculator-aanvraag Aanbouw-direct — ${data.naam || "nieuwe lead"}`;
    const body = [
      `Nieuwe calculator-aanvraag (via mailto-fallback)`,
      ``,
      `Naam: ${data.naam || "-"}`,
      `Telefoon: ${data.telefoon || "-"}`,
      `E-mail: ${data.email || "-"}`,
      `Postcode / plaats: ${data.postcode || "-"}`,
      `Toelichting: ${data.toelichting || "-"}`,
      ``,
      `Project: ${summary}`,
      `Oppervlakte: ${area} m²`,
      `Prijsindicatie: ${prijs}`,
      ``,
      `— Verstuurd omdat het online formulier (FormSubmit) niet werkte.`,
    ].join("\n");
    return `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function buildSelfMailto({ email, low, high, naam }) {
    const { plain } = buildCustomerMessages({ naam: naam || "daar", low, high });
    const to = email ? encodeURIComponent(email) : "";
    return `mailto:${to}?subject=${encodeURIComponent("Je prijsindicatie van Aanbouw-direct")}&body=${encodeURIComponent(plain)}`;
  }

  async function sendCustomerMail({ email, naam, low, high }) {
    const messages = buildCustomerMessages({ naam, low, high });
    if (!CustomerMail || !CustomerMail.isCustomerEmailjsReady()) {
      return { ok: false, skipped: true, plain: messages.plain, via: "pending-emailjs" };
    }
    const result = await CustomerMail.sendViaEmailjs({
      toEmail: email,
      naam,
      htmlBody: messages.html,
      plainBody: messages.plain,
      lowLabel: messages.lowLabel,
      highLabel: messages.highLabel,
    });
    return { ...result, plain: messages.plain };
  }

  /** FormSubmit lead — altijd _url meesturen (anders: success:false “open via web server”). */
  async function sendLeadViaFormSubmit({ data, summary, area, prijs, autoresponse, useCc }) {
    const pageUrl =
      (typeof window !== "undefined" && window.location && window.location.href) ||
      emailCfg.siteUrl ||
      "https://aanbouw.direct/";

    const formPayload = {
      naam: data.naam,
      email: data.email,
      telefoon: data.telefoon,
      postcode: data.postcode,
      toelichting: data.toelichting || "-",
      project: summary,
      project_type: state.type || "-",
      oppervlakte_m2: `${area} m²`,
      jouw_indicatie: prijs,
      toegang: state.toegang || "-",
      hekwerk: state.hekwerk || "-",
      dek: state.dek || "-",
      dakvorm: state.dakvorm || "-",
      dakkapel_materiaal: state.dakkapelMateriaal || "-",
      gevel: state.gevel || "-",
      kozijn: state.kozijn || "-",
      isolatie: state.isolatie || "-",
      heipalen: state.heipalen || "-",
      let_op:
        "Dit is een goede richting op basis van je keuzes. De definitieve prijs leggen we samen vast op locatie (na afspraak).",
      prijsindicatie: prijs,
      _subject: `Aanbouw-direct: aanvraag + prijsindicatie — ${data.naam}`,
      _template: "table",
      _captcha: "false",
      _replyto: data.email,
      _url: pageUrl,
    };

    if (useCc && autoresponse) {
      formPayload._autoresponse = autoresponse;
      formPayload._cc = data.email;
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formPayload),
      });
      const payload = await res.json().catch(() => ({}));
      const ok =
        res.ok &&
        payload.success !== false &&
        payload.success !== "false";
      if (!ok) {
        const msg = String(payload.message || "");
        return {
          ok: false,
          via: "formsubmit",
          activation: /activat/i.test(msg),
          message: msg || `FormSubmit ${res.status}`,
          payload,
        };
      }
      return { ok: true, via: "formsubmit", payload };
    } catch (err) {
      return {
        ok: false,
        via: "formsubmit",
        message: err && err.message ? err.message : "network error",
        error: err,
      };
    }
  }

  async function sendLead({ data, summary, area, prijs, autoresponse, customerEmailjsReady }) {
    if (CustomerMail && CustomerMail.isLeadEmailjsReady()) {
      const ej = await CustomerMail.sendLeadViaEmailjs({ data, summary, area, prijs });
      if (ej.ok) return ej;
      console.warn("EmailJS lead mislukt, probeer FormSubmit…", ej);
    }
    return sendLeadViaFormSubmit({
      data,
      summary,
      area,
      prijs,
      autoresponse,
      useCc: !customerEmailjsReady,
    });
  }

  function showLeadStatus(msg, type) {
    const el = document.querySelector("[data-lead-status]");
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.className = `lead-form-status is-${type || "error"}`;
    el.setAttribute("role", type === "success" ? "status" : "alert");
  }

  function hideLeadStatus() {
    const el = document.querySelector("[data-lead-status]");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function fillThankYou({ note, low, high, summary, mailtoLeadHref, viaFallback, email, naam }) {
    const thankNote = document.querySelector("[data-thank-note]");
    const thankPrice = document.querySelector("[data-thank-price]");
    const thankSummary = document.querySelector("[data-thank-summary]");
    const thankBox = document.querySelector("[data-thank-price-box]");
    const mailtoSelf = document.querySelector("[data-mailto-indicatie]");
    const mailtoLead = document.querySelector("[data-mailto-lead]");
    const thankTitle = document.querySelector('[data-step="7"] h3');
    const prijs = `${formatEuro(low)} – ${formatEuro(high)}`;

    if (thankTitle) {
      thankTitle.textContent = viaFallback ? "Verstuur je aanvraag via e-mail" : "Aanvraag ontvangen";
    }
    if (thankNote) thankNote.textContent = note;
    if (thankPrice) thankPrice.textContent = prijs;
    if (thankSummary) thankSummary.textContent = summary;
    if (thankBox) thankBox.hidden = false;

    if (mailtoSelf) {
      mailtoSelf.href = buildSelfMailto({ email, low, high, naam });
    }
    if (mailtoLead) {
      if (mailtoLeadHref) {
        mailtoLead.hidden = false;
        mailtoLead.href = mailtoLeadHref;
      } else {
        mailtoLead.hidden = true;
        mailtoLead.removeAttribute("href");
      }
    }

    const fallbackBlock = document.querySelector("[data-thank-fallback]");
    if (fallbackBlock) fallbackBlock.hidden = !viaFallback;
  }

  function validateLeadForm(form) {
    const required = [
      { name: "naam", label: "naam" },
      { name: "telefoon", label: "telefoonnummer" },
      { name: "email", label: "e-mailadres" },
      { name: "postcode", label: "postcode / plaats" },
    ];
    const missing = [];
    for (const field of required) {
      const el = form.elements.namedItem(field.name);
      const value = el && "value" in el ? String(el.value).trim() : "";
      if (!value) {
        missing.push(field.label);
        continue;
      }
      if (field.name === "email" && el && typeof el.checkValidity === "function" && !el.checkValidity()) {
        missing.push("geldig e-mailadres");
      }
    }
    if (missing.length) {
      showLeadStatus(
        `Vul eerst deze verplichte velden in: ${missing.join(", ")}. Toelichting mag leeg blijven.`,
        "error"
      );
      const firstEmpty = required.find((f) => {
        const el = form.elements.namedItem(f.name);
        const value = el && "value" in el ? String(el.value).trim() : "";
        return !value || (f.name === "email" && el && typeof el.checkValidity === "function" && !el.checkValidity());
      });
      const focusEl = firstEmpty && form.elements.namedItem(firstEmpty.name);
      if (focusEl && typeof focusEl.focus === "function") focusEl.focus();
      return false;
    }
    return true;
  }

  function syncHiddenLeadFields(summary, area, prijs) {
    if (!els.form) return;
    const set = (name, value) => {
      const field = els.form.elements.namedItem(name);
      if (field && "value" in field) field.value = value;
    };
    set("project", summary);
    set("oppervlakte_m2", `${area} m²`);
    set("prijsindicatie", prijs);
    set("project_type", state.type || "");
    set("toegang", state.toegang || "");
    set("hekwerk", state.hekwerk || "");
    set("dek", state.dek || "");
    set("dakvorm", state.dakvorm || "");
    set("dakkapel_materiaal", state.dakkapelMateriaal || "");
    set("gevel", state.gevel || "");
    set("kozijn", state.kozijn || "");
    set("isolatie", state.isolatie || "");
    set("heipalen", state.heipalen || "");
  }

  if (els.form) {
    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideLeadStatus();

      if (!els.form.checkValidity()) {
        els.form.reportValidity();
        return;
      }
      if (!validateLeadForm(els.form)) return;

      const submitBtn = els.form.querySelector('[type="submit"]');
      const data = Object.fromEntries(new FormData(els.form).entries());
      const { low, high, m2: area } = estimate();
      const summary = buildSummaryParts().join(" · ");
      const prijs = `${formatEuro(low)} – ${formatEuro(high)}`;
      const mailtoHref = buildLeadMailto({ data, summary, low, high, area });
      const messages = buildCustomerMessages({ naam: data.naam, low, high });
      const autoresponse = messages.plain;

      syncHiddenLeadFields(summary, area, prijs);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Versturen…";
      }

      try {
        const customerEmailjsReady =
          CustomerMail && CustomerMail.isCustomerEmailjsReady();

        const [leadResult, customerResult] = await Promise.all([
          sendLead({
            data,
            summary,
            area,
            prijs,
            autoresponse,
            customerEmailjsReady,
          }),
          sendCustomerMail({
            email: data.email,
            naam: data.naam,
            low,
            high,
          }),
        ]);

        if (!leadResult || !leadResult.ok) {
          const err = new Error(
            (leadResult && leadResult.activation && "FORMSUBMIT_ACTIVATION") ||
              (leadResult && leadResult.message) ||
              "LEAD_SEND_FAILED"
          );
          err.leadResult = leadResult;
          throw err;
        }

        const gotBrandedMail = customerResult && customerResult.ok;
        const mailHint = gotBrandedMail
          ? `Check je mail op ${data.email} voor je prijsindicatie (${prijs}).`
          : customerEmailjsReady
            ? `We konden je bevestigingsmail niet automatisch sturen. Gebruik “Mail mezelf de indicatie” — je prijs (${prijs}) staat ook hieronder.`
            : `Je prijsindicatie (${prijs}) staat hieronder. Check je mail op ${data.email} (bevestiging) of gebruik “Mail mezelf de indicatie”.`;

        fillThankYou({
          note: `We hebben je aanvraag ontvangen. ${mailHint} Wij nemen zo snel mogelijk contact op — bel ${PHONE_DISPLAY}, WhatsApp, of mail ons.`,
          low,
          high,
          summary,
          mailtoLeadHref: null,
          viaFallback: false,
          email: data.email,
          naam: data.naam,
        });
        setStep(7);
      } catch (err) {
        console.error(err);
        const isActivation =
          err &&
          (err.message === "FORMSUBMIT_ACTIVATION" ||
            (err.leadResult && err.leadResult.activation));
        const statusMsg = isActivation
          ? `Online versturen lukt nog niet (FormSubmit-activatie). Je aanvraag gaat niet verloren: stuur hem via e-mail — project en prijs staan al ingevuld. Of bel / WhatsApp / Mail.`
          : `Versturen via het formulier lukte niet. Stuur je aanvraag via e-mail (project + prijs staan klaar), of bel / WhatsApp / Mail ${PHONE_DISPLAY}.`;

        fillThankYou({
          note: statusMsg,
          low,
          high,
          summary,
          mailtoLeadHref: mailtoHref,
          viaFallback: true,
          email: data.email,
          naam: data.naam,
        });
        setStep(7);
        /* Geen auto-mailto: knop is genoeg; voorkomt verwarrende mail-client popup. */
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Verstuur aanvraag";
        }
      }
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  updateDimsUI();
  setStep(1);

  /* Mobile nav */
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const panel = document.getElementById("site-menu");
  if (nav && toggle && panel) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 1100px)").matches) setOpen(false);
    });
  }

  /* Hero video: muted autoplay (desktop + mobiel); bij fail → stil poster, geen play-CTA */
  const heroVideo = document.getElementById("hero-video");
  if (heroVideo) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const isNarrow = window.matchMedia("(max-width: 699px)").matches;
    const desktopSrc = heroVideo.dataset.src;
    const mobileSrc = heroVideo.dataset.srcMobile || desktopSrc;
    const preferredSrc = isNarrow ? mobileSrc : desktopSrc;
    let loaded = false;
    let wantsPlay = false;

    const markReady = () => heroVideo.classList.add("is-ready");

    const tryPlay = () => {
      const p = heroVideo.play();
      if (p && typeof p.then === "function") {
        p.then(markReady).catch(() => {
          /* Autoplay geblokkeerd (OS): poster blijft zichtbaar, geen film-CTA */
        });
      } else {
        markReady();
      }
    };

    const loadAndPlay = (src) => {
      if (!src) return;
      wantsPlay = true;
      if (!loaded) {
        loaded = true;
        heroVideo.src = src;
        heroVideo.setAttribute("playsinline", "");
        heroVideo.setAttribute("webkit-playsinline", "");
        heroVideo.setAttribute("autoplay", "");
        heroVideo.muted = true;
        heroVideo.defaultMuted = true;
        heroVideo.playsInline = true;
        heroVideo.autoplay = true;
        heroVideo.addEventListener(
          "loadeddata",
          () => {
            if (wantsPlay) tryPlay();
          },
          { once: true }
        );
        heroVideo.load();
      } else {
        tryPlay();
      }
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!loaded) return;
            if (entry.isIntersecting) {
              if (wantsPlay) tryPlay();
            } else {
              heroVideo.pause();
            }
          });
        },
        { threshold: 0.15 }
      );
      io.observe(heroVideo);
    }

    if (reduceMotion || saveData || !preferredSrc) {
      return;
    }

    fetch(preferredSrc, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) return;
        loadAndPlay(preferredSrc);
      })
      .catch(() => {
        /* Netwerk/HEAD faalt: poster blijft staan */
      });
  }
})();
