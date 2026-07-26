/**
 * E-mailconfig Aanbouw-direct
 * ----------------------------
 * Lead + display → info@aanbouw.direct (Namecheap Private Email)
 *   1) EmailJS (als leadTemplateId gezet) — voorkeur, geen FormSubmit-activatie
 *   2) FormSubmit AJAX met _url — stabiele fallback
 *
 * Klant → branded HTML-huisstijl via EmailJS (templateId)
 *
 * Eenmalig: zie website/EMAIL.md (≈10 min). Zonder EmailJS-keys:
 * lead werkt via FormSubmit; klant ziet prijs op bedankt-stap + “Mail mezelf”.
 * Outlook-setup: zie it/OUTLOOK.md
 */
window.AANBOUW_EMAIL = {
  leadEmail: "info@aanbouw.direct",
  displayEmail: "info@aanbouw.direct",
  phoneDisplay: "023 205 2483",
  phoneTel: "+31232052483",
  whatsappUrl:
    "https://wa.me/31232052483?text=Hoi%2C%20ik%20heb%20een%20vraag%20over%20een%20aanbouw%20of%20uitbouw",
  siteUrl: "https://aanbouw.direct/",
  /** Absolute URL — e-mailclients ondersteunen SVG wisselend; PNG heeft voorkeur */
  logoUrl: "https://aanbouw.direct/assets/aanbouwdirect-mark.svg",
  address: "Oosteindeweg 21, 1432 AC Aalsmeer",
  emailjs: {
    publicKey: "", // Account → General → Public Key
    serviceId: "", // Email Services → service_xxxxx
    templateId: "", // Klantmail-template ({{{html_body}}})
    leadTemplateId: "", // Optioneel: lead-template naar leadEmail
  },
};
