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

  // Basisindicatie per m² (aanbouw ~€2800)
  const rates = {
    aanbouw: 2800,
    nok: 2200,
    dakopbouw: 3000,
  };

  const multipliers = {
    gevel: {
      steen: 1.0,
      stuc: 0.95,
      hout: 1.05,
      match: 1.08,
    },
    kozijn: {
      kunststof: 1.0,
      aluminium: 1.08,
      hout: 1.1,
      houtalu: 1.14,
    },
    isolatie: {
      standaard: 1.0,
      extra: 1.07,
      onbekend: 1.03,
    },
    heipalen: {
      ja: 1.12,
      nee: 1.0,
      onbekend: 1.06,
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
    form: document.querySelector("#lead-form"),
    heipalenStep: document.querySelector('[data-step="5"]'),
  };

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
  }

  function updateLiveSummary() {
    const text = buildSummaryParts().join(" · ");
    if (els.liveSummary) els.liveSummary.textContent = text;
    if (els.vizLabel) els.vizLabel.textContent = state.type
      ? `${labels.type[state.type]} · ${m2()} m² · ${state.height} m hoog`
      : "Kies een type om te starten";
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
    const { low, high, m2: area } = estimate();
    if (els.price) els.price.textContent = `${formatEuro(low)} – ${formatEuro(high)}`;
    if (els.priceNote) {
      els.priceNote.textContent = `Indicatie voor ca. ${area} m² ${labels.type[state.type] || "project"}. Geen definitieve offerte.`;
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
    if (n === 6) updatePrice();

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

  // Choice buttons
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
      if (group === "type") updateViz();
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

  function buildCustomerEmail({ naam, low, high }) {
    const firstName = (naam || "").trim().split(/\s+/)[0] || "daar";
    const summary = buildSummaryParts().join(" · ");
    return [
      `Hoi ${firstName},`,
      ``,
      `Bedankt voor je aanvraag via Aanbouwdirect. Hier is je persoonlijke prijsindicatie op basis van wat je hebt samengesteld.`,
      ``,
      `Jouw samenstelling`,
      summary,
      ``,
      `Prijsindicatie`,
      `${formatEuro(low)} – ${formatEuro(high)}`,
      ``,
      `Belangrijk: dit is een indicatie op basis van jouw keuzes, geen definitieve offerte. Na een afspraak op locatie werken we alles scherp uit — zonder vage beloftes.`,
      ``,
      `Volgende stap`,
      `We nemen zo snel mogelijk contact met je op om een afspraak in te plannen. Liever zelf bellen? Dat kan op 06 38340050.`,
      ``,
      `Groet,`,
      `Aanbouwdirect`,
      `penhabouw@outlook.com · 06 38340050`,
      `Oosteindeweg 21, 1432 AC Aalsmeer`,
      `https://aanbouw-direct.nl/`,
    ].join("\n");
  }

  if (els.form) {
    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = els.form.querySelector('[type="submit"]');
      const data = Object.fromEntries(new FormData(els.form).entries());
      const { low, high, m2: area } = estimate();
      const summary = buildSummaryParts().join(" · ");
      const autoresponse = buildCustomerEmail({
        naam: data.naam,
        low,
        high,
      });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Versturen…";
      }

      try {
        const res = await fetch("https://formsubmit.co/ajax/penhabouw@outlook.com", {
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
            prijsindicatie: `${formatEuro(low)} – ${formatEuro(high)}`,
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

        const thankNote = document.querySelector("[data-thank-note]");
        if (thankNote) {
          thankNote.textContent = `We hebben je aanvraag ontvangen. Je krijgt zo een mail op ${data.email} met je prijsindicatie (${formatEuro(low)} – ${formatEuro(high)}).`;
        }
        setStep(7);
      } catch (err) {
        console.error(err);
        if (err && err.message === "FORMSUBMIT_ACTIVATION") {
          alert(
            "Het aanvraagformulier is nog niet geactiveerd. Open penhabouw@outlook.com, klik op de FormSubmit-activatielink, en probeer daarna opnieuw. Liever nu contact? Bel 06 38340050."
          );
        } else {
          alert(
            "Versturen lukte niet. Probeer het opnieuw, of bel ons op 06 38340050."
          );
        }
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
      if (window.matchMedia("(min-width: 880px)").matches) setOpen(false);
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
