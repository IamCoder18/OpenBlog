# Session Metadata

- **Date:** 2026-07-14
- **Phase:** 7
- **Description:** Reframe and implement OpenBlog as a configurable, content-first publication rather than a generic SaaS marketing site.

# Task Status

## Completed

- Reviewed the product requirements, design documentation, roadmap, UI/UX audit, prior session logs, current routes, content schema, settings, permissions, and test expectations.
- Confirmed and implemented the product contract for a self-hosted publication: the public site serves one publication's stories while the dashboard remains the author/admin workspace.
- Replaced the generic marketing hero and invented editorial claims with a compact, settings-backed publication masthead and real article content.
- Added explicit `isPinned` and `isFeatured` post fields, a production migration, API validation, editor controls, dashboard quick actions, and role-aware authorization.
- Added deterministic homepage ranking: the first three stories use publication time with a fixed 14-day featured boost, remaining pinned stories follow by recency, then remaining stories use the same featured/recency score without duplicates.
- Reframed `/explore` as reader-facing `All stories`, ordered by pinned status and then publication recency; featured status does not affect archive order.
- Added restrained Featured badges to public cards, article pages, author pages, topic pages, and dashboard listings.
- Added broad administrator-controlled publication settings for light/dark colors, typography, corner character, density, card layout, cover visibility, motion intensity, homepage details, attribution, and editable public pages.
- Added safe presets, a live preview, reset behavior, validated constrained values, and color-contrast validation to the publication settings experience.
- Added editable About, Contact, Privacy, and Terms templates with per-page visibility and settings-driven sitemap/navigation/footer behavior.
- Kept RSS fixed to feed autodiscovery and a small footer link, with no promotional or hide control.
- Masked sign-in and signup from anonymous public navigation while preserving direct authentication routes and authenticated workspace access.
- Added `Powered by OpenBlog` attribution enabled by default with an administrator opt-out.
- Added content-resilient public story cards and intentionally simple author and topic article listings.
- Added publication-level animation and interaction flows with a comprehensive reduced-motion fallback.
- Hardened site setting URLs to allow only safe HTTP(S) destinations and retained validated publication design tokens instead of arbitrary CSS.
- Updated API documentation, README product/ranking documentation, unit tests, real-database integration tests, and browser tests.
- Rebuilt and redeployed the local production application with Docker Compose while preserving the existing database volume.

## In Progress

- None.

# Architecture & Logic

- OpenBlog is software for operating an individual publication. A deployment's public surface represents that site's authors and articles; it is not a centralized OpenBlog content network or an acquisition landing page.
- Publication experience settings are persisted under the `publication_experience` site-settings key and normalized through a shared, constrained schema. Defaults keep the site usable before any administrator customization.
- Admin customization is represented by validated design tokens and focused presentation controls. This provides substantial visual control without exposing unsafe custom CSS or introducing a page builder.
- Pinning and featuring are separate editorial signals. Authors may manage them on their own stories; administrators may manage them on any story through the existing centralized post policy.
- Homepage ranking is deterministic: `rankingTime = publishedAt + 14 days` for featured stories and `rankingTime = publishedAt` otherwise. The three highest-ranked stories lead, remaining pinned stories follow newest-first, and all remaining stories return to the ranking score.
- A story that is both featured and pinned can enter the leading group through the featured heuristic and is de-duplicated from the pinned group.
- `All stories` intentionally ignores featured status for ordering. Pinned stories appear first, followed by all other stories newest-first.
- Public post requests explicitly use public visibility so authenticated authors cannot accidentally expose their own drafts through public listing components.
- Featured badges communicate explicit editorial intent and are never inferred from a story's position or age.
- Public pages are settings-backed Markdown templates. Disabled pages resolve as not found and are omitted from public navigation and the sitemap.
- RSS remains permanently discoverable through metadata and the footer. This behavior is not administrator-configurable by design.
- Public authentication is masked through navigation rather than disabled. `/auth/login` and `/auth/signup` remain directly addressable for publication members.
- Motion supports orientation and feedback across content entry, cards, menus, navigation, settings, and loading states. `prefers-reduced-motion` disables nonessential movement.

# Blockers

- None.
- The production image logs a build-time Better Auth placeholder-secret warning while collecting page data because runtime secrets are not copied into the image build. The real secret remains runtime-injected; the production build completes and the deployed health check passes.
- SMTP is intentionally unconfigured in the local production environment, so email password recovery remains disabled and is reported as a startup warning.

# Verification

- `pnpm run check`: passed lint, formatting, and TypeScript checks across 248 files.
- `git diff --check`: passed.
- `pnpm run test:full`: passed.
  - Unit: 34 files, 274 tests.
  - Integration: 7 files, 177 tests against the Docker test database.
  - E2E: 201 Playwright tests.
- `docker compose -f docker-compose.local.yaml build app`: passed; Next.js 16.2.0 production compilation and TypeScript validation succeeded.
- Tagged `openblog:local` as `openblog:production-local` and recreated only the application service with `docker compose up -d --force-recreate app`.
- Migration `20260714210000_add_editorial_priority` applied successfully. Production `Post.isPinned` and `Post.isFeatured` columns are boolean fields with `false` defaults.
- `openblog-app` and `openblog-db`: healthy.
- `GET http://localhost:9922/api/health`: `200`, `{\"status\":\"ok\"}`.
- `GET http://localhost:9922/`: `200 text/html`.
- `GET http://localhost:9922/explore`: `200 text/html`.
- `GET http://localhost:9922/feed.xml`: `200 application/xml`.

# Handoff

- The requested publication-model enhancements are implemented and running locally at `http://localhost:9922`.
- Administrators can configure the publication experience from Dashboard Settings. Authors and administrators can pin or feature stories from the editor, and dashboard story actions provide quick toggles.
- The current local production database contains no public stories, so the homepage correctly presents its role-aware empty state until content is published.
- Future improvements can extend the constrained settings schema or ranking policy without changing the public route structure or introducing arbitrary page composition.
