# MarrowVeil Studios Website

Official website: https://marrowveilstudios.com/

## Hosting
- Static site hosted with GitHub Pages; custom domain is in `CNAME`.
- Shared navigation and footer fragments are in `includes/` and loaded by `script.js`.
- The employee workspace in `employee/` uses Supabase Auth, Postgres, and private Storage.

## Main files
- `index.html`: homepage
- `games.html`, `hourglass.html`, `mekaiarchives.html`: game pages
- `about.html`, `contact.html`, `press.html`, `blog.html`: studio information
- `shop.html`: shop interface
- `style.css`, `script.js`: public styling and interactions
- `includes/nav.html`, `includes/footer.html`: shared page elements
- `employee/`: employee portal client
- `sitemap.xml`, `404.html`: discovery and error handling

## Editing safely
1. Make changes on a feature branch and review them in a pull request.
2. Never commit secrets. A Supabase publishable key may be used in browser code; never commit a service-role key, database password, or other secret.
3. Test changed pages at desktop and mobile sizes. Check browser-console errors, navigation, shop filters, keyboard focus, and reduced-motion behavior.
4. Verify the live deployment after merging.

## Portal security
The browser client is not a security boundary. Supabase Row Level Security and Storage policies must enforce authorization. Recheck policies whenever portal code or schema changes. Review private bucket access, file limits, authentication recovery, backups, and retention settings in the Supabase dashboard.

## Release checklist
- [ ] No console errors on touched pages
- [ ] Mobile menu and dropdowns work
- [ ] Shop filter and cart interactions work
- [ ] Keyboard focus and reduced motion work
- [ ] Canonical URLs, social metadata, and sitemap are correct
- [ ] Upload and deletion error states are understandable
- [ ] No secrets or private team files are committed
