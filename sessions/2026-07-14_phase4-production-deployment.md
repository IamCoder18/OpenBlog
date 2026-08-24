# Session Metadata

- **Date:** 2026-07-14
- **Phase:** 4
- **Description:** Deploy the production-ready OpenBlog stack on the current host at `192.168.1.83:9922`.

# Task Status

## Completed

- Identified the current machine as the requested deployment target and TCP port `9922` as the application listener.
- Removed the stopped legacy OpenBlog containers and explicitly discarded the old `openblog_postgres_data` volume at the user's request.
- Generated an ignored, mode-`0600` production `.env` with deployment-specific authentication and PostgreSQL secrets.
- Built the exact workspace into local production application and PostgreSQL 16 + pg_cron images.
- Corrected the production image's operational-script packaging and updated installer/documentation commands to execute the TypeScript utilities through the retained `tsx` runtime.
- Corrected the application health check to use IPv4 explicitly because Alpine resolves `localhost` to IPv6 while the standalone server listens on IPv4.
- Removed the hard-coded production PostgreSQL password from production/local Compose and made a generated deployment-specific password mandatory.
- Updated both installers to generate the PostgreSQL password automatically.
- Created a final fresh database volume after the credential hardening change.
- Started the production Compose stack with `unless-stopped` restart policies.
- Applied all ten database migrations and activated both pg_cron jobs.
- Exposed the application on `0.0.0.0:9922` and kept PostgreSQL restricted to `127.0.0.1:5432`.

## In Progress

- None.

# Architecture & Logic

- Use `docker-compose.yaml` for production runtime isolation while overriding its registry image names with the exact locally built `openblog:production-local` and `openblog-postgres:production-local` images.
- Use `http://192.168.1.83:9922` as `BASE_URL`, matching the actual LAN origin accepted by BetterAuth.
- Keep public signup disabled by default. The fresh deployment intentionally has no users until an administrator is bootstrapped with an explicit email and password.
- Leave all SMTP variables empty. The application remains operational while its password-recovery page presents recovery as unavailable.
- Require `POSTGRES_PASSWORD` in production and local Compose. Installer-generated hexadecimal credentials are URL-safe when interpolated into `DATABASE_URL`.
- Preserve all other Compose projects and host services; only the `openblog` project was removed or recreated.

# Blockers

- Initial SSH attempts failed because `192.168.1.83:9922` was first interpreted as a remote SSH target. The user clarified that this is the current machine and `9922` is the desired application port, eliminating the need for SSH.
- The first application image build failed because the runner copied nonexistent compiled `.js` administration scripts. Resolved by packaging the source `.ts` utilities and invoking them through production dependency `tsx`.
- Docker initially marked the live application unhealthy because BusyBox resolved `localhost` to `::1`. Resolved by probing `127.0.0.1` explicitly.
- Production Compose retained a default PostgreSQL password. Resolved by making a generated 256-bit hexadecimal password mandatory, updating installers/docs, and recreating the still-empty database volume.

# Verification

- Application image and checksum-pinned PostgreSQL 16.14 + pg_cron 1.6.7 image built successfully.
- Both `openblog-app` and `openblog-db` report Docker health status `healthy` and restart policy `unless-stopped`.
- Application binding: IPv4 and IPv6 host port `9922` to container port `3000`.
- Database binding: loopback-only host port `127.0.0.1:5432`.
- Fresh database contains ten successful migrations, zero users, and zero posts.
- PostgreSQL reports pg_cron 1.6 with active `openblog-publish-scheduled-posts` and `openblog-prune-cron-history` jobs.
- Runtime authentication secret is 64 characters; PostgreSQL uses a non-default 64-character deployment-specific credential.
- `/`, `/api/health`, `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/auth/login`, and `/auth/forgot-password` return HTTP 200 through `http://192.168.1.83:9922`.
- Recent application logs contain no error, fatal, or panic entries.
- The packaged `create-admin.ts` utility executes and returns its expected usage validation when invoked without arguments.
- `pnpm run format:fix`, `pnpm run check`, `bash -n scripts/install.sh`, and `git diff --check` pass.

# Handoff

- OpenBlog is live at `http://192.168.1.83:9922`.
- Bootstrap the first administrator with an explicit email, display name, and strong password using the packaged `create-admin.ts` utility.
- Configure all SMTP variables together if password recovery is required; leaving every SMTP value empty is a supported state.
- For internet exposure, place a TLS reverse proxy in front of the service and update `BASE_URL` to the final HTTPS origin.
