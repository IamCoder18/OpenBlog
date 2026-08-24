# OpenBlog API Reference

This document describes OpenBlog's HTTP API. Every endpoint below is served by the Next.js server in `src/app/api/`. Authentication uses either a BetterAuth session cookie or a scoped bearer API key (`Authorization: Bearer ob_<base64url>`).

## Conventions

- **Content type**: JSON unless noted (`application/json`).
- **Pagination**: list endpoints accept `limit` (default 20, max 100) and `offset` (default 0).
- **Fuzzy search**: `search=<term>` uses Postgres `pg_trgm` similarity — works on `title` and `slug`. No special syntax.
- **Errors**: all errors return `{ "error": "<message>" }` with an appropriate 4xx/5xx code.
- **Auth requirement shorthand**:
  - `none` — open endpoint.
  - `session` — requires a valid BetterAuth session cookie.
  - `key` — requires `Authorization: Bearer ob_…`.
  - `session|key` — either works.
- **Roles**: `ADMIN > AUTHOR > AGENT > GUEST`. Routes that gate on a specific role say so explicitly.

## Authentication

All auth endpoints are handled by BetterAuth under the catch-all route:

```
/api/auth/{sign-up/email, sign-in/email, sign-out, session, ...}
```

BetterAuth's full endpoint list is documented at <https://better-auth.com/docs>. The minimal flows used by OpenBlog:

| Method | Path                      | Body                        | Result                        |
| ------ | ------------------------- | --------------------------- | ----------------------------- |
| POST   | `/api/auth/sign-up/email` | `{ email, password, name }` | session cookie + user         |
| POST   | `/api/auth/sign-in/email` | `{ email, password }`       | session cookie + user         |
| POST   | `/api/auth/sign-out`      | —                           | clears cookie                 |
| GET    | `/api/auth/session`       | —                           | `{ user, session }` or `null` |

`SIGN_UP_ENABLED=false` (default) blocks `sign-up/email`. Public signup must be enabled in the env when you want agents or humans to self-register.

## Roles

A user has one role stored in `UserProfile.role`:

- **ADMIN** — full control: users, themes, role changes, content moderation.
- **AUTHOR** — create/edit their own posts, manage their own API keys.
- **AGENT** — integration/account access and API-key management; cannot publish. Default for self-service sign-ups.
- **GUEST** — read-only; cannot create posts. Used for restricted human viewers.

Only an `ADMIN` can change account roles. The `/api/admin/set-role` helper is unavailable outside the isolated E2E environment.

## API keys

Long-lived bearer tokens for headless agents.

- `POST /api/keys` with `{ name, expiresInDays?, scopes? }` → safe metadata plus the one-time `key`. The `ob_<base64url>` secret is shown **once**; only its digest and prefix are stored.
- `GET /api/keys` → `{ keys: [{ id, name, createdAt, expiresAt }, ...] }` for the caller (the full key is never returned).
- `DELETE /api/keys/:id` → revoke (owner-only).

Use as `Authorization: Bearer ob_<base64url>`. Keys are accepted on post collection/detail mutations and Markdown preview when their scope and account role permit it.
Omitting `expiresInDays` creates an indefinite key that remains valid until it
is revoked. When supplied, expiry must be between 1 and 365 days.

## Posts

### `GET /api/posts`

List posts.

| Query        | Type   | Notes                                                                                      |
| ------------ | ------ | ------------------------------------------------------------------------------------------ |
| `limit`      | int    | default 10, maximum 50                                                                     |
| `offset`     | int    | default 0                                                                                  |
| `search`     | string | fuzzy match on title/slug (trigram)                                                        |
| `visibility` | enum   | `PUBLIC \| PRIVATE \| UNLISTED \| DRAFT` (single value; only the first occurrence is read) |
| `tag`        | string | filter by tag (single value; only the first occurrence is read)                            |
| `authorId`   | string | `me` resolves to the calling user                                                          |
| `order`      | enum   | `home` uses featured/recency ranking; `all` puts pinned posts first, then newest           |

- **Auth**: open by default. Anonymous collections contain only public posts. Authors additionally receive their own non-public posts; admins may receive all. Unlisted posts are direct-link-only.
- **Response**: `{ posts: [...], total, limit, offset }`.

### `POST /api/posts`

Create a post.

- **Auth**: session | key.
- **Body**:
  ```json
  {
    "title": "string (required)",
    "slug": "string (required, url-safe)",
    "bodyMarkdown": "string (required)",
    "visibility": "PUBLIC | PRIVATE | UNLISTED | DRAFT (optional, default PUBLIC)",
    "seoDescription": "string (optional)",
    "tags": ["string"],
    "coverImage": "string (optional URL)",
    "coverImageAlt": "string (optional)",
    "isPinned": "boolean (optional)",
    "isFeatured": "boolean (optional)"
  }
  ```
- **Response**: `201` with the created post + author + metadata.

### `GET /api/posts/:slug`

Fetch a single post by slug. Public endpoint; returns `PUBLIC` posts only.

### `PUT /api/posts/:slug`

Update. Owner or `ADMIN`.

- **Body**: partial of the create body — only the fields you send are updated.

### `DELETE /api/posts/:slug`

Delete. `ADMIN` or the post's author. `GUEST` users are explicitly rejected; any other non-admin, non-author user is also rejected.

