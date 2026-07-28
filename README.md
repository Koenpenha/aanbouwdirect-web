# Aanbouwdirect — website

**Live URL (GitHub Pages):** https://koenpenha.github.io/aanbouwdirect-web/

> De oude Netlify-URL (`dainty-chebakia-2c9893.netlify.app`) is gepauzeerd (bandwidth-limiet). Gebruik bovenstaande link.

## Wat zit erbij

Prijsindicatie = **casco** (wind- & waterdicht, isolatie, kozijnen, hijskraan, stroom). Exclusief interieurafbouw (stuc, vloeren, keuken, schilderwerk binnen). Sectie `#wat-zit-erbij` + compacte bullets bij calculator-stap prijs — **live per type** via `includesByType` in `js/calculator.js` (aanbouw, nok, dakopbouw, dakterras, dakkapel, bijhuisje).

## Blog (lokale SEO) + Kennisbank

- **Hub:** `kennisbank/` — footer “Kennisbank”, categorieën Gemeentes / Uitbreiden / Proces.  
  Live: https://koenpenha.github.io/aanbouwdirect-web/kennisbank/
- **Artikelen:** blijven onder `blog/` (SEO-URL’s niet breken). Zie `blog/README.md`.  
  Live: https://koenpenha.github.io/aanbouwdirect-web/blog/
- **Planner:** `marketing/QUEUE.csv` + prompt in `marketing/BLOG-AUTOMATION.md`

## Lokaal

Open `index.html` via een lokale server (niet als `file://`), of vanuit deze map:

```bash
npx --yes serve .
```

## Deploy opnieuw

Automatisch (preferred):

```bash
node scripts/seo-golive-deploy.mjs
```

Dat publiceert due `approved` items (max 2) en pusht `website/` naar [Koenpenha/aanbouwdirect-web](https://github.com/Koenpenha/aanbouwdirect-web) op `main` — **zonder** `assets/hero-bedrijfsfilm.mp4` (~55 MB), **met** CNAME `aanbouw.direct`. Hero gebruikt `hero-bedrijfsfilm-lite.mp4` / `hero-bedrijfsfilm-mobile.mp4`.

Dagelijks op GitHub: workflow **Daily SEO go-live** (09:00 Amsterdam) doet hetzelfde go-live-deel op de live-repo voor items die al als `approved` in `_seo/QUEUE.csv` staan.

Handmatig: kopieer `website/` (zonder die grote film) naar die repo op `main`.

## Leads / mail

Zie `EMAIL.md` en `TEST.md`.

- **Lead** → FormSubmit → `info@aanbouw.direct` (reply-to = klant).
- **Klantmail** → EmailJS HTML (na setup in `js/email-config.js`) of FormSubmit-CC met prijsindicatie.
- Na deploy: FormSubmit-activatiemail in die inbox (of Junk) klikken. EmailJS-keys invullen voor huisstijl-HTML.
