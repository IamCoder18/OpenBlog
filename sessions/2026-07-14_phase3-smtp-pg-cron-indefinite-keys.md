# Session Metadata

- **Date:** 2026-07-14
- **Phase:** 3
- **Description:** Replace provider-specific password-reset delivery with optional SMTP, expose indefinite API keys, and move scheduled publishing into PostgreSQL with `pg_cron`.

# Task Status

## Completed

- Removed the Resend HTTP integration and all Resend-specific configuration.
- Added provider-neutral SMTP password-reset delivery through Nodemailer.
- Made a completely absent SMTP configuration a supported deployment mode.
- Added strict validation for partial SMTP server, authentication, port, and TLS settings.
- Added a password-recovery unavailable state that leaves the rest of authentication operational.
- Added an explicit **Never expires** API-key choice and expiration metadata in the key list.
- Added a purpose-built PostgreSQL 16.14 image containing checksum-verified `pg_cron` 1.6.7.
- Added production, local, and test Compose configuration for `pg_cron`.
- Replaced the authenticated HTTP cron endpoint with database-native jobs.
- Added a minute-level scheduled-publication job and bounded cron-history retention.
- Updated the release workflow to publish the database image in the existing OpenBlog GHCR package.
- Updated environment and deployment documentation.

## In Progress

- None.

# Architecture & Logic

## SMTP

- SMTP is disabled only when all SMTP variables are absent. Login, signup, and all non-email features continue normally in this mode.
- `SMTP_HOST` and `SMTP_FROM` are required when any SMTP option is supplied.
- `SMTP_USER` and `SMTP_PASSWORD` must be supplied together, while unauthenticated internal relays remain supported.
- Port 587 is the default. Implicit TLS is inferred for port 465 unless `SMTP_SECURE` is explicitly supplied.
- The reset page receives availability from a Server Component and does not submit a reset request when delivery is unavailable.
- Reset URL origins are checked against `BASE_URL` before sending, and HTML content is escaped.

## API keys

- The existing nullable `ApiKey.expiresAt` contract remains authoritative.
- The UI now omits `expiresInDays` when **Never expires** is selected, producing `expiresAt = null` without a schema migration.
- Indefinite keys remain scoped, hashed, one-time-disclosed, usage-tracked, and revocable.

## PostgreSQL scheduling

- `Dockerfile.postgres` builds from PostgreSQL 16.14 Bookworm and compiles `pg_cron` 1.6.7 from a pinned SHA-256 source archive in a disposable builder stage.
- The final database image contains no compiler toolchain.
- Compose preloads `pg_cron`, targets the correct application/test database, and uses background workers rather than local password-bearing libpq connections.
- The migration installs two named jobs:
  - publish due private scheduled posts every minute;
  - delete cron execution history older than 14 days every morning.
- Publication updates visibility, publication time, scheduled time, and Prisma's `updatedAt` field atomically.
- The obsolete externally callable cron route and `CRON_SECRET` were removed.

# Blockers

- The first image build showed that the PostgreSQL runtime image omits server headers. Resolved by installing the matching `postgresql-server-dev-16` package only in the builder stage.
- Initial extension files were copied to legacy `/usr/local` paths, while PostgreSQL 16.14 reports PGDG library/share paths. Resolved by copying to the paths returned by `pg_config`; the database then loaded the extension successfully.
- The first repeated `test:full` launch found a cron worker connected to the configured test database, so the legacy bootstrap could not drop that database. Resolved by making the full-suite orchestrator remove its ephemeral container and volume before startup and use the clean database created by `POSTGRES_DB`, instead of dropping and recreating the database after `pg_cron` starts.

# Verification

- `Dockerfile.postgres` builds successfully from scratch.
- Production, local, and test Compose files render successfully.
- A fresh `openblog_test` database applied all ten Prisma migrations.
- PostgreSQL reported `pg_cron` installed and both named jobs active in `openblog_test`.
- A due private validation post was automatically changed to public by the real background worker on the next minute boundary.
- `pnpm run check` passed after the implementation.
- Production `next build` passed and its route manifest contains no HTTP cron endpoint.
- `pnpm run test:full` passed:
  - 266 unit/component/API tests;
  - 170 real-PostgreSQL integration tests;
  - 200 Chromium E2E tests;
  - 636 passed and 0 failed overall.

# Handoff

- Configure all SMTP values to enable password recovery, or leave every SMTP value empty to disable it intentionally.
- Release automation must publish both the application tags and `postgres-16.14-pg-cron-1.6.7` tag before distributing the updated production Compose file.
- Monitor `cron.job_run_details` for failed scheduled-publication executions after deployment.
