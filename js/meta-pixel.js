/**
 * Meta Pixel — Aanbouw-direct
 * Zet PIXEL_ID hieronder (of window.__META_PIXEL_ID__) nadat je de pixel
 * hebt aangemaakt in Events Manager. Leeg = geen tracking (veilig).
 */
(function () {
  var PIXEL_ID =
    (typeof window !== "undefined" && window.__META_PIXEL_ID__) ||
    "1086640393713616";

  if (!PIXEL_ID || !/^\d{5,20}$/.test(String(PIXEL_ID))) {
    window.AanbouwMeta = {
      ready: false,
      trackLead: function () {},
      trackCompleteRegistration: function () {},
    };
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

  function trackLead(extra) {
    try {
      fbq("track", "Lead", extra || {});
    } catch (e) {
      /* ignore */
    }
  }

  function trackCompleteRegistration(extra) {
    try {
      fbq("track", "CompleteRegistration", extra || {});
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
