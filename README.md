# Bidvista website

Static site for **www.bidvista.org**, hosted on GitHub Pages.

## Uploading to GitHub

1. Open the repository on GitHub.
2. Choose **Add file → Upload files**.
3. Drag in **everything inside this folder**, including the `assets` folder, and commit.
4. Uploading replaces the old pages of the same name.

The page filenames and URLs are unchanged. `/services`, `/blog-acos-vs-tacos` and the rest work exactly as before. `CNAME`, `robots.txt`, `sitemap.xml` and `favicon.png` are included unchanged.

## Structure

| Path | What it is |
|---|---|
| `*.html` | One file per page: home, services, case studies, blog, 9 articles, contact, privacy, landing, 404 |
| `assets/css/style.css` | All styles, shared by every page |
| `assets/js/main.js` | All motion, the 3D orb, page transitions, click tracking and the contact form |
| `assets/img/` | Logo and the two client dashboard screenshots |

## Tracking

Every page loads the same tags as before, in the `<head>`:

- Google Analytics 4: `G-GDV2GVXPKS`
- Microsoft Clarity: `vr3gfchndq`
- Meta Pixel: `1299160462262289`, with `PageView` and a `ViewContent` named per page

Click and lead events are handled in `assets/js/main.js`:

| Action | Google Analytics | Meta Pixel |
|---|---|---|
| Any email link | `contact_click` {method: email} | `Contact` {content_name: email} |
| Any WhatsApp link | `contact_click` {method: whatsapp} | `Contact` {content_name: whatsapp} |
| Fiverr link | `contact_click` {method: fiverr} | `Contact` {content_name: fiverr} |
| Contact form sent | `generate_lead` {method: contact_form} | `Lead` |

The contact form still posts to Formspree (`xykngvlj`).

## Libraries

The pages load these from public CDNs: Three.js r128 for the 3D orb, GSAP 3.12 with ScrollTrigger, and Lenis for smooth scroll. The fonts are Inter Tight and Instrument Serif from Google Fonts. If any library fails to load, the page stays readable and usable.

Design & build — By Bhavay Sehgal
