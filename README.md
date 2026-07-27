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

Kopieer de inhoud van `website/` (zonder `hero-bedrijfsfilm.mp4` van ~52 MB) naar de repo [Koenpenha/aanbouwdirect-web](https://github.com/Koenpenha/aanbouwdirect-web) op `main`. Hero gebruikt `hero-bedrijfsfilm-lite.mp4` (~10 MB) op desktop en `hero-bedrijfsfilm-mobile.mp4` (~6 MB) op smalle schermen — muted autoplay; bij OS-blokkade blijft de poster staan (geen film-CTA).

## Leads / mail

Zie `EMAIL.md` en `TEST.md`.

- **Lead** → FormSubmit → `info@aanbouw.direct` (reply-to = klant).
- **Klantmail** → EmailJS HTML (na setup in `js/email-config.js`) of FormSubmit-CC met prijsindicatie.
- Na deploy: FormSubmit-activatiemail in die inbox (of Junk) klikken. EmailJS-keys invullen voor huisstijl-HTML.
