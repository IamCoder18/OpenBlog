# 2026-06-27 — Docker Setup Audit & Fixes

## Session Metadata
- **Date:** 2026-06-27
- **Scope:** Audit and repair Docker build pipeline, especially build-time env handling and build performance.

## Findings (Audit)

### Critical — Build-time envs

1. **`NEXT_PUBLIC_*` vars never set during `next build`.** Next.js inlines `NEXT_PUBLIC_*` env vars into the client bundle at build time. The Dockerfile declares only `ARG DATABASE_URL` and the compose file only sets `BASE_URL` (not `NEXT_PUBLIC_BASE_URL`) and `BLOG_NAME` (not `NEXT_PUBLIC_BLOG_NAME`). Result: in the running image, browser code referencing `process.env.NEXT_PUBLIC_BASE_URL` / `process.env.NEXT_PUBLIC_BLOG_NAME` resolves to `undefined`, falling back to `http://localhost:3000`. Broken surface area:
   - `src/app/explore/page.tsx:42` (client fetch)
   - `src/app/blog/[slug]/page.tsx:42` (client fetch)
   - `src/app/sitemap.ts` (via `config.BASE_URL`)
   - `src/lib/config.ts` (`BLOG_NAME` getter)
2. **`AUTH_SECRET` not propagated to the build stage.** Not strictly required for the current codebase (BetterAuth reads it at request time), but it should be available so any future SSG that touches auth gets a stable value rather than `undefined`.
3. **`AUTH_SECRET` falls back to `change-me-in-production` in compose.** Silent insecure default; should fail loudly.

### High — Hardcoded values

4. **`BASE_URL: http://192.168.1.82:4581` hardcoded** in `docker-compose.yaml:39`. Breaks any deployment that isn't on the LAN at that IP. Should be parameterized.

### Medium — Build performance

5. **`npm install -g pnpm@9` re-downloads on every build.** `corepack enable` ships with `node:22-alpine` and honors `packageManager` from `package.json5` — no network call, no cache invalidation.
6. **No BuildKit cache mounts.** pnpm store and `.next/cache` are re-downloaded/recomputed on every build even when the lockfile is unchanged.
7. **`COPY . .` invalidates the entire dependency layer** when any source file changes — but the deps stage already isolates this correctly, so the only repeated work is the install when lockfile or image hash changes. Cache mount eliminates even that.
8. **Runner copies unused `src/`.** With `output: 'standalone'` the runtime needs only `server.js`, `.next/static`, `public/`, `prisma/`, and `node_modules` (for `serverExternalPackages: ["pg"]` + the Prisma client). Dropping `src/` shaves a meaningful chunk.
9. **No `prisma generate` declared in the build stage.** It runs implicitly via Next.js tracing (since the generator outputs into `src/lib/prisma`), but the .dockerignore and build order make this fragile. Better to declare it explicitly.

## Architecture & Decisions

- **Keep three stages** (deps → builder → runner) but split deps into `fetcher` (offline-friendly) and pass results into `builder`.
- **Use `corepack enable`** instead of `npm install -g pnpm@9` — saves network and cache churn.
- **Use BuildKit `RUN --mount=type=cache`** for `/pnpm/store` and `/app/.next/cache`. Requires BuildKit (default on Docker 23+, Docker Desktop, Buildx).
- **Promote `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_BLOG_NAME`, `AUTH_SECRET` to build args** so they're baked into the bundle.
- **Drop `BASE_URL` build arg** — only the `NEXT_PUBLIC_*` form matters for client code, and server code reads the runtime env. Keeping both is harmless but redundant.
- **Parameterize `BASE_URL`** in compose via `${BASE_URL:?}` so the user is forced to set it (with a documented default).
- **Drop `src/` from the runner stage.** Standalone mode traces the source tree, so the bundled output already includes the necessary code.
- **`pnpm prune --prod` in the builder** before copying to the runner. `prisma` is in `dependencies` (not devDependencies), so the CLI survives the prune and `entrypoint.sh`'s `npx prisma migrate deploy` keeps working.

## Verification

- `pnpm run check` — lint + format + typecheck.
- Manual inspection: `docker compose build` should complete with cached pnpm store + next cache after the first build.

## Issues uncovered by end-to-end test (2026-06-27)