### `GET /api/posts/:slug/related`

Up to 3 related `PUBLIC` posts sharing tags. Open endpoint.

## Profile

### `GET /api/profile`

Current user: `{ user: { id, name, email, image, createdAt, profile: { role } } }`.

### `PUT /api/profile`

Update `name` and/or `image`. Pass `"image": null` to clear the avatar.

### `POST /api/profile/role`

Admin-only role management. Body: `{ "userId": "…", "role": "ADMIN" | "AUTHOR" | "AGENT" | "GUEST" }`.

## Settings

### `GET /api/settings/theme`

Current site theme: `{ theme: "default" | "ocean" | "forest" | "ember" }`. Open.

### `PUT /api/settings/theme`

Set theme. **ADMIN** only. Body: `{ "theme": "ocean" }`.

### `GET /api/settings/publication`

Returns the public publication presentation settings: validated light/dark
colors, typography, corner style, density, article layout, cover-image and
motion preferences, homepage switches, footer attribution, and editable basic
pages. Open because the same values are rendered publicly.

### `PUT /api/settings/publication`

Replace publication presentation settings. **ADMIN** only. Values are
normalized to constrained options and text/background combinations must meet
WCAG 4.5:1 contrast.

### `GET /api/settings/site` / `PUT /api/settings/site`

Read or update publication identity (`name`, `description`, `logoUrl`,
`contactEmail`, and `socialUrl`). Updates are **ADMIN** only; public URLs must
use HTTP or HTTPS.

## Users

### `GET /api/users`

**ADMIN** only. Lists every user with `profile.role` and counts of posts + API keys. Useful for the admin dashboard.

## Admin

### `POST /api/admin/set-role`

Set a user's role by email.

- **Body**: `{ "email": "user@example.com", "role": "ADMIN" | "AUTHOR" | "AGENT" | "GUEST" }`.
- **Response**: `{ success: true, role }`.

> **Not production-secured.** This endpoint exists for E2E test orchestration and bootstrap scripts. It does **not** verify the caller is an admin. Either remove it from production builds or gate it behind an `ADMIN` check before exposing it on a public deployment.

## Markdown

### `POST /api/render-markdown`

Server-side render to HTML without persisting.

- **Auth**: session (any role except `GUEST`).
- **Body**: `{ "markdown": "..." }`.
- **Response**: `{ "html": "..." }`.

Uses the same renderer as the post editor — useful for previewing content from a CLI.

## Analytics

### `POST /api/analytics`

Record a page view. Open endpoint; intended to be called from client code on mount.

- **Body**: `{ "path": "/blog/my-post", "referrer"?: "https://...", "postId"?: "..." }`.
- IP is hashed before storage — no raw PII.

### `GET /api/analytics`

Aggregate views.

| Query        | Notes                                                   |
| ------------ | ------------------------------------------------------- |
| `days`       | int, default 30, max 365                                |
| `from`, `to` | ISO dates — overrides `days`                            |
| `postId`     | filter to a single post                                 |
| `scope`      | `personal` (only the caller's posts) requires a session |

- **Auth**: session required.
- **Response**: `{ totalViews, viewsByDay, topPaths, trafficSources, period }`.

## Discovery

### `GET /sitemap.xml`

Runtime-generated XML sitemap index. It links to partitioned sitemap files at
`/sitemaps/site-N.xml` and `/sitemaps/posts-N.xml`. Only public content is
included, modification dates reflect actual content changes, and each child
sitemap stays within the 50,000-URL protocol limit.

### `GET /feed.xml`

RSS 2.0 feed of the 20 most recent public posts. Open.

## Page routes (UI)

For convenience, the user-facing routes are:

| Path                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `/`                   | Home / public feed                   |
| `/explore`            | Public post explorer                 |
| `/blog/:slug`         | Single post view                     |
| `/auth/login`         | Sign-in                              |
| `/auth/signup`        | Sign-up (gated by `SIGN_UP_ENABLED`) |
| `/dashboard`          | Authenticated dashboard              |
| `/dashboard/editor`   | Post editor (create or edit)         |
| `/dashboard/stories`  | Author's own post list               |
| `/dashboard/account`  | Profile settings                     |
| `/dashboard/settings` | Site settings (admin only)           |
| `/agent`              | Agent landing (API-key-centric)      |
| `/agent/keys`         | API key management                   |
| `/agent/profile`      | Agent profile                        |

## CLI / scripts

Operational scripts (not part of the HTTP API):

| Command                                                                     | What it does                               |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| `./node_modules/.bin/tsx scripts/create-admin.ts <email> <name> <password>` | Create or promote an admin user            |
| `./node_modules/.bin/tsx scripts/change-password.ts <email> <new-password>` | Reset a user's password                    |
| `./node_modules/.bin/tsx scripts/promote-admin.ts <email>`                  | Promote an existing user to admin          |
| `pnpm run promote-admin -- <email>`                                         | Same as above (tsx wrapper)                |
| `npx prisma migrate deploy`                                                 | Run pending migrations (run by entrypoint) |

These run against the value of `DATABASE_URL` in the current shell. From the running Docker container:

```sh
docker exec -e DATABASE_URL="$DATABASE_URL" openblog-app \
  ./node_modules/.bin/tsx scripts/create-admin.ts you@example.com "You" "S3cureP@ss!"
```
