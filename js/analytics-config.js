/**
 * Bezoekersstatistieken — Aanbouw-direct
 * --------------------------------------
 * GoatCounter (privacy-vriendelijk, geen cookies van Goat zelf).
 * Laadt ALLEEN na cookie-consent `ad_cookie_consent === "all"`
 * (zie js/analytics.js + cookie-banner).
 *
 * Setup (2 min): marketing/STATS.md
 * Code = jouw GoatCounter-sitenaam → https://CODE.goatcounter.com
 */
window.AANBOUW_ANALYTICS = {
  /** Sitecode / subdomain bij GoatCounter — na signup: aanbouwdirect */
  goatcounterCode: "aanbouwdirect",
  /**
   * Zet op true zodra https://aanbouwdirect.goatcounter.com bereikbaar is.
   * Bij false: script laadt niet (geen kapotte count-calls).
   */
  enabled: false,
  /** Alleen laden bij consent "all" (Accepteren) */
  requireConsent: true,
  consentKey: "ad_cookie_consent",
  consentAcceptValue: "all",
};
