/**
 * Aanbouwdirect QA smoke — desktop + mobile
 * Usage: node website/_qa-smoke.mjs [URL]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "_qa");
const BASE = process.argv[2] || "https://dainty-chebakia-2c9893.netlify.app/";

const findings = {
  url: BASE,
  timestamp: new Date().toISOString(),
  heroVideo: null,
  formSubmit: null,
  overflow: { desktop: null, mobile: null },
  priceCopy2800: null,
  brokenImages: [],
  consoleErrors: [],
  pageErrors: [],
  calcViz: {},
  screenshots: [],
  notes: [],
};

async function shot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: false });
  findings.screenshots.push(path);
  return path;
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    return { scrollWidth: sw, innerWidth: iw, overflow: sw > iw + 1 };
  });
}

async function checkBrokenImages(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("img")].map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      complete: img.complete,
    })).filter((i) => i.complete && i.naturalWidth === 0)
  );
}

async function checkHeroVideo(page) {
  return page.evaluate(() => {
    const v = document.querySelector("video.hero-video");
    if (!v) return { exists: false };
    return {
      exists: true,
      readyState: v.readyState,
      poster: v.getAttribute("poster") || "",
      hasPoster: !!v.getAttribute("poster"),
      src: v.querySelector("source")?.src || v.currentSrc || "",
      paused: v.paused,
      error: v.error ? String(v.error.message || v.error.code) : null,
    };
  });
}

async function checkPriceCopy(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || "";
    const hits = [];
    if (text.includes("2800")) hits.push("2800");
    if (text.includes("2.800")) hits.push("2.800");
    // also check HTML for non-visible
    const html = document.documentElement.outerHTML;
    const htmlHits = [];
    if (/2800/.test(html)) htmlHits.push("2800-in-html");
    if (/2\.800/.test(html)) htmlHits.push("2.800-in-html");
    return { bodyHits: hits, htmlHits, bodyOk: hits.length === 0 };
  });
}

async function pickFirstChoice(page, choiceKey) {
  const sel = `.calc-step.is-active .choice[data-choice="${choiceKey}"]`;
  const btn = page.locator(sel).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(200);
    return true;
  }
  return false;
}

async function goNext(page) {
  const next = page.locator(".calc-step.is-active [data-next]").first();
  if (await next.count()) {
    await next.click();
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

async function selectTypeAndShotViz(page, type, shotName) {
  // Ensure step 1
  const step1 = page.locator('.calc-step[data-step="1"]');
  const active = await page.locator(".calc-step.is-active").getAttribute("data-step");
  if (active !== "1") {
    // reload to reset, or click back / nieuwe berekening
    const reset = page.locator('[data-next="1"]');
    if (await reset.count()) {
      await reset.click();
      await page.waitForTimeout(300);
    } else {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      await page.locator("#calculator").scrollIntoViewIfNeeded();
    }
  }
  await page.locator("#calculator").scrollIntoViewIfNeeded();
  await page.locator(`.choice[data-choice="type"][data-value="${type}"]`).click();
  await page.waitForTimeout(400);
  await shot(page, shotName);
  const viz = await page.evaluate((t) => {
    const scene = document.querySelector(`[data-viz-scene="${t}"]`);
    const display = scene ? scene.getAttribute("display") : "missing";
    const label = document.querySelector("[data-viz-label]")?.textContent?.trim();
    return { type: t, sceneDisplay: display, label, visible: display !== "none" };
  }, type);
  findings.calcViz[type] = viz;
  return viz;
}

async function runCalcFlow(page, typePrefix) {
  await page.locator("#calculator").scrollIntoViewIfNeeded();
  // reset to step 1 if needed
  await page.evaluate(() => {
    // click Terug until step 1 if mid-flow
  });
  const active = await page.locator(".calc-step.is-active").getAttribute("data-step");
  if (active && active !== "1") {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.locator("#calculator").scrollIntoViewIfNeeded();
  }

  await page.locator('.choice[data-choice="type"][data-value="aanbouw"]').click();
  await page.waitForTimeout(300);
  await shot(page, `${typePrefix}-step1-type.png`);

  await goNext(page);
  await shot(page, `${typePrefix}-step2-afmetingen.png`);

  await goNext(page);
  await pickFirstChoice(page, "gevel");
  await shot(page, `${typePrefix}-step3-gevel.png`);

  await goNext(page);
  await pickFirstChoice(page, "kozijn");
  await shot(page, `${typePrefix}-step4-kozijn.png`);

  await goNext(page);
  await pickFirstChoice(page, "isolatie");
  await pickFirstChoice(page, "heipalen");
  await shot(page, `${typePrefix}-step5-isolatie.png`);

  await goNext(page);
  await shot(page, `${typePrefix}-step6-prijs.png`);

  const summary = await page.locator("[data-summary]").textContent().catch(() => "");
  const price = await page.locator("[data-price]").textContent().catch(() => "");
  findings.notes.push(`Calc aanbouw flow summary: ${summary?.trim()} | price: ${price?.trim()}`);
}

async function submitLeadForm(page) {
  await page.locator("#calculator").scrollIntoViewIfNeeded();
  // Ensure on step 6
  let step = await page.locator(".calc-step.is-active").getAttribute("data-step");
  if (step !== "6") {
    // try full flow quickly
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.locator("#calculator").scrollIntoViewIfNeeded();
    await page.locator('.choice[data-choice="type"][data-value="aanbouw"]').click();
    for (let i = 0; i < 5; i++) {
      const choiceKeys = ["gevel", "kozijn", "isolatie", "heipalen"];
      for (const k of choiceKeys) await pickFirstChoice(page, k);
      await goNext(page);
    }
    step = await page.locator(".calc-step.is-active").getAttribute("data-step");
  }

  const dialogMessages = [];
  page.once("dialog", async (dialog) => {
    dialogMessages.push({ type: dialog.type(), message: dialog.message() });
    await dialog.accept();
  });

  await page.fill('input[name="naam"]', "QA Test Aanbouwdirect");
  await page.fill('input[name="telefoon"]', "0612345678");
  await page.fill('input[name="email"]', "qa-test@example.com");
  await page.fill('input[name="postcode"]', "1432 AC Aalsmeer");
  await page.fill('textarea[name="toelichting"]', "Automatische QA smoke test — negeren.");

  await page.locator('#lead-form button[type="submit"]').click();
  await page.waitForTimeout(4000);

  const thankVisible = await page.locator('.calc-step[data-step="7"].is-active').count();
  const thankText = thankVisible
    ? await page.locator("[data-thank-note]").textContent()
    : null;
  const activeStep = await page.locator(".calc-step.is-active").getAttribute("data-step");

  // Detect JS version markers via page evaluate of function source if possible
  const hasActivationHandling = await page.evaluate(async () => {
    try {
      const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.src);
      return { scripts };
    } catch {
      return { scripts: [] };
    }
  });

  findings.formSubmit = {
    dialogMessages,
    thankVisible: !!thankVisible,
    thankText: thankText?.trim() || null,
    activeStep,
    scripts: hasActivationHandling.scripts,
  };

  // Classify OLD vs NEW
  const joined = dialogMessages.map((d) => d.message).join(" ");
  if (/nog niet geactiveerd|FormSubmit-activatie/i.test(joined)) {
    findings.formSubmit.uiBehavior = "NEW: FormSubmit activation alert";
  } else if (thankVisible) {
    findings.formSubmit.uiBehavior = "SUCCESS thank-you step (FormSubmit worked or mocked)";
  } else if (/mis|fout|error|probeer/i.test(joined)) {
    findings.formSubmit.uiBehavior = "ERROR alert (possibly OLD js or network failure)";
  } else if (dialogMessages.length === 0 && !thankVisible) {
    findings.formSubmit.uiBehavior = "NO dialog and NO thank-you — unclear / still loading / OLD behavior";
  } else {
    findings.formSubmit.uiBehavior = `Dialog: ${joined.slice(0, 200)}`;
  }

  await shot(page, "form-submit-result.png");
}

async function attachListeners(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      findings.consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    findings.pageErrors.push(String(err.message || err));
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const report = [];

  // ——— DESKTOP ———
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    attachListeners(page);
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);

    findings.heroVideo = await checkHeroVideo(page);
    await shot(page, "desktop-hero.png");
    findings.overflow.desktop = await checkOverflow(page);
    findings.priceCopy2800 = await checkPriceCopy(page);

    await runCalcFlow(page, "desktop-calc-aanbouw");

    // Viz for each type
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    for (const type of ["aanbouw", "nok", "dakopbouw"]) {
      await selectTypeAndShotViz(page, type, `desktop-viz-${type}.png`);
    }

    await submitLeadForm(page);

    const broken = await checkBrokenImages(page);
    findings.brokenImages.push(...broken.map((b) => ({ ...b, viewport: "desktop" })));

    await context.close();
  }

  // ——— MOBILE ———
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    attachListeners(page);
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);

    await shot(page, "mobile-hero.png");
    findings.overflow.mobile = await checkOverflow(page);

    // Mobile nav
    const toggle = page.locator(".nav-toggle");
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(400);
      await shot(page, "mobile-nav-open.png");
      // close
      await toggle.click().catch(() => {});
      await page.waitForTimeout(200);
    }

    // Calculator types viz mobile
    await page.locator("#calculator").scrollIntoViewIfNeeded();
    for (const type of ["aanbouw", "nok", "dakopbouw"]) {
      await selectTypeAndShotViz(page, type, `mobile-viz-${type}.png`);
    }

    // Walk aanbouw calc briefly on mobile
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.locator("#calculator").scrollIntoViewIfNeeded();
    await page.locator('.choice[data-choice="type"][data-value="aanbouw"]').click();
    await goNext(page);
    await shot(page, "mobile-calc-step2.png");
    await goNext(page);
    await pickFirstChoice(page, "gevel");
    await goNext(page);
    await pickFirstChoice(page, "kozijn");
    await goNext(page);
    await pickFirstChoice(page, "isolatie");
    await pickFirstChoice(page, "heipalen");
    await goNext(page);
    await shot(page, "mobile-calc-step6.png");

    // Sections
    for (const [id, name] of [
      ["#faq", "mobile-faq.png"],
      ["#diensten", "mobile-diensten.png"],
      ["#contact", "mobile-contact.png"],
    ]) {
      const el = page.locator(id);
      if (await el.count()) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await shot(page, name);
        const ov = await checkOverflow(page);
        if (ov.overflow) findings.notes.push(`Overflow at ${id} mobile: ${JSON.stringify(ov)}`);
      } else {
        findings.notes.push(`Missing section ${id}`);
      }
    }

    const broken = await checkBrokenImages(page);
    findings.brokenImages.push(...broken.map((b) => ({ ...b, viewport: "mobile" })));

    // Re-check price copy on mobile DOM
    const priceM = await checkPriceCopy(page);
    if (!findings.priceCopy2800) findings.priceCopy2800 = priceM;
    else if (!priceM.bodyOk) findings.priceCopy2800 = priceM;

    await context.close();
  }

  await browser.close();

  const reportPath = join(OUT, "smoke-report.json");
  await writeFile(reportPath, JSON.stringify(findings, null, 2), "utf8");
  console.log(JSON.stringify(findings, null, 2));
  console.log("\nReport written:", reportPath);
}

main().catch((err) => {
  console.error("QA FAILED:", err);
  process.exit(1);
});
