# DevCalc CMS

Private, single-owner content manager for the existing DevCalc Turso database. There is **no sign-up flow**. It edits blog articles, the content/SEO of existing calculators, and existing database-backed site pages (About, Privacy Policy, Terms). It does not replace calculator computation code or manage special hand-coded routes.

## Deploy in this order

1. In `D:\devcal\devcalc`, run **`npm run db:cms:migrate`** with the production Turso credentials. This applies only the CMS migrations: `017_create_cms_images.sql` (image storage) and `018_remove_cms_login_attempts.sql` (removes obsolete failed-login tracking). Do not run the all-migrations command solely for this CMS; local-only migrations may be present in a development checkout.
2. Deploy the updated DevCalc site. It adds `/cms-image/[id]` and the authenticated `/api/cms-revalidate` endpoint.
3. In `D:\devcal\cms`, run `npm install` and `node scripts/hash-password.mjs`. Enter a unique password of at least 16 characters. Copy only the generated hash and random secrets into your deployment environment; do **not** commit them.
4. Deploy `cms` as a separate Next.js project. Use a private admin domain, HTTPS, and your host's deployment protection/access restriction if available. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the **same** database as DevCalc. Set `CMS_ADMIN_PASSWORD_HASH`, `CMS_SESSION_SECRET`, `CMS_SITE_URL`, and `CMS_REVALIDATE_SECRET` from `.env.example`. Set the **same** `CMS_REVALIDATE_SECRET` on the DevCalc deployment. Redeploy both when changing that shared secret.
5. Sign in and create a **draft** blog first. Upload an image (optional), add original article sections, FAQs, sources, and SEO. Preview it, publish it, then verify the public blog URL, `/sitemap.xml`, `/rss.xml`, and the image URL. Archives are recoverable and remove pages from public lists and the sitemap.

For local development, copy `.env.example` to `.env.local`, fill secrets, and use `npm run dev` (port 3001). DevCalc normally runs on port 3000. Set `CMS_SITE_URL=http://localhost:3000` locally and use the same local revalidation secret in both projects. Do not reuse local secrets in production.

The local CMS uses whichever database its `.env.local` points to. If you use the live DevCalc Turso credentials, saved edits affect live content. Deploy the updated DevCalc blog renderer before relying on rich formatting publicly; until then, the CMS also saves plain paragraphs so articles remain readable.

## How publication works

- Both apps read/write the same Turso `blog_posts` and `calculators` tables. The CMS saves drafts, published records, and archived records; DevCalc exposes only `published` rows.
- The CMS calls DevCalc's signed revalidation endpoint after edits. If it is unreachable, the save still succeeds and existing DevCalc ISR windows refresh pages and sitemap automatically (blogs/sitemap around 60 seconds; calculator pages around 300 seconds).
- Blog slugs are fixed once a record is created to avoid breaking external links. To change a URL, create a new draft and archive the old page after arranging a redirect in DevCalc.
- Calculator records can be edited and archived, but creating a new calculator requires a code renderer and deployment. The CMS cannot safely synthesize executable calculation logic.
- Existing About, Privacy Policy, and Terms pages can be edited or archived. Their SEO metadata can be changed without touching the imported page body. To edit a legacy page body, choose **Open body in Tiptap**, review the conversion and preview, then save. This replaces the imported layout with the standard DevCalc page layout; its route and canonical path remain fixed.
- Image uploads accept JPEG, PNG, WebP, or AVIF up to 2 MB. Bytes are stored in Turso and served from DevCalc's `/cms-image/[id]` route. Files are immutable; uploading a replacement creates a new URL. Keep images reasonably compressed to avoid database growth.
- The blog has one Tiptap article body for headings, lists, links, tables, images, and inline formatting in published order. Existing blog sections are combined in that editor when opened; saving an edited article stores its body as one rich section. The public page builds its table of contents from the article's H2 headings. Related calculators are selected through a searchable list of published calculators. Calculator explanatory content and converted site pages also use Tiptap. Uploaded images preview within the CMS before publication. The CMS sanitizes saved rich HTML; DevCalc renders it in the server HTML. Each editor has separate Content and SEO tabs, a search appearance preview, and an unsaved-changes warning.

## Security and operations

- The site-owner password is stored as a salted scrypt hash, not as plaintext. Sessions are signed, HTTP-only, SameSite=Strict, and Secure on production HTTPS. Admin APIs require the session and same-origin write requests. There is no failed-login lockout, so keep the admin deployment private and use host-level access restrictions where available.
- The entire CMS returns `noindex` and `no-store` headers, but **noindex is not access control**. Keep the admin deployment private. Never expose Turso credentials or CMS secrets through `NEXT_PUBLIC_` variables.
- Back up Turso before bulk edits. Archive rather than hard-delete when a live URL has backlinks. Check the site, sitemap, RSS, and Search Console after significant SEO changes.
- Content quality, accuracy, source verification, and AdSense approval remain editorial decisions; a CMS cannot guarantee them.
