# OpenBlog

A self-hostable, AI-agent-friendly blog platform built on Next.js 16, PostgreSQL, and BetterAuth. Designed as a first-class publishing surface for both humans and machine agents — markdown authoring and a polished dashboard for people, plus a bearer-token REST API, an RSS feed, and a sitemap for software.

- **For humans**: markdown editor, four themes, dashboard, role-based access, server-rendered public pages, and an `Explore` feed.
- **For agents / LLM tools**: a token-authenticated JSON API for creating, listing, updating, and deleting posts; a `/api/render-markdown` preview endpoint; a public sitemap and RSS feed; and first-class TypeScript-friendly error responses.
- **For self-hosters**: a single `docker compose up -d --build` brings up the whole stack. Data stays in your Postgres volume. No external service required.

---

## Table of contents

1. [Quick start (Docker)](#quick-start-docker)
2. [Quick start (local development)](#quick-start-local-development)
3. [API quick start for agents](#api-quick-start-for-agents)
4. [Architecture](#architecture)
5. [Configuration](#configuration)
6. [Common commands](#common-commands)
7. [Data model](#data-model)
8. [Discovery: sitemap, RSS, Open Graph](#discovery-sitemap-rss-open-graph)
9. [Markdown rendering and post format](#markdown-rendering-and-post-format)
10. [Theming](#theming)
11. [Security and authentication](#security-and-authentication)
12. [Operational scripts](#operational-scripts)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)
15. [Project layout](#project-layout)
16. [Contributing and licensing](#contributing-and-licensing)

The deep reference lives in [`docs/api.md`](./docs/api.md) — full request/response shapes, error formats, headers, and role semantics for every route. The product spec is in [`REQUIREMENTS.md`](./REQUIREMENTS.md) and the system design in [`DESIGN.md`](./DESIGN.md).

---

## Quick start (Docker)

Requirements: Docker 23+ (for BuildKit cache mounts) and Docker Compose v2.

OpenBlog ships a **pre-built Docker image** to GitHub Container Registry. You don't need to clone the source repo to run it — just download the compose file (or use `scripts/install.sh`) and point Docker at it.

### Path A — one-line installer (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/IamCoder18/OpenBlog/main/scripts/install.sh | bash
```

The installer:

1. Downloads `docker-compose.yaml` into the current directory.
2. Prompts for `BASE_URL`, `BLOG_NAME`, and admin credentials.
3. Pulls the published image from `ghcr.io/iamcoder18/openblog:latest`.
4. Brings up Postgres + the app, waits for healthy, runs migrations.
5. Bootstraps your admin user and prints the access URL.

Non-interactive form (CI, scripted installs):

```bash
curl -fsSL https://raw.githubusercontent.com/IamCoder18/OpenBlog/main/scripts/install.sh | \
  bash -s -- --non-interactive \
    --base-url "https://blog.example.com" \
    --admin-email "you@example.com" \
    --admin-password "$(openssl rand -base64 24)" \
    --image "ghcr.io/iamcoder18/openblog:v0.1.0"
```

PowerShell equivalent on native Windows:

```powershell
irm https://raw.githubusercontent.com/IamCoder18/OpenBlog/main/scripts/install.ps1 | iex
```

### Path B — manual (clone the repo)

If you'd rather see what you're running:

```bash
git clone https://github.com/IamCoder18/OpenBlog.git openblog && cd openblog

# 1. Set the only two env vars the compose setup actually needs.
cat > .env <<EOF
AUTH_SECRET="$(openssl rand -base64 32)"
BASE_URL="http://localhost:3000"
EOF

# 2. Pull the published image and start the stack
docker compose up -d

# 3. Bootstrap an admin user inside the app container
docker exec -it openblog-app \
  node scripts/create-admin.js you@example.com "Your Name" "S3cureP@ss!"

# 4. Open the app
#    http://localhost:3000
```

That's it. Postgres runs in `openblog-db`, the app in `openblog-app`, and a named volume `openblog_postgres_data` persists the database between restarts.

To stop and remove everything (data volume included):

```bash
docker compose down -v
```

### Building from source

If you're hacking on the codebase (or want to customize `NEXT_PUBLIC_*` values that are baked in at build time), use `docker-compose.local.yaml`:

```bash
docker compose -f docker-compose.local.yaml up -d --build
```

This builds the image from your local `Dockerfile` instead of pulling from the registry. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full dev workflow.

> **Does `docker compose` follow `.env`?** Yes. Compose loads `.env` from the project root automatically and substitutes the variables in `build.args`, `environment`, and `${VAR}` references. After the stack is up, change `.env` then `docker compose up -d --force-recreate app` for new values to take effect.

---

## Quick start (local development)

For local dev against a Postgres-only container (hot reload, debugger, full source access):

```bash
# In the project root
docker compose -f docker-compose.test.yaml up -d
pnpm install
pnpm prisma migrate dev    # creates the test DB schema
pnpm dev                   # http://localhost:4000
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full dev workflow, code conventions, and testing layers.

---

## API quick start for agents

The intended agent flow: mint an API key on first run (`POST /api/keys`), store it securely, then use `Authorization: Bearer ob_<hex>` for every subsequent request. Session cookies are fine for browsers; bearer tokens are what non-browser tools should use.

### 1. Sign up an agent (if `SIGN_UP_ENABLED=true`)

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "S3cureP@ss!",
    "name": "My Agent"
  }'
# Response sets a better-auth.session_token cookie.
# But agents usually skip this — see "Bootstrap via admin" below.
```

For unattended agents the recommended bootstrap is: create an account from a human browser using the login/signup flow once, then mint an API key from the dashboard. If you can't do that, see [Bootstrap via admin](#bootstrap-via-admin) below.

### 2. Sign in (browser) or mint a key

Once signed in via `/auth/login`, mint a long-lived API key:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "production-agent", "expiresInDays": 365}'
```

Response:

```json
{
  "id": "cmr…",
  "name": "production-agent",
  "key": "ob_<64 hex chars>",
  "createdAt": "2026-…Z",
  "expiresAt": "2027-…Z"
}
```

**The `key` field is shown only once.** Store it immediately. List keys later with `GET /api/keys` (the response does not include the key material — only metadata).

### 3. Create a post

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer ob_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello, world",
    "slug":  "hello-world",
    "bodyMarkdown": "# Hello\n\nThis is **markdown**.",
    "visibility": "PUBLIC",
    "seoDescription": "A first post.",
    "tags": ["intro", "meta"]
  }'
```

`POST /api/posts` accepts a bearer key. `PUT` and `DELETE` on `/api/posts/:slug` currently require a BetterAuth session cookie — agents that need to update existing posts should sign in once and reuse the session token. (See [docs/api.md](./docs/api.md) for the exact auth requirements per endpoint.)

### 4. List posts

```bash
curl "http://localhost:3000/api/posts?limit=10&visibility=PUBLIC" \
  -H "Authorization: Bearer ob_<your-key>"
```

Authenticated requests widen the visibility filter to include `PRIVATE`, `UNLISTED`, and `DRAFT` posts across all authors. Add `&authorId=me` to scope to your own posts.

### 5. Render markdown (preview, no persistence)

```bash
curl -X POST http://localhost:3000/api/render-markdown \
  -H "Authorization: Bearer ob_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello\n\n**bold** *italic*"}'
# → { "html": "<h1>Hello</h1>\n<p><strong>bold</strong> <em>italic</em></p>" }
```

### Bootstrap via admin

If your deployment has `SIGN_UP_ENABLED=false`, create an agent account with a script:

```bash
docker exec -it openblog-app \
  node scripts/create-admin.js agent@example.com "My Agent" "S3cureP@ss!"
```

By default this creates the user with the `ADMIN` role (the script's name is historical — it both creates and promotes). For non-admin agents, sign in once via the browser, mint a key, and you're set.

For the full reference (every header, every error format, every auth nuance) see [`docs/api.md`](./docs/api.md).

---

## Architecture

```
┌─────────────────────────────────────┐
│           Next.js 16 (app)          │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  Server      │  │   Client     │  │
│  │  - API       │  │   - Pages    │  │
│  │  - SSR       │  │   - Editor   │  │
│  │  - Prisma    │  │   - Themes   │  │
│  └──────┬───────┘  └──────────────┘  │
│         │                             │
│    ┌────▼──────┐                      │
│    │  Prisma   │                      │
│    └────┬──────┘                      │
└─────────┼──────────────────────────────┘
          │
   ┌──────▼───────┐
   │  PostgreSQL  │
   └──────────────┘
```

- **Next.js 16** with the App Router, running in `output: "standalone"` mode for the Docker image.
- **Prisma 7** for database access, with `@prisma/adapter-pg` and a custom generator output under `src/lib/prisma/`.
- **BetterAuth** for sessions and credential auth, with a Postgres-backed credential provider.
- **PostgreSQL 16** in a separate container.
- **pnpm 9** with BuildKit-cached `node_modules` in the Docker build.

The Dockerfile is three-stage: `fetcher` (cached `pnpm install`) → `builder` (Prisma generate + `next build`, cached `.next/cache`) → `runner` (minimal standalone image with `pnpm prune --prod`, no devDeps).

---

## Configuration

All configuration is via environment variables. Compose reads `.env` from the project root automatically. Only **two vars are strictly required**:

| Variable      | Why                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET` | BetterAuth signing key. Generate with `openssl rand -base64 32`. Never reuse between environments. Injected at container start — never baked into the Docker image. |
| `BASE_URL`    | Public-facing URL the app is served from. Used by BetterAuth's `trustedOrigins` and the sitemap. Set to the URL you actually reach the app from.                    |

Full list of vars (with defaults) in [`.env.example`](./.env.example).

### Why are `BASE_URL` / `BLOG_NAME` also exposed as `NEXT_PUBLIC_*`?

Next.js **inlines `NEXT_PUBLIC_*` environment variables into the client JavaScript bundle at build time** — they become literal string constants in the browser code. Unprefixed vars are only readable on the server (route handlers, server components, `getServerSideProps`-style contexts).

| Form                    | Where it's read                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `BASE_URL`              | Server: BetterAuth `trustedOrigins`, sitemap generation, RSS feed URLs                   |
| `NEXT_PUBLIC_BASE_URL`  | Client: client-side fetch helpers (e.g. `/explore`, `/blog/[slug]`), OpenGraph fallbacks |
| `BLOG_NAME`             | Server: RSS `<title>`, sitemap metadata                                                  |
| `NEXT_PUBLIC_BLOG_NAME` | Client: `<title>`, nav, footer, OpenGraph tags                                           |

The compose file passes both forms automatically, so **you only ever set `BASE_URL` and `BLOG_NAME`**. After a build, changing either form requires a new image because `NEXT_PUBLIC_*` is baked into the static bundle. To change `BASE_URL` / `BLOG_NAME` without rebuilding, patch `src/lib/config.ts` to fall back to the unprefixed var at runtime (this is already done in `config.ts` as of the latest version).

### Optional knobs

| Variable                | Default         | Purpose                                                                                                |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `BLOG_NAME`             | `OpenBlog`      | Display name in titles, nav, footer, RSS.                                                              |
| `NEXT_PUBLIC_BLOG_NAME` | `OpenBlog`      | Same, inlined for the client.                                                                          |
| `SIGN_UP_ENABLED`       | `false`         | When `true`, `/auth/signup` is open to the public. Off by default — create users via the admin script. |
| `DISABLE_RATE_LIMITING` | `false`         | Disables BetterAuth rate limiting. Used by E2E tests; do not enable in production.                     |
| `DATABASE_URL`          | compose default | Postgres connection string. Hardcoded in `docker-compose.yaml`; override per environment.              |
| `PORT`                  | `3000`          | Port the Next.js standalone server listens on inside the container.                                    |
| `NODE_ENV`              | `production`    | Set to `development` only when running `pnpm dev` outside Docker.                                      |

---

## Common commands

| Command                                                      | What it does                                            |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `docker compose up -d --build`                               | Build the image and start the stack                     |
| `docker compose logs -f app`                                 | Tail app logs                                           |
| `docker compose down -v`                                     | Tear down stack + delete Postgres volume                |
| `pnpm dev`                                                   | Local dev server (port 4000)                            |
| `pnpm build`                                                 | Production build (standalone)                           |
| `pnpm start`                                                 | Serve the production build                              |
| `pnpm check`                                                 | Lint + format check + TypeScript typecheck              |
| `pnpm lint:fix`                                              | Auto-fix lint errors                                    |
| `pnpm format:fix`                                            | Format with oxfmt                                       |
| `pnpm test:unit`                                             | Vitest unit tests                                       |
| `pnpm test:full`                                             | Unit + integration + E2E (orchestrated)                 |
| `pnpm prisma migrate dev`                                    | Create + apply a new migration (dev)                    |
| `pnpm prisma migrate deploy`                                 | Apply pending migrations (prod / entrypoint)            |
| `docker exec openblog-app npx prisma migrate deploy`         | Same, from inside the running container                 |
| `pnpm run promote-admin -- <email>`                          | Promote an existing user to `ADMIN`                     |
| `docker exec openblog-app node scripts/create-admin.js …`    | Bootstrap a user (creates with `ADMIN` role by default) |
| `docker exec openblog-app node scripts/change-password.js …` | Reset a user's password                                 |

---

## Data model

The full schema is in [`prisma/schema.prisma`](./prisma/schema.prisma). Summary:

| Model          | Purpose                                                    | Notable fields                                                               |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `User`         | Account identity                                           | `email` (unique), `emailVerified`, `name`                                    |
| `UserProfile`  | 1:1 with User, holds the role                              | `role`: `ADMIN \| AUTHOR \| AGENT \| GUEST`                                  |
| `Account`      | Provider credentials (BetterAuth)                          | `providerId`, `password`, `accessToken`, etc.                                |
| `Session`      | BetterAuth session                                         | `token`, `expiresAt`, `ipAddress`, `userAgent`                               |
| `Verification` | Email-verification tokens                                  |                                                                              |
| `ApiKey`       | Long-lived bearer tokens                                   | `key` (`ob_<64 hex>`), `name`, `expiresAt`                                   |
| `Post`         | A blog post                                                | `slug`, `bodyMarkdown`, `visibility`, `publishedAt`, tags via `PostMetadata` |
| `PostMetadata` | 1:1 with Post                                              | `seoDescription`, `coverImage`, `tags: String[]`                             |
| `SiteSettings` | Key/value app config (theme, fuzzy-search threshold, etc.) | `key`, `value`                                                               |
| `PageView`     | Hash-IP page-view log for analytics                        | `path`, `referrer`, `userAgent`, `ipHash`, `postId`                          |

Visibility on `Post`:

- `PUBLIC` — indexed, listed in feeds/sitemaps, visible to anonymous readers.
- `UNLISTED` — served at its URL but not listed anywhere public.
- `PRIVATE` — only visible to its author and admins.
- `DRAFT` — only visible to its author.

---

## Discovery: sitemap, RSS, Open Graph

OpenBlog publishes machine-readable discovery surfaces that work without authentication:

| URL                      | Format      | Contents                                                           |
| ------------------------ | ----------- | ------------------------------------------------------------------ |
| `GET /sitemap.xml`       | XML         | All `PUBLIC` posts with `<lastmod>` dates.                         |
| `GET /feed.xml`          | RSS 2.0 XML | 20 most recent `PUBLIC` posts (title, link, pubDate, description). |
| `GET /blog/<slug>`       | HTML        | Public post view with OpenGraph + Twitter Card meta.               |
| `GET /api/posts?limit=…` | JSON        | Public list of posts; auth widens visibility.                      |

The sitemap and feed honor `BASE_URL` for absolute URLs, so set `BASE_URL` to your real domain in production.

---

## Markdown rendering and post format

Posts are stored as `bodyMarkdown` (source) and `bodyHtml` (rendered). The renderer uses `marked` for Markdown, plus:

- **`shiki`** for syntax-highlighted code blocks.
- **`isomorphic-dompurify`** to sanitize the rendered HTML.
- **`katex`** for LaTeX math (inline `$...$` and block `$$...$$`).
- A custom slugger that derives a URL-safe `slug` from the title if you don't supply one.

When you call `POST /api/posts`, the server re-renders `bodyMarkdown` → `bodyHtml` for you. If you want to preview without persisting, call `POST /api/render-markdown` directly.

Cover images are referenced by URL only — the API doesn't host uploads in this version. Host your assets on any public CDN and put the URL in `coverImage`.

---

## Theming

Four preset themes ship in the box: **`default`**, **`ocean`**, **`forest`**, **`ember`**. Themes are stored in `SiteSettings.theme` and switched at runtime.

- Read: `GET /api/settings/theme` → `{ "theme": "default" }`
- Change: `PUT /api/settings/theme` with `{ "theme": "ocean" }` (**ADMIN only**).
- Or change from the UI: `/dashboard/settings`.

The active theme is also resolved at request time via `getTheme()` in `src/lib/config.ts:34` with a `try/catch` fallback to `default` so the build never breaks if the DB is unreachable.

---

## Security and authentication

### Auth providers

- **Email + password** (BetterAuth credential provider). Sessions are cookie-based (`better-auth.session_token`). Sessions last 7 days and refresh after 1 day.
- **API keys** (`Authorization: Bearer ob_<hex>`). Accepted on the handful of endpoints that take machine clients; not a replacement for session-based auth.

### Role hierarchy

`ADMIN` > `AUTHOR` > `AGENT` > `GUEST`. Restrictions are enforced in route handlers — there is no global role middleware. See [`docs/api.md`](./docs/api.md) for the per-endpoint role requirements.

A logged-in user can self-promote between `AGENT` and `AUTHOR` only via `POST /api/profile/role`. Only an `ADMIN` can grant `ADMIN` itself. (There is a `POST /api/admin/set-role` endpoint that can set any role by email — it's used by the E2E test suite and is **not production-hardened**. Disable or gate it before any non-test deploy.)

### Rate limiting

BetterAuth's rate limiter is on by default. To disable (e.g. during local testing or stress tests) set `DISABLE_RATE_LIMITING=true`.

### Trusted origins

`src/lib/auth.ts` declares an explicit list of trusted origins for CORS / CSRF. Add new origins there when deploying behind a new domain.

### Secret rotation

Rotating `AUTH_SECRET` invalidates all existing sessions and API keys. Plan for this:

- BetterAuth won't auto-revoke stored keys; old keys with old signatures become unverifiable.
- Users will be silently signed out; they'll need to re-authenticate.

### Images, IP, analytics

`POST /api/analytics` stores a **hash of the visitor's IP**, not the raw IP. No PII is collected by default. See [`docs/api.md`](./docs/api.md) for what's stored.

---

## Operational scripts

All scripts live under [`scripts/`](./scripts/). They read `DATABASE_URL` from the current shell, so from outside the container:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openblog?schema=public \
  node scripts/create-admin.js email name password
```

Or from inside the running container:

```bash
docker exec -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/openblog?schema=public" \
  openblog-app \
  node scripts/create-admin.js email name password
```

| Script                                  | Purpose                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `create-admin.js`                       | Create a user; default role `ADMIN`. Historical name — it both creates and promotes.        |
| `change-password.js`                    | Reset a user's password to a new value.                                                     |
| `promote-admin.js` / `promote-admin.ts` | Promote an existing user to `ADMIN`. Same script in two formats.                            |
| `create-and-promote-admin.js`           | Idempotent: create if missing, promote if not.                                              |
| `entrypoint.sh`                         | Runs on container start: `npx prisma migrate deploy && node server.js`.                     |
| `test-full.sh`                          | Orchestrates the unit + integration + E2E test suite against a Postgres-only compose stack. |

---

## Deployment

### Ports

The default compose maps host `3000` → container `3000` (app) and `5432` → `5432` (Postgres). Override in `.env` if either host port is already in use:

```bash
# .env
APP_HOST_PORT=3300          # default 3000
POSTGRES_HOST_PORT=15432    # default 5432
```

Both compose files read these vars; the `APP_HOST_PORT=3300` example above binds the app to host port 3300. The container-internal `DATABASE_URL` stays pointed at the in-network Postgres on `5432`.

### Image pinning

The default image is `ghcr.io/iamcoder18/openblog:latest`. Pin to a version for production:

```bash
# .env
OPENBLOG_IMAGE=ghcr.io/iamcoder18/openblog:v0.1.0
```

Then `docker compose up -d --force-recreate app` to pull and restart.

### Publishing a release

A single combined workflow (`.github/workflows/publish.yml`) handles everything: lint, version resolution, image build, GHCR push, and GitHub Release creation.

#### Path A — manual run (Actions tab)

Go to Actions → `publish` → Run workflow. Pick:

- **`version_bump`** — `patch` (default), `minor`, `major`, or `none` (re-publish current version).
- **`custom_version`** — optional. e.g. `1.2.3` or `2.0.0-rc.1`. Overrides the bump selector. Leave empty to use the bump selector.

The workflow computes the new version, builds and pushes the image, creates the git tag, and creates the GitHub Release page.

#### Path B — push a tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow uses the tag you pushed verbatim, builds + pushes the image, and creates the Release page at <https://github.com/IamCoder18/OpenBlog/releases/tag/v0.1.0>.

#### Resulting image tags

For any release of `v0.1.0`:

```
ghcr.io/iamcoder18/openblog:v0.1.0
ghcr.io/iamcoder18/openblog:0.1
ghcr.io/iamcoder18/openblog:0
ghcr.io/iamcoder18/openblog:latest   # only for stable releases
```

`latest` is auto-managed by `docker/metadata-action` (`flavor: latest=auto`): it's moved by stable releases on default branch and by stable tag pushes. **Pre-release tags** (anything with a hyphen, e.g. `v0.2.0-rc.1`) are automatically marked as pre-release on GitHub and **do not** bump `latest`.

**First-time setup** (one-time, on the GHCR side):

1. After the first workflow run, go to <https://github.com/IamCoder18/OpenBlog/pkgs/container/openblog>.
2. Package settings → Change visibility → **Public** (so anonymous pulls work).
3. Repo Settings → General → Workflow permissions → "Read and write permissions" (so the release step can create the GitHub Release).
4. No PAT or extra secret needed — `GITHUB_TOKEN` already has `packages: write` and `contents: write`.

### Reverse proxy

Put Caddy / nginx / Cloudflare in front of the app and set `BASE_URL` to the public origin. Add that origin to `trustedOrigins` in `src/lib/auth.ts`. The app binds to `0.0.0.0:3000` inside the container — no special config needed.

### Production env

Set the following and nothing else (everything else has a default that works):

```bash
AUTH_SECRET="$(openssl rand -base64 32)"
BASE_URL="https://blog.example.com"
```

### Backups

Postgres data lives in the `openblog_postgres_data` named volume. For a cold snapshot:

```bash
docker run --rm \
  -v openblog_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/pg-cold.tgz /data
```

For a hot logical backup with `pg_dump`:

```bash
docker exec openblog-db pg_dump -U postgres openblog > backup.sql
```

### Upgrades

When pulling a new image:

```bash
docker compose pull app
docker compose up -d --force-recreate app
```

Migrations run automatically via `entrypoint.sh`. Roll back by pinning to the previous image tag.

---

## Troubleshooting

### `port is already allocated` on `docker compose up`

Another process is binding the host port the compose stack needs (3000 for the app, 5432 for Postgres by default). Either stop the conflicting process, or override the host port via `docker-compose.override.yaml` (see [Deployment](#deployment)).

### First build is slow / network-heavy

`pnpm install` runs on first build, then is cached. Subsequent builds without lockfile changes reuse the cached store via the BuildKit `--mount=type=cache,id=pnpm,target=/pnpm/store` (requires Docker 23+). Make sure BuildKit is enabled (it's the default on Docker 23+; otherwise `DOCKER_BUILDKIT=1 docker compose build`).

### `prisma migrate deploy` fails with "datasource.url is required"

The runner image needs `prisma.config.ts` at `/app` to read `DATABASE_URL`. If you've customized the Dockerfile and accidentally dropped the `COPY prisma.config.ts ./prisma.config.ts` line in the runner stage, add it back.

### `AUTH_SECRET must be set` from compose

`.env` is missing the var, or compose can't read it (wrong path, file permissions). Confirm with `docker compose config | grep AUTH_SECRET`.

### Sign-in returns 200 but the next request 401s

Either the cookie isn't being sent (CORS / `Origin` mismatch), or `BASE_URL` doesn't match the origin you're calling from. The `trustedOrigins` list in `src/lib/auth.ts` controls what's accepted; add new origins there when you front the app with a new domain.

### Browser code references `http://localhost:3000` instead of my real domain

`NEXT_PUBLIC_BASE_URL` is inlined into the client bundle at build time. Rebuild the image after changing it.

### Migrations fail with "relation already exists"

You probably ran `migrate dev` and `migrate deploy` against the same DB. Reset with `pnpm prisma migrate reset --force` in dev, or for prod restore from the backup you (hopefully) took before upgrading.

---

## Project layout

```
openblog/
├── .github/
│   └── workflows/
│       └── publish.yml         # GH Actions: lint + version + build + push + release
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # HTTP routes (see docs/api.md)
│   │   ├── auth/            # /auth/login, /auth/signup
│   │   ├── dashboard/       # Authenticated app (posts, account, settings)
│   │   ├── agent/           # API-key-centric UI
│   │   ├── blog/            # Public post pages
│   │   ├── feed.xml/        # RSS route
│   │   └── sitemap.ts       # XML sitemap
│   ├── lib/
│   │   ├── auth.ts          # BetterAuth config (trustedOrigins, secret, rate limits)
│   │   ├── db.ts            # Prisma client + pg adapter
│   │   ├── config.ts        # Runtime env getters (BASE_URL, BLOG_NAME, AUTH_SECRET, ...)
│   │   ├── api-error.ts     # Route handler error wrapper
│   │   └── prisma/          # Generated Prisma client (do not edit)
│   └── __tests__/           # Vitest unit tests + Playwright E2E
├── prisma/
│   ├── schema.prisma        # Data model
│   └── migrations/          # SQL migrations (committed)
├── scripts/                 # Operational scripts (create-admin, promote-admin, install.sh, install.ps1, ...)
├── docs/
│   └── api.md               # Full HTTP API reference
├── sessions/                # Agent session notes (audit trail)
├── Dockerfile               # Three-stage build (fetcher → builder → runner). Builds with zero required args.
├── docker-compose.yaml      # Production compose: pulls published image from ghcr.io.
├── docker-compose.local.yaml# Dev compose: builds from local Dockerfile.
└── docker-compose.test.yaml # Test-only Postgres
```

---

## Contributing and licensing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, code conventions, and testing layers. PRs welcome — work in [`REQUIREMENTS.md`](./REQUIREMENTS.md) backlog or labeled `good first issue`.

License: TBD — see repo metadata.

---

<sub>README last reviewed alongside the security and correctness pass on 2026-06-29. See `sessions/2026-06-27_docker-setup-audit.md` for the audit trail of the changes that produced this version.</sub>
