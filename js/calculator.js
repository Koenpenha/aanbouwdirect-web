(() => {
  const state = {
    step: 1,
    type: null,
    width: 4,
    depth: 3,
    height: 2.8,
    gevel: null,
    kozijn: null,
    isolatie: null,
    heipalen: null,
  };

  // Interne basis €/m² (niet tonen in UI) — aanbouw ~€2800
  const rates = {
    aanbouw: 2800,
    nok: 2200,
    dakopbouw: 3000,
  };

  // Relatieve opslagen t.o.v. baseline per categorie (zichtbaar in live range)
  const multipliers = {
    gevel: {
      stuc: 0.92, // goedkoper: sneller / eenvoudiger afwerking
      steen: 1.0, // baseline
      hout: 1.08, // duurder: materiaal + detaillering
      match: 1.1, // maatwerk aansluiting bestaande gevel
    },
    kozijn: {
      kunststof: 1.0, // scherpst geprijsd
      aluminium: 1.1,
      hout: 1.12,
      houtalu: 1.18, // premium combinatie
    },
    isolatie: {
      standaard: 1.0,
      onbekend: 1.04, // middenbuffer tot advies op locatie
      extra: 1.1, // dikkere opbouw / betere Rc
    },
    heipalen: {
      nee: 1.0,
      onbekend: 1.08,
      ja: 1.15, // fundering met heipalen duidelijk duurder
    },
  };

  const labels = {
    type: { aanbouw: "Aanbouw", nok: "Nokverhoging", dakopbouw: "Dakopbouw" },
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
  };

  let priceFlashTimer = null;

  function m2() {
    return Math.round(state.width * state.depth * 10) / 10;
  }

  function estimate() {
    const type = state.type || "aanbouw";
    let mid = rates[type] * m2();

    // Hoogte: boven 2.6 iets duurder
    if (state.height >= 3.0) mid *= 1.06;
    else if (state.height >= 2.8) mid *= 1.03;

    if (state.gevel) mid *= multipliers.gevel[state.gevel] || 1;
    if (state.kozijn) mid *= multipliers.kozijn[state.kozijn] || 1;
    if (state.isolatie) mid *= multipliers.isolatie[state.isolatie] || 1;

    // Heipalen vooral relevant bij aanbouw
    if (type === "aanbouw" && state.heipalen) {
      mid *= multipliers.heipalen[state.heipalen] || 1;
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
    parts.push(`hoogte ${state.height} m`);
    if (state.gevel) parts.push(labels.gevel[state.gevel]);
    if (state.kozijn) parts.push(labels.kozijn[state.kozijn]);
    if (state.isolatie) parts.push(labels.isolatie[state.isolatie]);
    if (state.type === "aanbouw" && state.heipalen) {
      parts.push(labels.heipalen[state.heipalen]);
    }
    return parts;
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
    if (els.vizLabel) els.vizLabel.textContent = state.type
      ? `${labels.type[state.type]} · ${m2()} m² · ${state.height} m hoog`
      : "Kies een type om te starten";
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

    const hNorm = (state.height - 2.4) / (3.4 - 2.4); // 0..1
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
      // Footprint breedte schaalt licht met breedte; nokhoogte met hoogte-slider
      const midX = 220;
      const left = 70 - Math.min(state.width, 12) * 1.2;
      const right = 370 + Math.min(state.width, 12) * 1.2;
      const eavesY = 130;
      const oldPeak = 58 - areaNorm * 4;
      const newPeak = 48 - hNorm * 28 - areaNorm * 6; // hoger = lagere Y
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
      // Kozijn in oranje dak meeschalen
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
      const roofTop = 118; // plat dak van bestaande woning
      const wFactor = 0.85 + Math.min(state.width, 12) / 20;
      const dFactor = 0.9 + Math.min(state.depth, 10) / 25;
      const extW = Math.min(280, baseW * wFactor * dFactor);
      const extH = Math.min(110, 52 + hNorm * 48 + areaNorm * 10);
      const x = 220 - extW / 2;
      const y = roofTop - extH;
      const sx = extW / baseW;
      const sy = extH / baseH;
      ext.setAttribute("transform", `translate(${x}, ${y}) scale(${sx}, ${sy})`);
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

    // Stap 6 / lead: zelfde range als live UI
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
    updateLiveSummary();
    updatePrice();

    // Heipalen-vraag alleen bij aanbouw tonen in stap 5 copy
    const pileBlock = document.querySelector("[data-heipalen-block]");
    if (pileBlock) {
      pileBlock.hidden = state.type !== "aanbouw";
    }
  }

  function requireChoice(value, message) {
    if (!value) {
      alert(message);
      return false;
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
      updateLiveSummary();
      if (group === "type") {
        updateViz();
        const pileBlock = document.querySelector("[data-heipalen-block]");
        if (pileBlock) pileBlock.hidden = value !== "aanbouw";
      }
      updatePrice();
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
      if (state.step === 3 && !requireChoice(state.gevel, "Kies een gevelmateriaal.")) return;
      if (state.step === 4 && !requireChoice(state.kozijn, "Kies een type kozijn.")) return;
      if (state.step === 5) {
        if (!requireChoice(state.isolatie, "Kies een isolatieniveau.")) return;
        if (state.type === "aanbouw" && !requireChoice(state.heipalen, "Geef aan of er heipalen nodig zijn (of weet je het nog niet).")) {
          return;
        }
      }
      setStep(next);
    });
  });

  document.querySelectorAll("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => setStep(Number(btn.dataset.prev)));
  });

  const LEAD_EMAIL = "info@maatkozijndirect.nl";
  const PHONE_DISPLAY = "023 205 2483";

  function buildCustomerEmail({ naam, low, high }) {
    const firstName = (naam || "").trim().split(/\s+/)[0] || "daar";
    const summary = buildSummaryParts().join(" · ");
    return [
      `Hoi ${firstName},`,
      ``,
      `Bedankt voor je aanvraag via Aanbouwdirect. Hieronder je projectsamenvatting en prijsindicatie.`,
      ``,
      `Jouw samenstelling`,
      summary,
      ``,
      `Prijsindicatie (casco)`,
      `${formatEuro(low)} – ${formatEuro(high)}`,
      ``,
      `Wat is casco?`,
      `Wel: wind- & waterdicht, geïsoleerd, met kozijnen, hijskraan waar nodig, stroom tot casco-niveau.`,
      `Niet: interieurafbouw (stucwerk binnen, vloeren, keuken, schilderwerk binnen).`,
      ``,
      `Dit is een indicatie op basis van jouw keuzes — geen definitieve offerte. Die maken we na een afspraak op locatie.`,
      ``,
      `Volgende stap`,
      `We bellen of mailen je zo snel mogelijk om een afspraak in te plannen.`,
      `Liever zelf bellen of WhatsAppen? ${PHONE_DISPLAY}.`,
      ``,
      `Groet,`,
      `Aanbouwdirect`,
      PHONE_DISPLAY,
      `Oosteindeweg 21, 1432 AC Aalsmeer`,
    ].join("\n");
  }

  function buildLeadMailto({ data, summary, low, high, area }) {
    const prijs = `${formatEuro(low)} – ${formatEuro(high)}`;
    const subject = `Calculator-aanvraag Aanbouwdirect — ${data.naam || "nieuwe lead"}`;
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
      `Prijsindicatie (casco): ${prijs}`,
      ``,
      `— Verstuurd omdat het online formulier (FormSubmit) niet werkte.`,
    ].join("\n");
    return `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function buildSelfMailto({ email, low, high, naam }) {
    const autoresponse = buildCustomerEmail({ naam: naam || "daar", low, high });
    const to = email ? encodeURIComponent(email) : "";
    return `mailto:${to}?subject=${encodeURIComponent("Jouw prijsindicatie Aanbouwdirect")}&body=${encodeURIComponent(autoresponse)}`;
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
      const autoresponse = buildCustomerEmail({
        naam: data.naam,
        low,
        high,
      });

      // Hidden fields (legacy Netlify / debugging)
      const projectField = els.form.elements.namedItem("project");
      const areaField = els.form.elements.namedItem("oppervlakte_m2");
      const prijsField = els.form.elements.namedItem("prijsindicatie");
      if (projectField && "value" in projectField) projectField.value = summary;
      if (areaField && "value" in areaField) areaField.value = `${area} m²`;
      if (prijsField && "value" in prijsField) prijsField.value = prijs;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Versturen…";
      }

      try {
        const res = await fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            naam: data.naam,
            email: data.email,
            telefoon: data.telefoon,
            postcode: data.postcode,
            toelichting: data.toelichting || "-",
            project: summary,
            oppervlakte_m2: `${area} m²`,
            prijsindicatie: prijs,
            _subject: `Nieuwe calculator-aanvraag — ${data.naam}`,
            _template: "table",
            _captcha: "false",
            _autoresponse: autoresponse,
            _replyto: data.email,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        const ok =
          res.ok &&
          payload.success !== false &&
          payload.success !== "false";

        if (!ok) {
          const msg = String(payload.message || "");
          if (/activat/i.test(msg)) {
            throw new Error("FORMSUBMIT_ACTIVATION");
          }
          throw new Error(msg || `Form submit failed (${res.status})`);
        }

        fillThankYou({
          note: `We hebben je aanvraag ontvangen. Check je mail op ${data.email} voor je prijsindicatie (${prijs}). Wij nemen zo snel mogelijk contact op — bel ${PHONE_DISPLAY}, WhatsApp, of mail ons.`,
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
        const isActivation = err && err.message === "FORMSUBMIT_ACTIVATION";
        const statusMsg = isActivation
          ? `Online versturen lukt nog niet. Je aanvraag gaat niet verloren: stuur hem nu via e-mail — project en prijs staan al ingevuld. Of bel / WhatsApp / Mail. Daarna: check je inbox; we nemen contact op.`
          : `Versturen via het formulier lukte niet. Stuur je aanvraag nu via e-mail (project + prijs staan al klaar), of bel / WhatsApp / Mail ${PHONE_DISPLAY}.`;

        // Fallback: bedankt-stap toont mail/Bel/WhatsApp; mailto opent direct
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

        // Open mailto direct — lead komt in mailclient terecht
        window.location.href = mailtoHref;
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

  /* Hero video: poster first; load lite mp4 only on desktop without save-data */
  const heroVideo = document.getElementById("hero-video");
  if (heroVideo) {
    const src = heroVideo.dataset.src;
    const canAutoplay =
      src &&
      window.matchMedia("(min-width: 700px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !(navigator.connection && navigator.connection.saveData);

    if (canAutoplay) {
      // Load video only if lite file is reachable (404 → keep poster)
      fetch(src, { method: "HEAD" })
        .then((r) => {
          if (!r.ok) return;
          heroVideo.src = src;
          heroVideo.autoplay = true;
          const play = () => {
            heroVideo.classList.add("is-ready");
            heroVideo.play().catch(() => {});
          };
          if (heroVideo.readyState >= 2) play();
          else heroVideo.addEventListener("loadeddata", play, { once: true });
        })
        .catch(() => {});
    }
  }
})();
