# Session metadata

- **Date:** 2026-07-14
- **Phase:** 2 — product/UI/UX audit remediation and production readiness
- **Source:** `audits/2026-07-14_product-ui-ux-audit.md`

## Task status

### Completed

- Centralized post visibility, ownership, and role policy for collections,
  direct reads, creation, updates, deletion, previews, and analytics.
- Implemented owner/admin access to non-public content and direct-link-only
  unlisted semantics.
- Rebuilt publishing state management with authoritative save responses,
  serialized writes, local recovery, server autosave, unsaved-navigation guards,
  explicit publish confirmation, persisted scheduling, slug redirects, and a
  protected scheduled-publishing job.
- Replaced plaintext API keys with one-time secrets, SHA-256 digests, safe
  prefixes, scopes, expiry, last-use metadata, and revocation.
- Corrected analytics attribution, public-route ingestion, personal/site scope,
  role enforcement, UTC grouping, and accessible chart/table output.
- Reworked public navigation, discovery, reading, authentication, story
  management, settings, agent profile/security, and editor responsive layouts.
- Added light/dark/system reader modes, configurable publication identity,
  accessible focus/touch/live-region/dialog/menu behavior, reduced-motion
  handling, and safe-area support.
- Added forgot/reset password, policy pages, author/topic archives, loading and
  error boundaries, global error handling, robots, manifest, sitemap, richer
  RSS, canonical metadata, JSON-LD, CSP/security headers, and health checks.
- Removed server loopback requests and client waterfalls from primary server
  routes, self-hosted KaTeX CSS, removed unsafe embeds, and removed starter
  assets.
- Updated schema, generated Prisma client, migration, maintenance scripts,
  Compose health/security configuration, API/deployment documentation, and the
  E2E-only role helper gate.
- Replaced legacy tests that encoded insecure behavior or implemented a second
  in-memory Prisma with focused production contracts, then aligned the real-DB
  and browser suites with the finalized role/visibility model.

### In progress

- None.

## Architecture and logic

- `post-policy.ts` is the single authorization vocabulary. Anonymous
  collections are public-only; authors receive public plus their own content;
  admins can query all. Private/draft direct reads require owner/admin, while
  unlisted content is intentionally readable only by its direct URL.
- Public signup produces an `AGENT`. Only `AUTHOR` and `ADMIN` accounts mutate
  posts. Role changes are admin-owned; the legacy E2E role route is unavailable
  unless `E2E_TESTING=true`.
- Scheduled content is stored non-public with an absolute UTC `scheduledAt` and
  promoted by an idempotent bearer-protected cron route.
- API-key plaintext exists only in the creation response. Database records keep
  the digest and non-sensitive metadata.
- Site brand theme and reader color mode are separate concerns. Database-backed
  site settings are server rendered; the reader preference is local and wins
  over the accent preset.
- Dynamic rendering is deliberate because the root identity, theme, session,
  and publication content are database-backed.

## Blockers

- **Legacy tests asserted insecure AGENT mutation and cross-author visibility.**
  Resolved by finalizing the capability model and updating real behavior tests.
- **Integration runners imported the old Prisma index and evaluated
  `server-only`.** Resolved with the generated client path and an isolated test
  alias.
- **E2E auth initialized without a deterministic secret.** Resolved in the full
  suite orchestrator without weakening runtime configuration requirements.
- **Build attempted database prerendering without a build-time database.**
  Resolved through intentional dynamic rendering for database-backed routes.

## Verification

- `pnpm run check` — passed with no lint, formatting, or type errors.
- `AUTH_SECRET=… BASE_URL=http://localhost:3000 pnpm run build` — passed;
  production compilation, TypeScript, route collection, and page generation
  completed successfully.
- `pnpm run test:full` — passed:
  - 262 unit/component/API tests
  - 169 real-PostgreSQL integration tests
  - 200 Chromium E2E tests
  - **631 total passing, 0 failing**

## Handoff

- Apply `prisma/migrations/20260714000000_production_readiness/migration.sql`
  during deployment. Existing plaintext API keys are revoked by design and must
  be reissued.
- Configure `AUTH_SECRET`, `BASE_URL`, and database credentials. Configure
  `RESEND_API_KEY`/`EMAIL_FROM` for password recovery and `CRON_SECRET` plus a
  minutely scheduler for scheduled publishing.
- Use `/api/health` for readiness and pin `OPENBLOG_IMAGE` to a release tag.
