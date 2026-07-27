/**
 * Meta Pixel helpers — Aanbouw-direct
 * Base code (init + PageView) staat inline in index.html zodat Meta de pixel
 * in de HTML-bron herkent. Dit bestand: Lead / CompleteRegistration + AanbouwMeta.
 */
(function () {
  var PIXEL_ID =
    (typeof window !== "undefined" && window.__META_PIXEL_ID__) ||
    "1086640393713616";

  /* REMOVE AFTER TEST — Meta Events Manager Test Events */
  var TEST_EVENT_CODE = "TEST46576";

  function trackOpts() {
    return TEST_EVENT_CODE ? { testEventCode: TEST_EVENT_CODE } : undefined;
  }

  if (!PIXEL_ID || !/^\d{5,20}$/.test(String(PIXEL_ID))) {
    window.AanbouwMeta = {
      ready: false,
      trackLead: function () {},
      trackCompleteRegistration: function () {},
    };
    return;
  }

  /* Fallback als inline snippet ontbreekt (andere pagina's) */
  if (typeof window.fbq !== "function") {
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
    var opts = trackOpts();
    if (opts) {
      fbq("track", "PageView", {}, opts);
    } else {
      fbq("track", "PageView");
    }
  }

  function trackLead(extra) {
    try {
      var opts = trackOpts();
      if (opts) {
        fbq("track", "Lead", extra || {}, opts);
      } else {
        fbq("track", "Lead", extra || {});
      }
    } catch (e) {
      /* ignore */
    }
  }

  function trackCompleteRegistration(extra) {
    try {
      var opts = trackOpts();
      if (opts) {
        fbq("track", "CompleteRegistration", extra || {}, opts);
      } else {
        fbq("track", "CompleteRegistration", extra || {});
      }
    } catch (e) {
      /* ignore */
    }
  }

  window.AanbouwMeta = {
    ready: true,
    pixelId: PIXEL_ID,
    trackLead: trackLead,
    trackCompleteRegistration: trackCompleteRegistration,
  };
})();
