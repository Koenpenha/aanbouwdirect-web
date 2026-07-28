/**
 * Cookie consent — Aanbouw-direct
 * localStorage: ad_cookie_consent = "all" | "necessary"
 *
 * Marketing/stats (Meta Pixel, GoatCounter, …) alleen bij "all".
 * Andere scripts: AanbouwConsent.whenMarketing(fn)
 */
(function () {
  var KEY = "ad_cookie_consent";
  var ALL = "all";
  var NECESSARY = "necessary";
  var EVENT = "ad:consent";
  var EVENT_LEGACY = "ad-cookie-consent";
  var bannerEl = null;
  var lastFocused = null;

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === ALL || v === NECESSARY) return v;
    } catch (e) {
      /* private mode / blocked */
    }
    return null;
  }

  function write(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* ignore */
    }
  }

  function hasMarketing() {
    return read() === ALL;
  }

  function dispatch(value) {
    var detail = { consent: value, marketing: value === ALL };
    try {
      document.dispatchEvent(new CustomEvent(EVENT, { detail: detail }));
    } catch (e) {
      /* ignore */
    }
    try {
      document.dispatchEvent(new CustomEvent(EVENT_LEGACY, { detail: detail }));
    } catch (e2) {
      /* ignore */
    }
  }

  function setConsent(value) {
    if (value !== ALL && value !== NECESSARY) return;
    write(value);
    hideBanner();
    dispatch(value);
  }

  function whenMarketing(fn) {
    if (typeof fn !== "function") return;
    if (hasMarketing()) {
      try {
        fn();
      } catch (e) {
        /* ignore */
      }
      return;
    }
    document.addEventListener(EVENT, function handler(ev) {
      var d = ev && ev.detail;
      if (d && d.consent === ALL) {
        document.removeEventListener(EVENT, handler);
        try {
          fn();
        } catch (e) {
          /* ignore */
        }
      }
    });
  }

  function privacyHref() {
    var path = (window.location && window.location.pathname) || "";
    if (/\/(blog|kennisbank|stats)(\/|$)/.test(path)) return "../privacy.html";
    if (/privacy\.html$/i.test(path)) return "privacy.html";
    return "privacy.html";
  }

  function buildBanner() {
    if (bannerEl) return bannerEl;
    var el = document.createElement("div");
    el.id = "ad-cookie-banner";
    el.className = "cookie-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "ad-cookie-title");
    el.setAttribute("aria-describedby", "ad-cookie-desc");
    el.hidden = true;
    el.innerHTML =
      '<div class="cookie-banner__inner">' +
      '<div class="cookie-banner__copy">' +
      '<p id="ad-cookie-title" class="cookie-banner__title">Cookies</p>' +
      '<p id="ad-cookie-desc" class="cookie-banner__text">' +
      "We gebruiken cookies voor statistieken en marketing (Meta Pixel en eventuele bezoekersstatistieken zoals GoatCounter). " +
      "Zo meten we of advertenties en de site werken. " +
      'Meer info in ons <a class="cookie-banner__link" href="' +
      privacyHref() +
      '">privacybeleid</a>.' +
      "</p>" +
      "</div>" +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="btn btn-primary cookie-banner__btn-accept" data-ad-consent="all">Accepteren</button>' +
      '<button type="button" class="btn cookie-banner__btn-necessary" data-ad-consent="necessary">Alleen noodzakelijk</button>' +
      "</div>" +
      "</div>";
    el.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      var choice = t.getAttribute("data-ad-consent");
      if (choice === ALL || choice === NECESSARY) {
        setConsent(choice);
      }
    });
    bannerEl = el;
    return el;
  }

  function showBanner() {
    var el = buildBanner();
    if (!el.parentNode) {
      document.body.appendChild(el);
    }
    el.hidden = false;
    el.classList.add("is-visible");
    lastFocused = document.activeElement;
    var acceptBtn = el.querySelector('[data-ad-consent="all"]');
    if (acceptBtn && typeof acceptBtn.focus === "function") {
      window.setTimeout(function () {
        acceptBtn.focus();
      }, 50);
    }
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.hidden = true;
    bannerEl.classList.remove("is-visible");
    if (lastFocused && typeof lastFocused.focus === "function") {
      try {
        lastFocused.focus();
      } catch (e) {
        /* ignore */
      }
    }
    lastFocused = null;
  }

  function openSettings(ev) {
    if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
    showBanner();
  }

  function bindSettingsLinks() {
    var nodes = document.querySelectorAll("[data-cookie-settings]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("click", openSettings);
    }
  }

  function init() {
    bindSettingsLinks();
    var current = read();
    if (!current) {
      showBanner();
    } else {
      /* Bestaande keuze: scripts die later laden kunnen whenMarketing gebruiken;
         dispatch zodat late listeners (defer) alsnog triggeren bij "all". */
      dispatch(current);
    }
  }

  window.AanbouwConsent = {
    KEY: KEY,
    ALL: ALL,
    NECESSARY: NECESSARY,
    EVENT: EVENT,
    get: read,
    set: setConsent,
    hasMarketing: hasMarketing,
    whenMarketing: whenMarketing,
    openSettings: openSettings,
    showBanner: showBanner,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