Three additional breakage points surfaced when actually building and running the image in a scratch folder. All fixed in this iteration:

### 1. Corepack picked the wrong pnpm version

The fetcher/builder stages ran `corepack enable` and immediately invoked `pnpm`. Corepack had a cached `pnpm@11.9.0` and used it instead of fetching the `packageManager`-pinned `pnpm@9.15.0`. pnpm then refused to run because the on-disk version (11.9.0) didn't match the pinned version (9.15.0). The error message points at a non-existent `devEngines.packageManager` field.

Fix: explicitly activate the pinned version in both stages:

```dockerfile
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
```

### 2. `prisma migrate deploy` failed: "datasource.url property is required"

Prisma 7 reads the datasource URL from `prisma.config.ts` (which uses `dotenv/config` to load `.env` and picks `TEST_DATABASE_URL` or `DATABASE_URL`). The Dockerfile wasn't copying that file into the runner image.

Fix: `COPY --from=builder /app/prisma.config.ts ./prisma.config.ts` in the runner stage. dotenv is in `dependencies` so it survives the prod prune; `process.env.DATABASE_URL` is already set on the container so dotenv has nothing to add.

### 3. Standalone scripts (`create-admin.js`, etc.) couldn't find the Prisma client

The scripts do `require("../src/lib/prisma/index.js")`. The Prisma generator outputs to `src/lib/prisma/` by config (`output = "../src/lib/prisma"` in `schema.prisma`). Next.js standalone mode bundles the generated client into `server.js`, so the app runs without it on disk — but the standalone scripts do need it.

Fix: `COPY --from=builder /app/src/lib/prisma ./src/lib/prisma` in the runner stage. ~10 MB of generated client (including the WASM query engine binaries). Not ideal — future cleanup would move the generator output to `node_modules/.prisma/client` and rewrite the scripts to `require("@prisma/client")`.

## Documentation pass (2026-06-27)

README was the default `create-next-app` boilerplate — completely wrong for this project. Replaced.

| File                | Change                                                                                  |
|---------------------|-----------------------------------------------------------------------------------------|
| `README.md`         | Full rewrite. Inline-env quick start (no `cp`, no `echo … >>`), explains `NEXT_PUBLIC_*` vs plain envs, deployment notes with port-override guidance, links to `docs/api.md` / `CONTRIBUTING.md`. |
| `docs/api.md`       | New. Full API reference: routes, request/response shapes, auth, roles, scripts.         |
| `CONTRIBUTING.md`   | New stub. Dev setup, code conventions, testing layers, PR/commit conventions.          |
| `.env.example`      | Reorganized into Required / Optional / Local-dev-only. Removed dead `BOOTSTRAPPED_ADMIN_PASSWORD` and `TEST_BASE_URL`. Simplified to match the inline-env quick start. |
| `docker-compose.yaml` | Standardized ports to standard defaults (`3000:3000` for app, `5432:5432` for Postgres) with override instructions. Removed `AUTH_SECRET` from build args (see Security pass below). |

### Post-inconsistencies cleaned up

