# MarrowVeil website optimization and validation

The visual direction and copy are preserved by this optimization. Public navigation
and footer markup are now present in initial HTML rather than fetched during page load.

## Project pages and SEO
- Clean routes (/about, /hourglass, etc.) also have matching .html variants.
- Mirror files must remain identical apart from the <base href="/"> element.
- Home has Organization and WebSite structured data; game pages use VideoGame.
- The studio's social preview fallback is an existing public PNG asset.
- Published CMS articles are exported to articles/<slug>/index.html, which
  contains full HTML, Article JSON-LD and a canonical tag. CMS fallback remains.

## Tests
- node --test scripts/site-quality.test.mjs
- node --check script.js && node --check article.js && node --check blog-cms.js
- python -m pip install Pillow==11.3.0 && python scripts/optimize_images.py

The image script creates 1920px-max WebP variants and changes ordinary page
resource references, but preserves original artwork for social previews/downloads.
It is triggered for the optimization branch and can be run manually.
Do not delete the original PNG/JPG files until their use in press assets,
social previews, and the live site has been checked.

## Measurements needing an external browser
Run a new mobile + desktop PageSpeed Insights test for the homepage, HourGlass,
Mek-Ai Archives and a devlog article. Confirm LCP, INP, CLS and any unexpected
network issues. Use browser assistive technology to check menu focus, touch targets,
and contrast at 320px, 375px, 768px and desktop widths.

## Publishing a new devlog article
Use Content Studio to publish. The static exporter is intended to run from
the main branch once enabled with GitHub Actions, then produces:
- articles/<slug>/index.html
- articles/manifest.json, sitemap.xml and feed.xml
Until a static snapshot is published, the existing browser-side CMS fallback works.

## Known limitations and follow-ups
- The site's appearance and actual mobile performance still require a real
  headless/physical browser audit (source tests alone cannot certify them).
- Supabase Auth's leaked-password protection setting is controlled in the
  project Auth configuration and may depend on the Supabase plan.
- Search ranking and actual index coverage require Google Search Console.
- llms.txt is informational; major AI providers do not promise ranking from it.
- Press kits should only include artwork cleared for public distribution.
