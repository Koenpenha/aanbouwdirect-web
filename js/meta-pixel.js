/**
 * Meta Pixel helpers — Aanbouw-direct
 * Base code (init + PageView) staat inline in index.html (standaard Meta-snippet).
 * Dit bestand: Lead / CompleteRegistration + AanbouwMeta (+ optionele test code).
 *
 * Test Events: open Events Manager → Test Events (code TEST46576) en bezoek de site.
 * Optioneel: ?test_event_code=TEST46576 — browser-pixel heeft geen CAPI test_event_code nodig;
 * de code wordt bewaard voor debug. PageView/Lead blijven standaard fbq-calls.
 */
(function () {
  var PIXEL_ID =
    (typeof window !== "undefined" && window.__META_PIXEL_ID__) ||
    "1086640393713616";

  /**
   * Removable flag: zet op "TEST46576" tijdens verificatie, daarna "" of verwijderen.
   * URL-param ?test_event_code=… wint van deze flag.
   */
  var TEMPORARY_TEST_EVENT_CODE = "TEST46576";

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

  if (!PIXEL_ID || !/^\d{5,20}$/.test(String(PIXEL_ID))) {
    window.AanbouwMeta = {
      ready: false,
      trackLead: function () {},
      trackCompleteRegistration: function () {},
    };
    return;
  }

  function ensureFbq() {
    if (typeof window.fbq === "function") return;
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
  }

  ensureFbq();

  function trackLead(extra) {
    try {
      ensureFbq();
      fbq("track", "Lead", extra || {});
    } catch (e) {
      /* ignore */
    }
  }

  function trackCompleteRegistration(extra) {
    try {
      ensureFbq();
      fbq("track", "CompleteRegistration", extra || {});
    } catch (e) {
      /* ignore */
    }
  }

  window.AanbouwMeta = {
    ready: true,
    pixelId: PIXEL_ID,
    testEventCode: TEST_EVENT_CODE || null,
    trackLead: trackLead,
    trackCompleteRegistration: trackCompleteRegistration,
  };
})();
