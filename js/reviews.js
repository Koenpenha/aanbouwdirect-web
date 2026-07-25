(() => {
  const LEAD_EMAIL = "info@maatkozijndirect.nl";
  const AUTOPLAY_MS = 6500;

  /* ——— Carousel ——— */
  const root = document.querySelector("[data-reviews-carousel]");
  if (root) {
    const slides = Array.from(root.querySelectorAll("[data-review-slide]"));
    const dotsWrap = root.querySelector("[data-reviews-dots]");
    const prevBtn = root.querySelector("[data-reviews-prev]");
    const nextBtn = root.querySelector("[data-reviews-next]");
    const pauseBtn = root.querySelector("[data-reviews-pause]");
    const viewport = root.querySelector(".reviews-viewport");
    let index = 0;
    let paused = false;
    let timer = null;
    let touchX = null;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "reviews-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Review ${i + 1} van ${slides.length}`);
      dot.addEventListener("click", () => goTo(i, true));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function goTo(i, userAction) {
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, n) => {
        const on = n === index;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dots.forEach((dot, n) => {
        const on = n === index;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-selected", on ? "true" : "false");
      });
      if (userAction) restartTimer();
    }

    function next() {
      goTo(index + 1, false);
    }

    function startTimer() {
      stopTimer();
      if (paused || reduceMotion || slides.length < 2) return;
      timer = window.setInterval(next, AUTOPLAY_MS);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function restartTimer() {
      stopTimer();
      startTimer();
    }

    function setPaused(value) {
      paused = value;
      if (pauseBtn) {
        pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
        pauseBtn.textContent = paused ? "Speel" : "Pauze";
        pauseBtn.setAttribute(
          "aria-label",
          paused
            ? "Automatisch wisselen hervatten"
            : "Automatisch wisselen pauzeren"
        );
      }
      if (paused) stopTimer();
      else startTimer();
    }

    prevBtn?.addEventListener("click", () => goTo(index - 1, true));
    nextBtn?.addEventListener("click", () => goTo(index + 1, true));
    pauseBtn?.addEventListener("click", () => setPaused(!paused));

    viewport?.addEventListener(
      "touchstart",
      (e) => {
        touchX = e.changedTouches[0].clientX;
        stopTimer();
      },
      { passive: true }
    );
    viewport?.addEventListener(
      "touchend",
      (e) => {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 40) {
          goTo(index + (dx < 0 ? 1 : -1), true);
        } else {
          restartTimer();
        }
      },
      { passive: true }
    );

    viewport?.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1, true);
      }
    });

    root.addEventListener("mouseenter", stopTimer);
    root.addEventListener("mouseleave", () => {
      if (!paused) startTimer();
    });
    root.addEventListener("focusin", stopTimer);
    root.addEventListener("focusout", (e) => {
      if (!root.contains(e.relatedTarget) && !paused) startTimer();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopTimer();
      else if (!paused) startTimer();
    });

    goTo(0, false);
    startTimer();
  }

  /* ——— Review form → FormSubmit ——— */
  const form = document.getElementById("review-form");
  if (!form) return;

  const statusEl = form.querySelector("[data-review-status]");
  const starPicker = form.querySelector("[data-star-picker]");

  starPicker?.addEventListener("change", () => {
    starPicker.querySelectorAll(".star-option").forEach((lab) => {
      lab.classList.toggle("is-selected", lab.querySelector("input")?.checked);
    });
  });

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.className = `review-form-status is-${type}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      const sterren = form.querySelector('input[name="sterren"]:checked');
      if (!sterren) {
        showStatus("Kies een score van 1 tot 5 sterren.", "error");
      }
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const naam = String(data.naam || "").trim();
    const review = String(data.review || "").trim();
    const sterren = String(data.sterren || "");
    const email = String(data.email || "").trim();

    if (!naam || !review || !sterren) {
      showStatus("Vul naam, score en reviewtekst in.", "error");
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Versturen…";
    }

    const body = {
      naam,
      sterren: `${sterren} / 5`,
      review,
      _subject: "Nieuwe review Aanbouwdirect",
      _template: "table",
      _captcha: "false",
    };
    if (email) {
      body.email = email;
      body._replyto = email;
    } else {
      body.email = "-";
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
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

      form.reset();
      starPicker?.querySelectorAll(".star-option").forEach((lab) => {
        lab.classList.remove("is-selected");
      });
      showStatus(
        "Bedankt! Je review is verstuurd. We lezen hem graag.",
        "success"
      );
    } catch (err) {
      console.error(err);
      const mailto = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent("Review Aanbouwdirect")}&body=${encodeURIComponent(
        [
          `Naam: ${naam}`,
          `Score: ${sterren} / 5`,
          email ? `E-mail: ${email}` : null,
          ``,
          review,
        ]
          .filter((line) => line !== null)
          .join("\n")
      )}`;
      if (err && err.message === "FORMSUBMIT_ACTIVATION") {
        showStatus(
          `Online versturen lukt nog niet. Open je mailprogramma via de knop hieronder (review staat al klaar), of activeer FormSubmit in ${LEAD_EMAIL} (check Junk).`,
          "error"
        );
      } else {
        showStatus(
          `Versturen lukte niet. Stuur je review via e-mail naar ${LEAD_EMAIL} — of probeer opnieuw.`,
          "error"
        );
      }
      const fallback = form.querySelector("[data-review-mailto]");
      if (fallback) {
        fallback.hidden = false;
        fallback.href = mailto;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verstuur review";
      }
    }
  });
})();
