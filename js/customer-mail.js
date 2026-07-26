/**

 * Klant- + leadmail: platte tekst + HTML huisstijl + EmailJS-verzending.

 * Gebruikt window.AANBOUW_EMAIL uit email-config.js.

 */

(() => {

  const cfg = () => window.AANBOUW_EMAIL || {};



  let emailjsInited = false;



  function escapeHtml(value) {

    return String(value ?? "")

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;");

  }



  function firstName(naam) {

    const part = String(naam || "")

      .trim()

      .split(/\s+/)[0];

    return part || "daar";

  }



  function emailjsKeys() {

    return cfg().emailjs || {};

  }



  function ensureEmailjsInit() {

    const e = emailjsKeys();

    if (!e.publicKey || !window.emailjs) return false;

    if (!emailjsInited && typeof emailjs.init === "function") {

      emailjs.init({ publicKey: e.publicKey });

      emailjsInited = true;

    }

    return true;

  }



  function isCustomerEmailjsReady() {

    const e = emailjsKeys();

    return Boolean(e.publicKey && e.serviceId && e.templateId && window.emailjs);

  }



  function isLeadEmailjsReady() {

    const e = emailjsKeys();

    return Boolean(e.publicKey && e.serviceId && e.leadTemplateId && window.emailjs);

  }



  /** @deprecated alias — klantmail */

  function isEmailjsReady() {

    return isCustomerEmailjsReady();

  }



  function buildPlain({ naam, summaryLines, lowLabel, highLabel }) {

    const c = cfg();

    const phone = c.phoneDisplay || "023 205 2483";

    const lines = [

      `Hoi ${firstName(naam)},`,

      ``,

      `Bedankt voor je aanvraag via Aanbouw-direct. We hebben je gegevens ontvangen en nemen zo snel mogelijk contact met je op.`,

      ``,

      `Jouw indicatie: ${lowLabel} – ${highLabel}`,

      ``,

      `Jouw keuzes`,

      ...(summaryLines || []).map((line) => `· ${line}`),

      ``,

      `Dit is een goede richting op basis van wat je hebt ingevuld. De definitieve prijs leggen we samen vast op locatie — na een afspraak.`,

      ``,

      `Liever zelf bellen of WhatsAppen? ${phone}.`,

      `Of mail: ${c.displayEmail || "info@aanbouw-direct.nl"}`,

      ``,

      `Groet,`,

      `Aanbouw-direct`,

      phone,

      c.address || "Oosteindeweg 21, 1432 AC Aalsmeer",

      c.siteUrl || "https://aanbouw.direct/",

    ];

    return lines.join("\n");

  }



  function buildHtml({ naam, summaryLines, lowLabel, highLabel }) {

    const c = cfg();

    const phone = c.phoneDisplay || "023 205 2483";

    const phoneTel = c.phoneTel || "+31232052483";

    const displayEmail = c.displayEmail || "info@aanbouw-direct.nl";

    const siteUrl = c.siteUrl || "https://aanbouw.direct/";

    const logoUrl = c.logoUrl || "";

    const address = c.address || "Oosteindeweg 21, 1432 AC Aalsmeer";

    const greet = escapeHtml(firstName(naam));

    const low = escapeHtml(lowLabel);

    const high = escapeHtml(highLabel);



    const choiceRows = (summaryLines || [])

      .map(

        (line) => `

              <tr>

                <td style="padding:8px 0;border-bottom:1px solid #E6EBEE;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.45;color:#1C2428;">

                  ${escapeHtml(line)}

                </td>

              </tr>`

      )

      .join("");



    const logoBlock = logoUrl

      ? `<img src="${escapeHtml(logoUrl)}" width="56" height="49" alt="Aanbouw-direct" style="display:block;border:0;height:auto;max-width:56px;" />`

      : `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#007694;letter-spacing:-0.02em;">Aanbouw-direct</div>`;



    return `<!DOCTYPE html>

<html lang="nl">

<head>

  <meta charset="utf-8" />

  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <meta name="color-scheme" content="light" />

  <title>Je prijsindicatie van Aanbouw-direct</title>

</head>

<body style="margin:0;padding:0;background:#F5F7F8;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">

    Jouw indicatie: ${low} – ${high}. Dit is een richting; de definitieve prijs leggen we vast op locatie.

  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;margin:0;padding:24px 12px;">

    <tr>

      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E6EBEE;">

          <tr>

            <td style="background:#007694;padding:22px 28px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <tr>

                  <td style="vertical-align:middle;width:64px;">${logoBlock}</td>

                  <td style="vertical-align:middle;padding-left:14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;">

                    Aanbouw-direct

                  </td>

                </tr>

              </table>

            </td>

          </tr>

          <tr>

            <td style="padding:28px 28px 8px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1C2428;">

              <p style="margin:0 0 14px;">Hoi ${greet},</p>

              <p style="margin:0 0 14px;">Bedankt voor je aanvraag. We hebben je gegevens ontvangen en nemen zo snel mogelijk contact met je op.</p>

            </td>

          </tr>

          <tr>

            <td style="padding:8px 28px 20px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7F0;border:1px solid #F3E0D0;border-radius:10px;">

                <tr>

                  <td style="padding:18px 20px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

                    <div style="font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#E07830;margin-bottom:6px;">Jouw indicatie</div>

                    <div style="font-size:26px;font-weight:700;line-height:1.2;color:#1C2428;letter-spacing:-0.02em;">${low} – ${high}</div>

                  </td>

                </tr>

              </table>

            </td>

          </tr>

          <tr>

            <td style="padding:4px 28px 8px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#005A72;">

              Jouw keuzes

            </td>

          </tr>

          <tr>

            <td style="padding:0 28px 18px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                ${choiceRows}

              </table>

            </td>

          </tr>

          <tr>

            <td style="padding:4px 28px 22px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1C2428;">

              <p style="margin:0 0 12px;padding:14px 16px;background:#F5F7F8;border-left:4px solid #007694;border-radius:0 8px 8px 0;">

                Dit is een goede richting op basis van wat je hebt ingevuld. De definitieve prijs leggen we samen vast op locatie — na een afspraak.

              </p>

              <p style="margin:0 0 12px;color:#6B7378;font-size:14px;">

                Casco: wind- &amp; waterdicht, geïsoleerd, met kozijnen. Geen interieurafbouw (stuc binnen, vloeren, keuken).

              </p>

              <p style="margin:0;">

                Liever zelf bellen of WhatsAppen?

                <a href="tel:${escapeHtml(phoneTel)}" style="color:#007694;font-weight:600;text-decoration:none;">${escapeHtml(phone)}</a>

              </p>

            </td>

          </tr>

          <tr>

            <td style="padding:18px 28px 26px;border-top:1px solid #E6EBEE;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#6B7378;">

              <strong style="color:#1C2428;">Aanbouw-direct</strong><br />

              ${escapeHtml(address)}<br />

              <a href="mailto:${escapeHtml(displayEmail)}" style="color:#007694;text-decoration:none;">${escapeHtml(displayEmail)}</a>

              · <a href="${escapeHtml(siteUrl)}" style="color:#007694;text-decoration:none;">aanbouw.direct</a>

            </td>

          </tr>

        </table>

      </td>

    </tr>

  </table>

</body>

</html>`;

  }



  function buildLeadHtml({ data, summary, area, prijs }) {

    const rows = [

      ["Naam", data.naam],

      ["E-mail", data.email],

      ["Telefoon", data.telefoon],

      ["Postcode", data.postcode],

      ["Toelichting", data.toelichting || "—"],

      ["Project", summary],

      ["Oppervlakte", `${area} m²`],

      ["Prijsindicatie", prijs],

    ]

      .map(

        ([label, value]) => `

      <tr>

        <td style="padding:10px 12px;border-bottom:1px solid #E6EBEE;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#6B7378;width:140px;vertical-align:top;">${escapeHtml(label)}</td>

        <td style="padding:10px 12px;border-bottom:1px solid #E6EBEE;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1C2428;vertical-align:top;">${escapeHtml(value || "—")}</td>

      </tr>`

      )

      .join("");



    return `<!DOCTYPE html>

<html lang="nl"><head><meta charset="utf-8" /><title>Nieuwe calculator-aanvraag</title></head>

<body style="margin:0;padding:24px;background:#F5F7F8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E6EBEE;border-radius:12px;overflow:hidden;">

    <tr><td style="background:#007694;padding:18px 24px;color:#fff;font-size:18px;font-weight:700;">Nieuwe calculator-aanvraag</td></tr>

    <tr><td style="padding:8px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>

    <tr><td style="padding:16px 24px;font-size:13px;color:#6B7378;">Via aanbouw.direct calculator · Reply-to = klant</td></tr>

  </table>

</body></html>`;

  }



  async function sendViaEmailjs({ toEmail, naam, htmlBody, plainBody, lowLabel, highLabel }) {

    if (!isCustomerEmailjsReady()) {

      return { ok: false, skipped: true, reason: "emailjs-not-configured" };

    }

    const e = emailjsKeys();

    try {

      ensureEmailjsInit();

      await emailjs.send(e.serviceId, e.templateId, {

        to_email: toEmail,

        reply_to: cfg().displayEmail || "info@aanbouw-direct.nl",

        from_name: "Aanbouw-direct",

        subject: "Je prijsindicatie van Aanbouw-direct",

        naam: firstName(naam),

        prijs_low: lowLabel,

        prijs_high: highLabel,

        prijs_range: `${lowLabel} – ${highLabel}`,

        message: plainBody,

        html_body: htmlBody,

      });

      return { ok: true, via: "emailjs" };

    } catch (err) {

      console.error("EmailJS klantmail mislukt:", err);

      return { ok: false, via: "emailjs", error: err };

    }

  }



  async function sendLeadViaEmailjs({ data, summary, area, prijs }) {

    if (!isLeadEmailjsReady()) {

      return { ok: false, skipped: true, reason: "emailjs-lead-not-configured" };

    }

    const e = emailjsKeys();

    const c = cfg();

    const to = c.leadEmail || "info@maatkozijndirect.nl";

    const htmlBody = buildLeadHtml({ data, summary, area, prijs });

    const plain = [

      `Nieuwe calculator-aanvraag`,

      `Naam: ${data.naam}`,

      `E-mail: ${data.email}`,

      `Telefoon: ${data.telefoon}`,

      `Postcode: ${data.postcode}`,

      `Project: ${summary}`,

      `Oppervlakte: ${area} m²`,

      `Prijsindicatie: ${prijs}`,

      `Toelichting: ${data.toelichting || "-"}`,

    ].join("\n");



    try {

      ensureEmailjsInit();

      await emailjs.send(e.serviceId, e.leadTemplateId, {

        to_email: to,

        reply_to: data.email,

        from_name: "Aanbouw-direct calculator",

        subject: `Aanbouw-direct: aanvraag + prijsindicatie — ${data.naam}`,

        naam: data.naam,

        message: plain,

        html_body: htmlBody,

        project: summary,

        prijsindicatie: prijs,

      });

      return { ok: true, via: "emailjs-lead" };

    } catch (err) {

      console.error("EmailJS leadmail mislukt:", err);

      return { ok: false, via: "emailjs-lead", error: err };

    }

  }



  window.AanbouwCustomerMail = {

    isEmailjsReady,

    isCustomerEmailjsReady,

    isLeadEmailjsReady,

    buildPlain,

    buildHtml,

    buildLeadHtml,

    sendViaEmailjs,

    sendLeadViaEmailjs,

    firstName,

  };

})();


