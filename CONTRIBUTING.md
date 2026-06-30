# Contributing to OpenBlog

Thanks for your interest in OpenBlog. This guide covers how to set up a dev environment, the code conventions, and the testing approach. For the product spec, see [`REQUIREMENTS.md`](./REQUIREMENTS.md).

## Development setup

You need:

- Node.js 22 + corepack enabled (pnpm is managed via `packageManager` in `package.json5`).
- Docker (for the Postgres + integration tests).
- A POSIX shell.

```bash
corepack enable
pnpm install

# Start a Postgres-only container
docker compose -f docker-compose.test.yaml up -d

# Apply the migrations
pnpm prisma migrate dev

# Run the dev server
pnpm dev    # http://localhost:4000
```

## Working with Docker

Two compose files ship with the repo:

| File                          | Purpose                                                 |
|-------------------------------|---------------------------------------------------------|
| `docker-compose.yaml`         | **Production.** Pulls `ghcr.io/iamcoder18/openblog:latest`. No build step. |
| `docker-compose.local.yaml`   | **Dev.** Builds the image from the local `Dockerfile`. Use when iterating on the codebase. |

For day-to-day local iteration:

```bash
docker compose -f docker-compose.local.yaml up -d --build
```

To customize baked-in defaults (`NEXT_PUBLIC_BLOG_NAME`, etc.), edit the `ENV` block in `Dockerfile` before building. These values are inlined into the client bundle at build time and cannot be changed without a rebuild — `BASE_URL` / `BLOG_NAME` set at runtime are only used by server code.

## Code conventions

- **TypeScript strict mode** is on. No `any` outside generated code (`src/lib/prisma/`).
- **No comments unless they explain non-obvious "why".** Code should be self-documenting.
- **Imports**: `@/` alias for `src/`. Order: third-party → `@/` → relative. Run `pnpm run format:fix` after writing code.
- **Linting**: `pnpm run check` runs oxlint + oxfmt + `tsgo --noEmit`. All three must pass before pushing. Run `pnpm run lint:fix` for auto-fixable issues.
- **File naming**: `kebab-case.ts` for files; `PascalCase.tsx` for React components (Next.js convention); `route.ts` for route handlers.
- **API routes**: keep them thin — parse input, call into `src/lib/`, return a response. Business logic lives in `src/lib/` so it's testable without HTTP.
- **Database**: every change to `prisma/schema.prisma` requires a migration (`pnpm prisma migrate dev --name <thing>`). Commit the generated SQL.

## Testing

We have three layers, run via `pnpm run test:full` (which orchestrates the whole thing in Docker):

1. **Unit tests** — Vitest, in `src/__tests__/` and `*.test.ts` colocated with source. Run with `pnpm run test:unit`.
2. **Integration tests** — Vitest against a real Postgres (started by `test:full`). Run with `pnpm run test:integration` (needs `docker compose -f docker-compose.test.yaml up -d` already).
3. **E2E tests** — Playwright against a built-and-served app. Run with `pnpm run test:e2e`.

Before opening a PR, run:

```bash
pnpm run check
pnpm run test:unit
```

The full suite (`pnpm run test:full`) is run in CI; you don't need to run it locally unless you're touching the migration or auth flows.

## Pull requests

- One concern per PR. If you need to refactor + add a feature, do two PRs.
- If your change adds a new env var or changes the build process, update [`README.md`](./README.md) and [`docs/api.md`](./docs/api.md) in the same PR.
- If your change adds an API endpoint, document it in `docs/api.md`.
- Don't bump the Prisma or Next.js major version in a feature PR — that's its own PR.

## Cutting a release

The repo has a single combined workflow: `.github/workflows/publish.yml`. It lints, computes the version, builds the multi-arch image, pushes to GHCR, and creates the GitHub Release page.

Two ways to trigger:

**A. Manual run** — Actions tab → `publish` → Run workflow. Pick:

- **`version_bump`** (required): `patch` (default) / `minor` / `major` / `none`
- **`custom_version`** (optional): any semver like `1.2.3` or `2.0.0-rc.1`. Overrides `version_bump`.

**B. Push a tag** — verbatim:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Either path produces the same result: the image lands at `ghcr.io/iamcoder18/openblog:v0.1.0` (and `0.1`, `0`, `latest`) and the Release page appears at `https://github.com/IamCoder18/OpenBlog/releases/tag/v0.1.0`.

**Pre-release tags** — anything with a hyphen, e.g. `v0.2.0-rc.1` or `v1.0.0-beta.1`. GitHub marks them as pre-release and `latest` does not move.

**Bumping logic** — the manual run looks at the latest stable semver tag (`v[0-9]+\.[0-9]+\.[0-9]+`) and applies the chosen bump. If there are no existing tags, `patch`/`minor` start at `0.1.0` and `major` starts at `1.0.0`.

**Re-trigger protection** — when the manual run pushes the git tag, that push re-triggers the workflow. The re-trigger has `github.actor = 'github-actions[bot]'` and is skipped by every job's `if:` guard, so it doesn't double-publish.

First-time setup: after the first workflow run, set the GHCR package to **Public** under Package settings → Change visibility. The repo also needs Settings → General → Workflow permissions → "Read and write permissions" so the release step can create the Release page.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). One subject line, optional body explaining the "why" if it isn't obvious from the diff.

## Code of conduct

Be kind. Disagree with the code, not the person. We're all just trying to ship a good blog platform.
