/**
 * Meta Pixel helpers — Aanbouw-direct
 * Laadt fbq / init / PageView PAS na cookie-consent = "all"
 * (zie js/cookie-consent.js → AanbouwConsent).
 *
 * Lead / CompleteRegistration via window.AanbouwMeta.
 * Test: ?test_event_code=TEST46576
 */
(function () {
  var PIXEL_ID =
    (typeof window !== "undefined" && window.__META_PIXEL_ID__) ||
    "1086640393713616";

  /**
   * Removable flag: zet op "TEST46576" tijdens verificatie, daarna "" of verwijderen.
   * URL-param ?test_event_code=… wint van deze flag.
   */
  var TEMPORARY_TEST_EVENT_CODE = "";

  var loaded = false;

  function resolveTestEventCode() {
    try {
      var q = new URLSearchParams(window.location.search).get("test_event_code");
      if (q && /^TEST[0-9A-Za-z]+$/.test(q)) return q;
    } catch (e) {
      /* ignore */
    }
    if (TEMPORARY_TEST_EVENT_CODE && /^TEST[0-9A-Za-z]+$/.test(TEMPORARY_TEST_EVENT_CODE)) {
      return TEMPORARY_TEST_EVENT_CODE;
    }
    return "";
  }

  var TEST_EVENT_CODE = resolveTestEventCode();

  function noopApi() {
    window.AanbouwMeta = {
      ready: false,
      consentRequired: true,
      pixelId: PIXEL_ID,
      testEventCode: TEST_EVENT_CODE || null,
      trackLead: function () {},
      trackCompleteRegistration: function () {},
    };
  }

  if (!PIXEL_ID || !/^\d{5,20}$/.test(String(PIXEL_ID))) {
    noopApi();
    return;
  }

  function injectFbq() {
    if (loaded) return;
    if (typeof window.fbq === "function" && window._fbq) {
      loaded = true;
      return;
    }
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
    loaded = true;
  }

  function ensureFbq() {
    var consent = window.AanbouwConsent;
    if (consent && !consent.hasMarketing()) return false;
    /* Geen consent-API (oude pagina): niet laden — banner is verplicht */
    if (!consent) return false;
    injectFbq();
    return true;
  }

  function trackLead(extra) {
    try {
      if (!ensureFbq()) return;
      fbq("track", "Lead", extra || {});
    } catch (e) {
      /* ignore */
    }
  }

  function trackCompleteRegistration(extra) {
    try {
      if (!ensureFbq()) return;
      fbq("track", "CompleteRegistration", extra || {});
    } catch (e) {
      /* ignore */
    }
  }

  function activate() {
    injectFbq();
    window.AanbouwMeta = {
      ready: true,
      consentRequired: false,
      pixelId: PIXEL_ID,
      testEventCode: TEST_EVENT_CODE || null,
      trackLead: trackLead,
      trackCompleteRegistration: trackCompleteRegistration,
    };
  }

  noopApi();

  function boot() {
    var consent = window.AanbouwConsent;
    if (consent && typeof consent.whenMarketing === "function") {
      consent.whenMarketing(activate);
      return;
    }
    /* Fallback: wacht op consent-event */
    document.addEventListener("ad:consent", function (ev) {
      var d = ev && ev.detail;
      if (d && d.consent === "all") activate();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
