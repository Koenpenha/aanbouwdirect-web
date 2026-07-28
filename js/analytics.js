/**
 * Site analytics — GoatCounter
 * Laadt ALLEEN na cookie-consent = "all" (AanbouwConsent / ad_cookie_consent).
 * Config: js/analytics-config.js → window.AANBOUW_ANALYTICS
 */
(function () {
  var loaded = false;

  function cfg() {
    return (typeof window !== "undefined" && window.AANBOUW_ANALYTICS) || {};
  }

  function resolveCode() {
    var c = cfg();
    if (c.goatcounterCode) return String(c.goatcounterCode).replace(/[^\w-]/g, "");
    if (window.__GOATCOUNTER__ && window.__GOATCOUNTER__.code) {
      return String(window.__GOATCOUNTER__.code).replace(/[^\w-]/g, "");
    }
    return "";
  }

  function isEnabled() {
    var c = cfg();
    return c.enabled === true;
  }

  function loadGoat() {
    if (loaded || document.getElementById("ad-goatcounter")) return;
    if (!isEnabled()) return;
    var code = resolveCode();
    if (!code) return;

    var s = document.createElement("script");
    s.id = "ad-goatcounter";
    s.async = true;
    s.dataset.goatcounter = "https://" + code + ".goatcounter.com/count";
    s.src = "//gc.zgo.at/count.js";
    (document.head || document.documentElement).appendChild(s);
    loaded = true;
  }

  function marketingAllowed() {
    var consent = window.AanbouwConsent;
    if (consent && typeof consent.hasMarketing === "function") {
      return consent.hasMarketing();
    }
    try {
      return localStorage.getItem("ad_cookie_consent") === "all";
    } catch (e) {
      return false;
    }
  }

  function boot() {
    if (!isEnabled() || !resolveCode()) return;

    var consent = window.AanbouwConsent;
    if (consent && typeof consent.whenMarketing === "function") {
      consent.whenMarketing(loadGoat);
      return;
    }

    if (marketingAllowed()) {
      loadGoat();
      return;
    }

    function onConsent(ev) {
      var d = ev && ev.detail;
      var ok =
        (d && d.consent === "all") ||
        (d && d.marketing === true) ||
        marketingAllowed();
      if (ok) {
        document.removeEventListener("ad:consent", onConsent);
        document.removeEventListener("ad-cookie-consent", onConsent);
        loadGoat();
      }
    }
    document.addEventListener("ad:consent", onConsent);
    document.addEventListener("ad-cookie-consent", onConsent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
