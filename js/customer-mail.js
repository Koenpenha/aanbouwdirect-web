/**
 * Klant- + leadmail: platte tekst + HTML huisstijl + EmailJS-verzending.
 * Gebruikt window.AANBOUW_EMAIL uit email-config.js.
 * Design: Aanbouw-direct V2 — cream / teal #007694 / orange #E07830
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
      `Bedankt — we hebben je aanvraag binnen. Hieronder je prijsindicatie op basis van wat je hebt samengesteld.`,
      ``,
      `Jouw prijsindicatie: ${lowLabel} – ${highLabel}`,
      ``,
      `Jouw keuzes`,
      ...(summaryLines || []).map((line) => `· ${line}`),
      ``,
      `Let op: dit is een indicatie, geen offerte. De definitieve prijs leggen we samen vast op locatie — na een afspraak.`,
      ``,
      `Casco = wind- & waterdicht, geïsoleerd, met kozijnen. Geen interieurafbouw (stuc binnen, vloeren, keuken).`,
      ``,
      `Vragen of liever meteen schakelen?`,
      `Bel / WhatsApp: ${phone}`,
      `Mail: ${c.displayEmail || "info@aanbouw.direct"}`,
      `Web: ${c.siteUrl || "https://aanbouw.direct/"}`,
      ``,
      `Groet,`,
      `Team Aanbouw-direct`,
      c.address || "Molenweg 133, Aalsmeerderbrug",
    ];
    return lines.join("\n");
  }

  /**
   * Branded HTML voor klantbevestiging (EmailJS {{{html_body}}}).
   * Table-based + inline styles voor Outlook/Gmail.
   */
  function buildHtml({ naam, summaryLines, lowLabel, highLabel }) {
    const c = cfg();
    const phone = c.phoneDisplay || "023 205 2483";
    const phoneTel = c.phoneTel || "+31232052483";
    const displayEmail = c.displayEmail || "info@aanbouw.direct";
    const siteUrl = c.siteUrl || "https://aanbouw.direct/";
    const logoUrl = c.logoUrl || "https://aanbouw.direct/assets/aanbouwdirect-mark.svg";
    const address = c.address || "Molenweg 133, Aalsmeerderbrug";
    const whatsappUrl =
      c.whatsappUrl ||
      "https://wa.me/31232052483?text=Hoi%2C%20ik%20heb%20een%20vraag%20over%20een%20aanbouw%20of%20uitbouw";

    const greet = escapeHtml(firstName(naam));
    const low = escapeHtml(lowLabel);
    const high = escapeHtml(highLabel);
    const font =
      "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    const choiceRows = (summaryLines || [])
      .map(
        (line) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #E8EEF0;font-family:${font};font-size:15px;line-height:1.45;color:#1C2428;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E07830;margin-right:10px;vertical-align:middle;"></span>
                  <span style="vertical-align:middle;">${escapeHtml(line)}</span>
                </td>
              </tr>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Je prijsindicatie van Aanbouw-direct</title>
</head>
<body style="margin:0;padding:0;background:#F5F7F8;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    Jouw prijsindicatie: ${low} – ${high}. Indicatie — definitief op locatie.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F7F8;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E6EBEE;">

          <!-- Header -->
          <tr>
            <td style="background:#007694;padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:22px 28px 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <img src="${escapeHtml(logoUrl)}" width="48" height="42" alt="Aanbouw-direct" style="display:block;border:0;height:auto;max-width:48px;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:${font};font-size:19px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.2;">Aanbouw-direct</div>
                          <div style="font-family:${font};font-size:12px;color:#B8E0EC;margin-top:3px;line-height:1.3;">Waarom verhuizen als je kan uitbouwen?</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="height:4px;line-height:4px;font-size:0;background:#E07830;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 28px 10px;font-family:${font};font-size:16px;line-height:1.55;color:#1C2428;">
              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#005A72;letter-spacing:-0.02em;line-height:1.25;">Hoi ${greet},</p>
              <p style="margin:0;">Bedankt — we hebben je aanvraag binnen. Hieronder je prijsindicatie op basis van wat je hebt samengesteld. We nemen zo snel mogelijk contact met je op voor een afspraak op locatie.</p>
            </td>
          </tr>

          <!-- Prijsblok -->
          <tr>
            <td style="padding:16px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF7F0;border:1px solid #F3E0D0;border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;font-family:${font};">
                    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#E07830;margin-bottom:8px;">Jouw prijsindicatie</div>
                    <div style="font-size:28px;font-weight:700;line-height:1.15;color:#1C2428;letter-spacing:-0.03em;">${low} – ${high}</div>
                    <div style="font-size:13px;color:#6B7378;margin-top:8px;line-height:1.4;">Op basis van je keuzes in de calculator</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Keuzes -->
          <tr>
            <td style="padding:18px 28px 6px;font-family:${font};font-size:15px;font-weight:700;color:#005A72;">
              Jouw keuzes
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${choiceRows}
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:14px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F7F8;border-radius:0 10px 10px 0;border-left:4px solid #007694;">
                <tr>
                  <td style="padding:14px 16px;font-family:${font};font-size:14px;line-height:1.55;color:#1C2428;">
                    <strong style="color:#005A72;">Let op:</strong> dit is een indicatie, geen offerte. De definitieve prijs leggen we samen vast op locatie — na een afspraak.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 6px;font-family:${font};font-size:13px;line-height:1.5;color:#6B7378;">
              Casco = wind- &amp; waterdicht, geïsoleerd, met kozijnen. Geen interieurafbouw (stuc binnen, vloeren, keuken).
            </td>
          </tr>

          <!-- CTA's -->
          <tr>
            <td style="padding:18px 28px 8px;font-family:${font};font-size:15px;color:#1C2428;">
              Vragen of liever meteen schakelen?
            </td>
          </tr>
          <tr>
            <td style="padding:4px 28px 26px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 8px 8px 0;">
                    <a href="tel:${escapeHtml(phoneTel)}" style="display:inline-block;background:#E07830;color:#FFFFFF;font-family:${font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px;">Bel ${escapeHtml(phone)}</a>
                  </td>
                  <td style="padding:0 8px 8px 0;">
                    <a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;background:#007694;color:#FFFFFF;font-family:${font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px;">WhatsApp</a>
                  </td>
                  <td style="padding:0 0 8px 0;">
                    <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#FFFFFF;color:#007694;font-family:${font};font-size:14px;font-weight:700;text-decoration:none;padding:11px 16px;border-radius:8px;border:2px solid #007694;">aanbouw.direct</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #E6EBEE;font-family:${font};font-size:13px;line-height:1.55;color:#6B7378;background:#FAFBFC;">
              <strong style="color:#1C2428;font-size:14px;">Team Aanbouw-direct</strong><br />
              ${escapeHtml(address)}<br />
              <a href="mailto:${escapeHtml(displayEmail)}" style="color:#007694;text-decoration:none;">${escapeHtml(displayEmail)}</a>
              &nbsp;·&nbsp;
              <a href="tel:${escapeHtml(phoneTel)}" style="color:#007694;text-decoration:none;">${escapeHtml(phone)}</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(siteUrl)}" style="color:#007694;text-decoration:none;">aanbouw.direct</a>
            </td>
          </tr>

        </table>
        <p style="margin:16px 0 0;font-family:${font};font-size:11px;line-height:1.4;color:#9AA3A8;max-width:580px;">
          Je ontvangt deze mail omdat je een prijsindicatie hebt aangevraagd via aanbouw.direct.
        </p>
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
    <tr><td style="height:4px;line-height:4px;font-size:0;background:#E07830;">&nbsp;</td></tr>
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
        reply_to: cfg().displayEmail || "info@aanbouw.direct",
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
    const to = c.leadEmail || "info@aanbouw.direct";
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
