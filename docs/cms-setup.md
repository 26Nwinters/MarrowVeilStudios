# MarrowVeil Studios CMS setup

This first CMS milestone adds a section-based blog editor to the employee portal and renders published articles on the existing static site using Supabase's public read policy. It does not yet include the selected-page visual editor or static HTML generation pipeline.

## Before testing

1. Merge the prerequisite site-audit pull request into `main`, then retarget/merge the CMS pull request into `main`. Do not deploy this branch directly to the live site.
2. In the Supabase dashboard for the MarrowVeil project, open **SQL Editor** and run `supabase/migrations/202610090001_cms_foundation.sql`.
3. Confirm your own row in `public.profiles` has `role = 'admin'`. The CMS intentionally denies all editing to other roles.
4. After the website changes are deployed, open `/employee/cms.html` and sign in with the administrator account.
5. Create a draft, add heading/text/image/quote/video/link blocks, preview it, and save it. Then publish a test post and confirm it appears on `/blog.html` and opens on `/article.html?slug=your-post-slug`.
6. Test from a signed-out/private browser that drafts are not readable and that only published articles appear publicly.

## Security notes

- The migration creates separate CMS tables and does not alter task/submission tables.
- Content editing and media upload permissions are enforced with Supabase RLS/storage policies; the hidden admin link is only a user-interface convenience.
- The `cms-media` bucket is public because images used in published articles must be viewable by site visitors. Only admins may upload, update, or delete objects in that bucket. Never upload employee submissions, private documents, or confidential material there.
- The CMS uses the existing browser-safe Supabase publishable key. Never add a Supabase service-role/secret key or GitHub token to a JavaScript file.
- The first version renders published content by fetching Supabase data in the browser. This makes publishing work without a deployment token, but individual articles do not yet have fully pre-generated static HTML metadata for search/social crawlers. A later milestone can add a protected publishing pipeline to generate static pages.

## Current scope

Included: blog article CRUD, draft/published/archived status, section blocks, image uploads, preview, categories, excerpts, SEO fields, public listing/detail templates, and a version snapshot before edits.

Not included yet: page-section editor for Home/About/Games/Press, sequential version restoration UI, scheduled publishing, static page generation, and automated end-to-end browser tests.
