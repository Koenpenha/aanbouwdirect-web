# Blog — lokale SEO-artikelen

Statische HTML per gemeente (en later intent-gidsen). Niet in de hoofdnav of hero; wel via eigen URL’s. De publieke hub is **Kennisbank** (`../kennisbank/`); dit mapje houdt de SEO-paden stabiel.

## Live URL’s

Basis posts: `https://koenpenha.github.io/aanbouwdirect-web/blog/`  
Hub: `https://koenpenha.github.io/aanbouwdirect-web/kennisbank/`

| Pad | Inhoud |
|-----|--------|
| `blog/` of `blog/index.html` | Overzicht tips |
| `blog/aanbouw-aalsmeer.html` | Aalsmeer |
| `blog/aanbouw-amstelveen.html` | Amstelveen |
| `blog/aanbouw-uithoorn.html` | Uithoorn |
| `blog/aanbouw-hoofddorp.html` | Hoofddorp / Haarlemmermeer |
| `blog/aanbouw-nieuw-vennep.html` | Nieuw-Vennep |
| `blog/aanbouw-kudelstaart.html` | Kudelstaart & Rijsenhout |

## Nieuwe post

Volg `marketing/BLOG-AUTOMATION.md` (queue in `marketing/QUEUE.csv`). Kort:

1. Pak volgende `idee` uit de queue.
2. Kopieer een bestaande post als template.
3. Voeg toe aan `blog/index.html` + `kennisbank/index.html` (juiste categorie).
4. Update `sitemap.xml` en queue-status → `live`.

**Breek geen bestaande `/blog/…` URL’s** zonder redirect.
