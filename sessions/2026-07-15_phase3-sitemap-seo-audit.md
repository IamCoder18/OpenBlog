# 2026-07-15 — Sitemap SEO audit (phase 3)

## Session Metadata

- **Date**: 2026-07-15
- **Goal**: Determine whether OpenBlog has an automatically generated,
  SEO-optimized sitemap and verify the currently deployed output.

## Task Status

- Completed:
  - Reviewed the Next.js 16.2 sitemap file convention from the installed docs.
  - Audited `src/app/sitemap.ts`, `src/app/robots.ts`, URL configuration,
    sitemap tests, and the production Docker build configuration.
  - Inspected the Next.js prerender manifest and generated sitemap artifact.
  - Requested `/sitemap.xml` from the running local production container.
- No application behavior was changed; this session was diagnostic only.

## Architecture & Logic

- `src/app/sitemap.ts` uses Next.js's native metadata route to produce
  `/sitemap.xml` from the database.
- Its intended URL set includes the homepage, Explore, enabled public content
  pages, all `PUBLIC` posts, authors with public posts, and topics used by public
  posts. Post entries use the post's `updatedAt` value for `<lastmod>`.
- `src/app/robots.ts` advertises the sitemap and excludes API, authentication,
  dashboard, and agent routes from crawling.
- `BASE_URL` supplies absolute sitemap URLs.

### Audit conclusion

The source contains an automatically generated sitemap, but the current build
is not reliably automatic or fully SEO-ready:

1. Next.js prerenders `/sitemap.xml` with `initialRevalidateSeconds: false`.
   The route has no dynamic or revalidation declaration, so new and changed
   posts are not reflected after the image is built.
2. The Docker build has no database connection. The sitemap catches the failed
   database query and emits only the homepage, which is then baked into the
   image permanently.
3. The image bakes `NEXT_PUBLIC_BASE_URL=http://localhost:3000`. Although the
   running container has `BASE_URL=https://blog.aaravlabs.com`, that runtime
   value cannot update the already-prerendered sitemap. The live local
   production endpoint therefore returns only `http://localhost:3000`.
4. The homepage, Explore, public content pages, author pages, and topic pages use
   the current request/build timestamp as `<lastmod>`, not their last
   significant content update. Search engines can disregard inaccurate
   `<lastmod>` signals.
5. All records are loaded into one sitemap. A sitemap index or partitioning is
   needed before the site reaches the protocol limit of 50,000 URLs or 50 MB.

## Blockers

- None for the audit.
- A correct production verification against `https://blog.aaravlabs.com` was
  not attempted because the local deployment is exposed at a LAN address and
  the task did not authorize production changes.

## Verification

- Installed framework version: Next.js 16.2.0.
- `.next/prerender-manifest.json`: `/sitemap.xml` is prerendered with no
  revalidation.
- `GET http://localhost:9922/sitemap.xml`: HTTP 200 and valid sitemap XML, but
  only one URL (`http://localhost:3000`).
- Running container environment: `BASE_URL=https://blog.aaravlabs.com`, proving
  that the incorrect URL is from the build-time static artifact rather than
  current runtime configuration.
- Existing E2E coverage checks XML structure, homepage presence, public posts,
  and post `<lastmod>` elements, but it does not catch build-time staleness or
  the runtime/base-URL mismatch.
- No test suite was run because no code changed; the assessment used source,
  build-artifact, container-environment, and HTTP response inspection.

## Handoff

- Make the sitemap explicitly runtime-generated or give it a deliberate
  revalidation policy, ensuring database failures are observable and do not get
  baked into the image.
- Use accurate modification dates or omit `<lastmod>` where no reliable date is
  available.
- Add a production-style test that builds without the database, starts with the
  runtime `BASE_URL` and database, and verifies that public content and the
  runtime origin appear in `/sitemap.xml`.
- Add partitioned sitemaps before the URL count approaches 50,000.
