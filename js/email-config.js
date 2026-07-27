/**
 * E-mailconfig Aanbouw-direct
 * ----------------------------
 * Lead → info@aanbouw.direct
 *   1) EmailJS (als leadTemplateId gezet)
 *   2) FormSubmit AJAX met _url (geen _cc naar klant)
 *
 * Klant → branded HTML via EmailJS (templateId) — zie EMAIL.md ≈10 min
 * Zonder keys: prijs op bedankt-stap + “Stuur indicatie naar mezelf”
 * Preview: email/preview-klant.html
 */
window.AANBOUW_EMAIL = {
  leadEmail: "info@aanbouw.direct",
  displayEmail: "info@aanbouw.direct",
  phoneDisplay: "023 205 2483",
  phoneTel: "+31232052483",
  whatsappUrl:
    "https://wa.me/31232052483?text=Hoi%2C%20ik%20heb%20een%20vraag%20over%20een%20aanbouw%20of%20uitbouw",
  siteUrl: "https://aanbouw.direct/",
  /** Absolute URL — e-mailclients: SVG wisselend; PNG heeft voorkeur als beschikbaar */
  logoUrl: "https://aanbouw.direct/assets/aanbouwdirect-mark.svg",
  address: "Molenweg 133, Aalsmeerderbrug",
  emailjs: {
    publicKey: "", // Account → General → Public Key
    serviceId: "", // Email Services → service_xxxxx
    templateId: "", // Klantmail ({{{html_body}}})
    leadTemplateId: "", // Optioneel: lead naar leadEmail
  },
};
