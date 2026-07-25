/**
 * E-mailconfig Aanbouw-direct
 * ----------------------------
 * Leads → FormSubmit (calculator.js) → info@maatkozijndirect.nl
 * Klantmail (HTML huisstijl) → EmailJS (onderstaande keys)
 *
 * Eenmalig instellen: zie website/EMAIL.md § EmailJS
 * Laat publicKey leeg tot de setup klaar is — dan valt de site terug op
 * FormSubmit _autoresponse (platte tekst, beperkt betrouwbaar via AJAX).
 */
window.AANBOUW_EMAIL = {
  leadEmail: "info@maatkozijndirect.nl",
  displayEmail: "info@aanbouw-direct.nl",
  phoneDisplay: "023 205 2483",
  phoneTel: "+31232052483",
  whatsappUrl:
    "https://wa.me/31232052483?text=Hoi%2C%20ik%20heb%20een%20vraag%20over%20een%20aanbouw%20of%20uitbouw",
  siteUrl: "https://koenpenha.github.io/aanbouwdirect-web/",
  /** PNG heeft betere e-mailondersteuning; tot die live staat: SVG-mark op Pages */
  logoUrl: "https://koenpenha.github.io/aanbouwdirect-web/assets/aanbouwdirect-mark.svg",
  address: "Oosteindeweg 21, 1432 AC Aalsmeer",
  emailjs: {
    publicKey: "", // bijv. "AbCdEf123..."
    serviceId: "", // bijv. "service_xxxxx"
    templateId: "", // bijv. "template_xxxxx" — zie EMAIL.md
  },
};
