# 2026-07-15 — Env overrides SiteSettings (phase 1)

## Session Metadata

- **Date**: 2026-07-15
- **Goal**: Make env vars always take precedence over UI-stored site
  settings; give previously DB-only fields (`logoUrl`, `contactEmail`,
  `socialUrl`) env equivalents; disable locked inputs in the dashboard.

## Task Status

- Completed:
  - Added env-backed precedence in `src/lib/site-settings.ts`.
  - Exposed `overrides` + `envValues` on the site settings API.
  - Made PUT reject bodies that include env-locked fields.
  - Updated `DashboardSettings.tsx` to disable locked fields, show helper
    text, and strip them from the PUT body.
  - Documented new env vars in `.env.example`.
  - Added unit tests for env precedence in
    `src/__tests__/lib/site-settings.test.ts`.

## Architecture & Logic

### New env → field map

| Field          | Env var              |
| -------------- | -------------------- |
| `name`         | `BLOG_NAME`          |
| `description`  | `BLOG_DESCRIPTION`   |
| `logoUrl`      | `SITE_LOGO_URL`      |
| `contactEmail` | `SITE_CONTACT_EMAIL` |
| `socialUrl`    | `SITE_SOCIAL_URL`    |

### Precedence (per field, evaluated independently)

1. Env var (non-empty after trim).
2. Stored DB row (`site_profile` JSON blob).
3. Hardcoded fallback (only `description`; uses `name` from previous step).

### Public API

- `getSiteProfile()` — now returns env-first value per field.
- `getSiteProfileEnvOverrides()` — boolean map of which fields are locked.
- `getSiteProfileWithEnv()` — returns `{ profile, overrides, envValues }`,
  used by the API route.

### API changes (`src/app/api/settings/site/route.ts`)

- **GET**: returns the envelope `{ profile, overrides, envValues }`.
- **PUT**: if any field whose env override is active is present in the
  body, returns 400 with a message naming the locked fields. The client
  also strips these fields defensively before sending.

## Blockers

None.

## Verification

- `pnpm run check` — passes (lint, format, typecheck).
- `pnpm run test:unit` — 282/282 pass, including 7 new tests in
  `src/__tests__/lib/site-settings.test.ts`.

## Handoff

- E2E coverage for the new env-locked UI/API behavior is not yet added.
  Recommended follow-up: extend
  `src/__tests__/e2e/public-blog.e2e.test.ts` (or a new admin-settings
  e2e) to assert disabled inputs + 400 from PUT when env is set.
- Consider also routing the stragglers that still read
  `config.BLOG_NAME` directly (`src/app/manifest.ts`, feed.xml,
  `src/lib/smtp.ts`) through `getSiteProfile()` so the env override is
  consistent everywhere — out of scope for this change.
