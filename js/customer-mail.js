/**
 * Klantmail: platte tekst + HTML huisstijl + EmailJS-verzending.
 * Gebruikt window.AANBOUW_EMAIL uit email-config.js.
 */
(() => {
  const cfg = () => window.AANBOUW_EMAIL || {};

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

  function isEmailjsReady() {
    const e = cfg().emailjs || {};
    return Boolean(e.publicKey && e.serviceId && e.templateId && window.emailjs);
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
      c.siteUrl || "https://aanbouw-direct.nl/",
    ];
    return lines.join("\n");
  }

  function buildHtml({ naam, summaryLines, lowLabel, highLabel }) {
    const c = cfg();
    const phone = c.phoneDisplay || "023 205 2483";
    const phoneTel = c.phoneTel || "+31232052483";
    const displayEmail = c.displayEmail || "info@aanbouw-direct.nl";
    const siteUrl = c.siteUrl || "https://koenpenha.github.io/aanbouwdirect-web/";
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
              · <a href="${escapeHtml(siteUrl)}" style="color:#007694;text-decoration:none;">aanbouw-direct.nl</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async function sendViaEmailjs({ toEmail, naam, htmlBody, plainBody, lowLabel, highLabel }) {
    if (!isEmailjsReady()) {
      return { ok: false, skipped: true, reason: "emailjs-not-configured" };
    }
    const e = cfg().emailjs;
    try {
      if (typeof emailjs.init === "function") {
        emailjs.init({ publicKey: e.publicKey });
      }
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

  window.AanbouwCustomerMail = {
    isEmailjsReady,
    buildPlain,
    buildHtml,
    sendViaEmailjs,
    firstName,
  };
})();
