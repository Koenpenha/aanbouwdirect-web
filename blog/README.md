# Blog — lokale SEO-artikelen

Statische HTML-blogs per gemeente. Niet in de hoofdnav of hero; wel bereikbaar via eigen URL’s en een discrete footer-link op de homepage.

## Live URL’s

Basis: `https://koenpenha.github.io/aanbouwdirect-web/blog/`

| Pad | Onderwerp |
|-----|-----------|
| `blog/` of `blog/index.html` | Overzicht |
| `blog/aanbouw-aalsmeer.html` | Aalsmeer |
| `blog/aanbouw-amstelveen.html` | Amstelveen |
| `blog/aanbouw-uithoorn.html` | Uithoorn |
| `blog/aanbouw-hoofddorp.html` | Hoofddorp / Haarlemmermeer |
| `blog/aanbouw-nieuw-vennep.html` | Nieuw-Vennep |
| `blog/aanbouw-kudelstaart.html` | Kudelstaart & Rijsenhout |

## Doorlinken (achterkant / Google / ads)

Gebruik altijd het pad onder `/blog/…`. Voorbeelden:

- Overzicht: `https://koenpenha.github.io/aanbouwdirect-web/blog/`
- Post: `https://koenpenha.github.io/aanbouwdirect-web/blog/aanbouw-aalsmeer.html`
- Relatief vanaf homepage: `blog/aanbouw-aalsmeer.html`
- CTA naar calculator: `../index.html#calculator` (vanuit een post)

Op het latere productiedomein (`aanbouw-direct.nl`) worden dezelfde paden verwacht: `/blog/…`.

## Nieuwe gemeente-blog toevoegen

1. Kopieer een bestaande post (bijv. `aanbouw-aalsmeer.html`).
2. Hernoem naar `aanbouw-[slug].html` (kleine letters, streepjes).
3. Pas aan: `<title>`, meta description, canonical-URL, H1, body, related links.
4. Voeg een kaart toe op `blog/index.html`.
5. Link vanuit 1–2 naburige posts onder “Gerelateerd”.
6. Deploy de map `website/` opnieuw naar GitHub Pages (zie `../README.md`).

### Content-checklist

- ~600–900 woorden, bruikbaar (geen keyword-spam)
- Gemeente + aanbouw / dakopbouw / nokverhoging natuurlijk verweven
- Casco-scope eerlijk (geen turn-key beloven)
- Soft CTA naar calculator + bel/mail
- Geen publieke €/m²-claims; wel “transparante prijsindicatie”

## Styles

- Gedeeld: `../css/styles.css`
- Blog: `blog.css`