- Port `5332` in `.env.example` → `5432` (typo).
- Port `4581` in `docker-compose.yaml` → `3000` (random dev port → Next.js standard).
- Port `5438` in `docker-compose.yaml` → `5432` (Postgres standard) with note about local conflicts.
- `BOOTSTRAPPED_ADMIN_PASSWORD` referenced in `.env.example` but not implemented anywhere in the codebase → removed.
- `TEST_BASE_URL` documented but never read by any Playwright config or test helper → removed.
- `AUTH_SECRET` and `BASE_URL` documented as required for Docker builds (compose's `${VAR:?…}` will fail without them, so users need to know).
- README no longer claims `pnpm run dev` → port 3000 (it's actually 4000) and no longer mentions `yarn` / `bun` (not configured).
- README no longer references the Geist font or the Vercel-first deployment flow.

## Security & correctness pass (2026-06-29)

A local review surfaced 3 CRITICAL items and 9 WARNINGs. All addressed:

### CRITICAL

1. **`AUTH_SECRET` baked into Docker image layers** (`Dockerfile` + `docker-compose.yaml`).
   Both files were forwarding the host's signing secret as a build `ARG` + `ENV`, which is persisted into the image and recoverable via `docker history` / `docker inspect` / any registry pull.
   - Removed `ARG AUTH_SECRET` from `Dockerfile`.
   - Removed `AUTH_SECRET=${AUTH_SECRET}` from the builder `ENV` block.
   - Removed `AUTH_SECRET` from `docker-compose.yaml` `build.args`.
   - The runtime `AUTH_SECRET: ${AUTH_SECRET:?…}` in `compose.environment` is preserved — that is the only place it needs to be.
   - Verified post-fix: `docker history dockerverify-app:latest | grep AUTH_SECRET` → empty; `docker inspect … .Config.Env | grep AUTH_SECRET` → empty; runtime container has the value via `docker inspect … .Config.Env` (start-time injection only).
2. **`.env.example` was gitignored** (`.gitignore:41`: `.env*`).
   `cp .env.example .env` in the README quick start would have failed on a fresh clone because the file was being excluded.
   - Added `!.env.example` immediately after the `.env*` glob.
   - Committed file ships with the repo.
3. *(The third CRITICAL — duplicate env keys from `echo >> .env` — was obviated by the README rewrite below.)*

### WARNINGS

4. **`pnpm` BuildKit cache mount was mounted at the wrong path.**
   `--mount=type=cache,id=pnpm,target=/pnpm/store` was ineffective because pnpm's store-dir defaults to `~/.local/share/pnpm/store/v3`. `.npmrc` had no `store-dir` line.
   - Added `store-dir=/pnpm/store` to `.npmrc`. Picked up by every `pnpm` invocation; the cache mount now actually persists the dep store across builds.
5. **`GET /api/keys` was leaking the full API key on every list call** (`src/app/api/keys/route.ts:24` selected `key: true`). This is both a doc bug and a real security regression.
   - Removed `key: true` from the GET handler's `select`. Now only `id`, `name`, `createdAt`, `expiresAt` are returned on list. The POST handler still returns the key once on creation (correct).
   - Verified: `grep '"key":"ob_' list-response` → no match.
6. **`BASE_URL` runtime env was silently ignored.**
   `src/lib/config.ts` only read `process.env.NEXT_PUBLIC_BASE_URL`. An operator changing `BASE_URL` after build saw no effect on BetterAuth `trustedOrigins` or the sitemap.
   - Updated getters: now `process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "<default>"` (and same for `BLOG_NAME`). Runtime overrides work without rebuild.
7. **README quick start was 5 steps and used `cp` + `echo >>` (duplicate keys) + `docker compose logs -f` + `open http://...`.**
   Replaced with a 4-step flow:
   ```
   cat > .env <<EOF
   AUTH_SECRET="$(openssl rand -base64 32)"
   BASE_URL="http://localhost:3000"
   EOF
   docker compose up -d --build
   docker exec -it openblog-app node scripts/create-admin.js …
   ```
   - `cp` removed — `.env` is generated inline.
   - `echo … >> .env` removed — single `cat > .env` heredoc writes the file once with no duplicates.
   - `docker compose logs -f app` step removed (cumulative wait — operators can run it manually if curious).
   - `open http://…` step removed (macOS-only; not portable).
   - Added an inline note: *"If you're not accessing the app at http://localhost:3000, edit BASE_URL in `.env` before starting."*
8. **`docs/api.md` made several false claims about the API.**
   Corrected:
   - `limit` defaults to **10**, no hard upper bound (was: 20, max 100).
   - Auth widening for visibility filter reveals **`PRIVATE/UNLISTED/DRAFT` posts across all authors** with no ownership filter (was: "posts the caller owns").
   - API keys are accepted on **`POST /api/posts` only**; `PUT`/`DELETE /api/posts/:slug` require a session (was: keys accepted on all content writes).
   - `DELETE /api/posts/:slug` allows **`ADMIN` or the post's author**; non-admin, non-author users are rejected (was: "any authenticated non-GUEST user").
   - `visibility` and `tag` query params are **single-value**; only the first `?tag=a&tag=b` is read (was: marked "(repeatable)").
9. **README explained `NEXT_PUBLIC_*` vs plain envs** with a table showing where each form is consumed (server vs client), and noted that the compose file derives `NEXT_PUBLIC_*` from the plain forms so the operator only ever sets `BASE_URL` / `BLOG_NAME`.
10. **Deployment-port conflict guidance** added: README now shows the `docker-compose.override.yaml` snippet for the common "I already have a Postgres on 5432" case, and adds a "Migrating from older versions" note for operators previously on `5438`/`4581`.

## End-to-end re-verification (2026-06-29)

Built and deployed in scratch folder `~/docker-verify-*` (no `.env` present except for the heredoc-generated one). All checks passed:

- `docker compose up -d --build` → image built, both containers up.
- `curl localhost:3300/` (host had port 3000 taken; used `sed` to remap to 3300:3000 in the test compose) → HTTP 200.
- `GET /api/posts`, `/sitemap.xml`, `/feed.xml`, `/explore` → all HTTP 200.
- `node scripts/create-admin.js …` → `Created admin user … (ADMIN)`.
- `psql` → `email=admin@verify.local, role=ADMIN`.
- `POST /api/auth/sign-in/email` → session cookie set.
- `GET /api/profile` with cookie → `{ user.profile.role: "ADMIN" }`.
- `POST /api/keys` → returns full key once (correct).
- `GET /api/keys` → no `"key":"ob_…` substring present (security fix verified).
- `docker history … | grep AUTH_SECRET` → empty (security fix verified).
- `docker inspect … | grep AUTH_SECRET` (image) → empty; (container) → present (correctly injected at runtime).

Scratch folder and `dockerverify-*` volumes/containers torn down and removed.

## Published-image architecture (2026-06-30)

Restructured Docker setup so users can deploy with a single compose file (no repo clone, no build step). Image is published to `ghcr.io/iamcoder18/openblog:latest`.

### Changes

| File                       | Change                                                                                  |
|----------------------------|-----------------------------------------------------------------------------------------|
| `Dockerfile`               | **Removed all `ARG`s and `ARG`-dependent `ENV`s.** Image now builds with `docker build .` and zero env vars. Bakes defaults: `NEXT_PUBLIC_BASE_URL=http://localhost:3000`, `NEXT_PUBLIC_BLOG_NAME=OpenBlog`. `DATABASE_URL` is no longer needed at build (Prisma 7 reads from `prisma.config.ts`). |
| `docker-compose.yaml`      | Switched `app` service from `build:` to `image: ${OPENBLOG_IMAGE:-ghcr.io/iamcoder18/openblog:latest}`. Host ports now env-driven: `${APP_HOST_PORT:-3000}:3000` and `${POSTGRES_HOST_PORT:-5432}:5432`. This is the file users download. |
| `docker-compose.local.yaml`| New. Identical to production compose but uses `build: { context: . }` for local source builds. Tag the local image as `openblog:local` so it doesn't collide with a registry pull. |
| `.env.example`             | Added `APP_HOST_PORT`, `POSTGRES_HOST_PORT`, `OPENBLOG_IMAGE` sections. Removed the `cp .env.example .env` assumption (now the install script generates `.env` directly). |
| `scripts/install.sh`       | Two modes now: default pulls the published image; `--local-build` builds from source. Added `--image`, `--port`, `--postgres-port` flags. The compose-file selector no longer requires the script to live in `scripts/` of the repo — it works from any cwd that has a compose file. `--port` now correctly flows through to the container via `APP_HOST_PORT` in `.env`. |
| `scripts/install.ps1`      | Mirrors the bash changes: image-pull mode, `--Image`, `--Port`, `--PostgresPort`, `--LocalBuild`. |
| `README.md`                | New "Path A — one-line installer" leading the quick start. Documents the image-pull workflow, `OPENBLOG_IMAGE` pinning, `APP_HOST_PORT`/`POSTGRES_HOST_PORT` overrides, and the local-build path via `docker-compose.local.yaml`. |
| `CONTRIBUTING.md`          | New "Working with Docker" section explaining the two compose files and when to use each. |

### Trade-offs documented in the Dockerfile

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time. The published image bakes defaults; users who need different values (custom `BLOG_NAME`, custom domain fallback in OG tags) must fork and build their own image, OR override server-side (`BASE_URL`/`BLOG_NAME` still work at runtime — only the client-visible defaults are baked).

### End-to-end re-verification (2026-06-30)

Tested both modes in scratch folders:

1. **Image-pull mode** — built a local `openblog:dev` tag (simulating a GHCR pull), ran `./install.sh --image openblog:dev --port 3300 ...` from a folder containing only `docker-compose.yaml`. Result: containers up on port 3300, admin created, sign-in works, AUTH_SECRET absent from image history/ENV, present at runtime only. Verified `docker history openblog:dev | grep AUTH_SECRET` → empty; `docker inspect openblog:dev .Config.Env | grep AUTH_SECRET` → empty; `docker exec <container> printenv AUTH_SECRET` → matches `.env` value.

2. **Local-build mode** — full repo rsync into scratch folder, ran `./scripts/install.sh --local-build --port 3400 ...`. Result: image built from local Dockerfile, containers up on port 3400, admin created, sign-in works, all endpoints HTTP 200.

Scratch folders and `*test` volumes/containers torn down and removed after each test.

## Handoff

Future improvements (out of scope):
- ~~Multi-arch builds (`--platform=linux/amd64,linux/arm64`).~~ ✓ Done 2026-06-30
- ~~Push to a registry as part of CI.~~ ✓ Done 2026-06-30
- Healthcheck on the `app` service.
- Non-root user with a fixed UID that matches host for bind-mount dev workflows.

## GH Actions publish workflow (2026-06-30)

Added `.github/workflows/docker-publish.yml` — 132 lines, two jobs (`lint`, `build`), valid YAML.

### Triggers

| Event                          | Effect                                                   |
|--------------------------------|----------------------------------------------------------|
| Push to `main`                 | Lint, build, push (tags: `latest`, `main`, `sha-<7>`)    |
| Tag `v*.*.*` (e.g. `v0.1.0`)   | Lint, build, push (tags: `v0.1.0`, `0.1`, `0.1.0`, `latest`) |
| PR to `main`                   | Lint, build (no push — validates the build works)         |
| `workflow_dispatch`            | Manual ad-hoc rebuild                                    |

### Jobs

**`lint`** — runs `pnpm install --frozen-lockfile` then `pnpm run check` (lint + format + typecheck). 10-minute timeout. Runs on every PR/push as a fast gate.

**`build`** — depends on `lint` passing. Steps:

1. Checkout
2. `docker/setup-qemu-action@v3` (cross-arch)
3. `docker/setup-buildx-action@v3`
4. `docker/login-action@v3` against `ghcr.io` — gated by `if: github.event_name != 'pull_request'` so fork PRs (no secrets) don't fail
5. `docker/metadata-action@v5` generates tags from the event type
6. `docker/build-push-action@v6`:
   - `platforms: linux/amd64,linux/arm64`
   - `push: ${{ github.event_name != 'pull_request' }}`
   - `provenance: mode=max` — SLSA provenance
   - `sbom: true` — software bill of materials
   - `cache-from: type=gha` / `cache-to: type=gha,mode=max` — BuildKit cache via GH Actions cache

### Permissions

```yaml
permissions:
  contents: read
  packages: write        # GHCR push
  attestations: write    # signed SLSA provenance
  id-token: write        # OIDC for provenance
```

### Cutting a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

GHCR exposes:

```
docker pull ghcr.io/iamcoder18/openblog:v0.1.0
docker pull ghcr.io/iamcoder18/openblog:latest   # also bumped
```

### One-time setup

After the first workflow run, visit the package page (`https://github.com/IamCoder18/OpenBlog/pkgs/container/openblog`) and set visibility to **Public** so anonymous pulls work. The default `GITHUB_TOKEN` already has `packages: write` — no PAT needed.

Documented in `README.md` (new "Publishing a release" subsection) and `CONTRIBUTING.md` (new "Cutting a release" section).

## GitHub Actions release workflow (2026-06-30)

Added `.github/workflows/release.yml` — 132 lines, two jobs (`build`, `release`), valid YAML. Independent of `docker-publish.yml`:

### Triggers

- **Tag push only** (`v*.*.*`). Push to `main` does NOT trigger this workflow — those go through `docker-publish.yml` only.

### Jobs

**`build`** — same image-build steps as `docker-publish.yml` (QEMU, Buildx, GHCR login, metadata-action, build-push-action with multi-arch + provenance + sbom + GHA cache). Captures the resulting digest into the job output for the release step to reference.

**`release`** — depends on `build`. Steps:

1. Resolves the previous semver tag via `git tag --sort=-version:refname | grep -E '^v[0-9]' | grep -v "${current}" | head -n1`.
2. Calls `softprops/action-gh-release@v2` with:
   - `tag_name: ${{ github.ref_name }}`
   - `generate_release_notes: true` — auto-populates "What's changed" from PRs since the previous tag.
   - `prerelease: ${{ contains(github.ref_name, '-') }}` — `v0.2.0-rc.1` is automatically a pre-release and does NOT bump `latest`.
   - Body includes the image pull commands, the captured digest, and a link to docs/api.md.

### Permissions

```yaml
permissions:
  contents: write        # create the release + commit/push if needed
  pull-requests: read    # for auto-generated notes (PRs since prev tag)
```

The `build` job has its own permissions block with `packages: write` and `attestations: write` — GH's permission model lets jobs declare distinct perm sets.

### Trigger matrix

| Event                          | `docker-publish.yml`        | `release.yml`     |
|--------------------------------|------------------------------|-------------------|
| Push to `main`                 | ✓ (lint, build, push)        | –                 |
| PR to `main`                   | ✓ (lint, build, no push)     | –                 |
| Tag `v*.*.*`                   | ✓ (lint, build, push)        | ✓ (build, release)|
| `workflow_dispatch`            | ✓ (manual rebuild)           | –                 |

### Cutting a release

```bash
git tag v0.1.0          # or v0.2.0-rc.1 for pre-release
git push origin v0.1.0
```

Both workflows fire. The image is published, the Release page is created with auto-generated notes from PRs since `v0.0.x` (or whatever the previous tag was).

Documented in `README.md` (rewritten "Publishing a release" subsection with the two-workflow table) and `CONTRIBUTING.md` (rewritten "Cutting a release" section).

## Consolidated into publish.yml (2026-06-30)

User asked to merge `docker-publish.yml` + `release.yml` into a single `publish.yml` with version-picker inputs. Done.

### Changes

| File                                 | Change                                              |
|--------------------------------------|-----------------------------------------------------|
| `.github/workflows/docker-publish.yml` | Deleted (folded into publish.yml).                  |
| `.github/workflows/release.yml`        | Deleted (folded into publish.yml).                  |
| `.github/workflows/publish.yml`        | New, 353 lines. Single combined workflow.          |

### Inputs (workflow_dispatch only)

```yaml
inputs:
  version_bump:
    type: choice
    default: patch
    options: [patch, minor, major, none]
  custom_version:
    type: string
    description: 'Overrides version_bump. e.g. 1.2.3 or 2.0.0-rc.1'
```

### Trigger matrix

| Event                | Lint | Version | Build | Release |
|----------------------|------|---------|-------|---------|
| Push to main         | ✓    | –       | –     | –       |
| PR to main           | ✓    | –       | ✓ (no push) | –  |
| Tag v*.*.*           | ✓    | ✓       | ✓     | ✓       |
| workflow_dispatch    | ✓    | ✓       | ✓     | ✓       |
| Bot re-trigger (from workflow_dispatch tag push) | ✓ | **skip** | **skip** | **skip** |

### Version computation logic

```bash
# On tag push: use the tag verbatim
# On workflow_dispatch:
#   custom_version  → strip 'v' prefix, use as-is
#   none            → use latest stable semver tag (or 0.1.0 if none)
#   patch|minor|major → bump latest stable semver accordingly
```

Validation rejects malformed versions with a clear `::error::` message before anything else runs.

### Re-trigger protection

When `workflow_dispatch` runs the `release` job, it pushes the git tag. That tag push re-triggers the workflow with `github.actor = 'github-actions[bot]'`. Every job carries the guard:

```yaml
if: github.actor != 'github-actions[bot]'
```

So the re-trigger sees `lint` run and the other three jobs skip. `latest` is also unchanged on pre-release tags (anything with a hyphen), enforced by `docker/metadata-action`'s `flavor: latest=auto`.

### Image tag scheme

For any release of `v1.2.3`:
```
ghcr.io/<owner>/<repo>:v1.2.3
ghcr.io/<owner>/<repo>:1.2
ghcr.io/<owner>/<repo>:1
ghcr.io/<owner>/<repo>:latest   # only for stable (no -rc/-beta suffix)
```

Documented in README "Publishing a release" subsection and CONTRIBUTING "Cutting a release" section.
