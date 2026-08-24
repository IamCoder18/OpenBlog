# 2026-07-15 — Sitemap SEO remediation (phase 4)

## Session Metadata

- **Date**: 2026-07-15
- **Goal**: Replace the build-time, localhost-only sitemap with a complete,
  runtime-generated, scalable, SEO-useful sitemap and deploy it locally.

## Task Status

- Completed:
  - Replaced the prerendered Next.js metadata sitemap with a dynamic sitemap
    index and dynamic partition routes.
  - Made `robots.txt` dynamic so it uses the runtime canonical origin.
  - Included all indexable public surfaces: homepage, Explore, enabled public
    pages, public authors, public topics, and every `PUBLIC` post.
  - Excluded `PRIVATE`, `UNLISTED`, and `DRAFT` posts.
  - Added accurate content-derived `<lastmod>` values and settings modification
    tracking.
  - Added image sitemap entries for public post cover images.
  - Added 50,000-URL partitioning and a standards-compliant sitemap index.
  - Added XML escaping, HTTP caching/security headers, invalid-part 404s, and
    visible failures for database outages instead of a misleading fallback.
  - Added an XSL stylesheet for a readable browser presentation.
  - Updated tests and discovery documentation.
  - Rebuilt and redeployed the local production-style container.

## Architecture & Logic

### Routes

- `/sitemap.xml`: live sitemap index.
- `/sitemaps/site-N.xml`: homepage, Explore, enabled pages, public author
  archives, and public topic archives.
- `/sitemaps/posts-N.xml`: public posts, split at 50,000 URLs per document.
- `/sitemap.xsl`: presentation stylesheet used by the index and child files.
- `/robots.txt`: live crawler policy advertising the runtime sitemap URL.

All sitemap and robots handlers use Next.js 16's `connection()` request-time API.
The production build now classifies `/robots.txt`, `/sitemap.xml`, and
`/sitemaps/[part]` as dynamic (`ƒ`) instead of prerendering them into the image.

### Dates and content

- Post `<lastmod>` values come from `Post.updatedAt`.
- Author and topic dates are the latest update among their public posts.
- Homepage and Explore dates are the latest relevant post/publication/site
  update.
- Editable public pages use the publication setting's `updatedAt` timestamp.
- `SiteSettings.updatedAt` was added through
  `20260715210000_add_site_settings_updated_at` to make these signals truthful.
- Cover images with valid HTTP(S) URLs are emitted through the image sitemap
  namespace.

### Failure and caching behavior

- Database failures propagate as server errors so crawlers can retry; the app no
  longer returns and caches a successful sitemap containing only the homepage.
- Dynamic responses use a five-minute shared-cache window with one-hour
  stale-while-revalidate support.
- XML values are entity escaped and dates use ISO 8601.

## Blockers

- None.
- The first full-suite run exposed outdated single-sitemap assertions and a
  non-hermetic `BLOG_NAME`; both were corrected before the final run.
- A first manual parser command concatenated multiple complete XML documents and
  failed at the second XML declaration. Validation was rerun correctly on each
  document independently, and all documents passed.

## Verification

- `pnpm run check`: passed lint, formatting, and TypeScript checks.
- Focused sitemap tests: 9/9 passed.
- `pnpm run test:full`: passed all 673 tests:
  - Unit: 294/294.
  - Integration: 177/177.
  - E2E: 202/202.
- E2E creates a public post after the production build and proves that it appears
  immediately while private and unlisted posts remain absent.
- Production Docker build reports all sitemap and robots routes as dynamic.
- Migration applied successfully; the final container reports no pending
  migrations and is healthy on port 9922.
- Live local and public checks:
  - `https://blog.aaravlabs.com/sitemap.xml`: HTTP 200.
  - `https://blog.aaravlabs.com/robots.txt`: HTTP 200 and advertises the HTTPS
    sitemap.
  - Both public child sitemaps: HTTP 200.
  - XML/XSL parsing: all four documents passed.
  - Database public posts: 1; post sitemap entries: 1.
  - `localhost` references across sitemap index, children, and robots: 0.
  - The public post entry includes its canonical URL, accurate `<lastmod>`, and
    cover image.

## Handoff

- Submit `https://blog.aaravlabs.com/sitemap.xml` in Google Search Console and
  Bing Webmaster Tools if it has not already been submitted.
- No further application or deployment work is required for this sitemap fix.
