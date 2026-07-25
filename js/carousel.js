(() => {
  const DEFAULT_MS = 5200;

  function initCarousel(root) {
    const slides = Array.from(root.querySelectorAll("[data-carousel-slide]"));
    if (!slides.length) return;

    const dotsWrap = root.querySelector("[data-carousel-dots]");
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");
    const pauseBtn = root.querySelector("[data-carousel-pause]");
    const viewport = root.querySelector("[data-carousel-viewport]");
    const label = root.getAttribute("data-carousel-label") || "Item";
    const intervalMs = Number(root.getAttribute("data-carousel-interval")) || DEFAULT_MS;

    let index = 0;
    let paused = false;
    let timer = null;
    let touchX = null;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `${label} ${i + 1} van ${slides.length}`);
        dot.addEventListener("click", () => goTo(i, true));
        dotsWrap.appendChild(dot);
      });
    }
    const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

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
      timer = window.setInterval(next, intervalMs);
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

  document.querySelectorAll("[data-carousel]").forEach(initCarousel);
})();
