# OpenBlog product, UI, and UX audit

**Audit date:** 2026-07-14

**Scope:** Public reading and discovery, authentication, author/admin dashboards, editor and publishing, agent account area, responsive behavior, accessibility, visual system, customization, SEO, performance, and delivery quality.

**Method:** Repository inspection, desktop and mobile browser walkthroughs, populated and empty-state testing, authenticated author testing, API behavior review, accessibility/control inspection, and the project's standard check, unit-test, and production-build commands.

## Executive assessment

OpenBlog has a credible foundation: the major surfaces exist, the dark visual language is consistent, the editor is usable at a basic level, and the codebase already has substantial automated coverage. The current product is not release-ready, however. A small set of trust and publishing defects can expose non-public content, make analytics misleading, prevent authors from reopening drafts, crash API-key screens, and silently republish a post that was changed to draft. These must be fixed before visual modernization work.

The experience also feels more like a dark administration template than a polished editorial product. Navigation splits into competing systems, public visitors receive little orientation, essential states are silent or misleading, and accessibility semantics are missing from many custom controls. The four themes recolor essentially the same dark interface; they do not provide meaningful reader or publisher customization.

This document records **218 distinct findings and enhancement opportunities**. Priority labels mean:

- **Critical:** privacy, authorization, data-loss, or publishing correctness risk; block release.
- **High:** breaks a primary journey, creates materially misleading behavior, or is a major accessibility failure.
- **Medium:** recurring friction, weak state handling, notable visual/technical debt, or an incomplete workflow.
- **Low:** polish, consistency, or a useful but nonessential enhancement.

## Highest-priority actions

1. Make every post query authorization-aware. A signed-in user must never receive another author's draft, private, or unlisted content.
2. Define real visibility semantics and an access-control model for private posts; permit owners/admins to retrieve their own non-public posts.
3. Repair editor state transitions so draft, private, unlisted, public, and scheduled states cannot silently overwrite one another.
4. Replace the fake scheduling control with a persisted, timezone-aware scheduling workflow or remove it until implemented.
5. Make page-view attribution and analytics authorization consistent; stop presenting site-wide figures as personal analytics.
6. Redesign API-key creation as one-time secret disclosure and prevent the current post-refetch rendering crash.
7. Consolidate dashboard/editor navigation and preserve admin-versus-personal scope across every link.
8. Establish accessible primitives for dialogs, drawers, menus, toasts, tooltips, fields, and icon buttons.
9. Add route-level loading/error boundaries and stop turning backend failures into empty states or 404s.
10. Fix the broken build and 15 failing unit tests before feature work continues.
11. Modernize the visual system around typography, spacing, content density, imagery, light/system modes, and real brand customization—not only accent hues.
12. Add a deliberate public funnel: clear sign-in/sign-up entry points, topic/author discovery, subscriptions, and richer reading continuation.

## Evidence and caveats

- Browser checks covered `/`, `/explore`, `/login`, `/signup`, a populated post, `/dashboard`, `/dashboard/stories`, `/dashboard/editor`, `/dashboard/settings`, and `/agent`, at representative desktop and mobile widths.
- A temporary local PostgreSQL instance and temporary audit account/content were used. No production data was accessed and no product source code was modified by the audit.
- The development-only Next.js indicator visible during local review is not treated as a product defect.
- Findings are based on current behavior and current repository code, not only screenshots. Where one root cause affects several user journeys, each distinct user-facing consequence is recorded separately.

## A. Trust, privacy, authorization, and correctness

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                                                                                         |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TR-01 | Critical | `GET /api/posts` expands the visibility set to `PUBLIC`, `PRIVATE`, `UNLISTED`, and `DRAFT` for **any** authenticated request, without an ownership or role condition (`src/app/api/posts/route.ts:119-135`, `327-355`). Limit non-public results to their owner and explicitly authorized admins. |
| TR-02 | Critical | The same endpoint accepts an arbitrary `authorId`; a signed-in user can enumerate another author's non-public posts. Author filtering must be intersected with a visibility authorization predicate, never used as authorization itself.                                                           |
| TR-03 | Critical | The search and non-search implementations build visibility differently, increasing the chance of security drift. Centralize a single policy function and test every role × owner × visibility combination.                                                                                         |
| TR-04 | Critical | `GET /api/posts/[slug]` always rejects non-public posts, even for their owner or an admin (`src/app/api/posts/[slug]/route.ts:16-31`). The editor therefore cannot reopen drafts/private/unlisted posts. Add owner/admin-aware retrieval or a dedicated authenticated editor endpoint.             |
| TR-05 | Critical | `PRIVATE` has no recipient or ACL model; it currently means neither publicly readable nor selectively shareable. Define whether private means owner-only, workspace-only, or explicit recipients, then represent that in schema and policy.                                                        |
| TR-06 | Critical | Any authenticated profile can request site-wide analytics; the analytics GET endpoint checks authentication but not role or ownership (`src/app/api/analytics/route.ts:46-70`). Enforce admin scope and validate ownership for post-level analytics.                                               |
| TR-07 | Critical | The browser analytics tracker does not send `postId`, so personal/post view counts are not attributable. Pass a validated post identifier on article views and exclude internal/admin routes where appropriate.                                                                                    |
| TR-08 | Critical | The dashboard chart requests analytics without `scope=personal`, so an author's “your stories” view can show site-wide traffic while adjacent KPIs are personal. Make the scope explicit end to end and label it visibly.                                                                          |
| TR-09 | Critical | API-key list responses intentionally omit the secret (`src/app/api/keys/route.ts:19-28`), but three UIs dereference `key.key` after refetch. A newly created/deleted list can crash. Return safe metadata and render the secret only in the creation response.                                     |
| TR-10 | High     | API keys are stored as plaintext because authentication needs the presented value, making a database leak immediately usable. Store a prefix plus a cryptographic hash and compare hashes; disclose the full token once.                                                                           |
| TR-11 | High     | Signup creates the auth user and then separately assigns the requested role, but the UI ignores a failed role request and redirects as if it succeeded. Make onboarding transactional/server-owned and show a recoverable failure state.                                                           |
| TR-12 | High     | Account signup can self-select `AUTHOR`, and a `GUEST` session can create or update its own posts while delete explicitly forbids guests. Define role capabilities once, enforce them on every mutation, and avoid self-service privilege escalation unless intentional.                           |

## B. Information architecture and navigation

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                                |
| ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IA-01 | High     | Signed-out visitors have no visible sign-in or sign-up entry in the public header or mobile nav. Add a clear account action while keeping reading primary.                                                                                |
| IA-02 | High     | The root page always renders a mobile back button. On `/`, it is meaningless and may return users to an external site via browser history. Hide it on root and use deterministic destinations elsewhere.                                  |
| IA-03 | High     | `DesktopBackLink` changes its label from the referrer but always links to `/` (`src/components/DesktopBackLink.tsx:31-34`); “Back to Explore” and “Back to Dashboard” are false. Store and use a safe same-origin destination.            |
| IA-04 | High     | The editor nests inside the dashboard shell but renders a second fixed site navbar and logout control. Consolidate to one contextual shell with a clear editor exit and publishing status.                                                |
| IA-05 | High     | Admin/site mode is represented by a query string that many internal links drop. Use a durable route segment, context, or link helper so scope cannot silently switch.                                                                     |
| IA-06 | Medium   | “Editor” and “New Post” appear in multiple navigation and header locations, producing redundant choices rather than a clear primary action. Establish one global create action and one local contextual action.                           |
| IA-07 | Medium   | Mobile navigation changes substantially between signed-out and authenticated states, but the remaining two signed-out items are spread awkwardly across the full width. Use a centered compact pattern or add the missing account action. |
| IA-08 | Medium   | Active location is communicated mostly by color; navigation does not consistently expose `aria-current`. Add semantic current-state markers to desktop, mobile, tabs, and pagination.                                                     |
| IA-09 | Medium   | There are no author, tag, or category destination pages, even though author names and tags are displayed. Turn editorial metadata into a connected browsing graph.                                                                        |
| IA-10 | Low      | The footer contains only copyright and does not help users continue to About, RSS, privacy, terms, account, or editorial sections. Add a restrained but useful site map.                                                                  |

## C. Public feed and Explore

| ID    | Priority | Finding and recommendation                                                                                                                                                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PF-01 | High     | Homepage API failures are caught and shown as “No posts yet,” making an outage indistinguishable from a new publication. Show an error with retry while preserving any cached content.                  |
| PF-02 | Medium   | The empty homepage offers no useful next step. Add editorial setup guidance for owners and Explore/sign-up/RSS actions for visitors.                                                                    |
| PF-03 | High     | Explore errors are swallowed, leaving stale or empty results with no explanation. Provide an inline error state, retry, and non-destructive retention of the last good result.                          |
| PF-04 | High     | Explore promises “Search stories, topics, and authors,” but the API search does not cover the full body or author identity. Align the claim with actual indexes or expand search.                       |
| PF-05 | Medium   | Explore search state, filters, and page are not encoded in the URL. Deep links, back navigation, refresh, and sharing lose the user's place.                                                            |
| PF-06 | High     | The search field is uncontrolled (`defaultValue`) while the clear action only changes React state; clearing can leave the old text visible. Make the field controlled and test clear/keyboard behavior. |
| PF-07 | Medium   | Requests are not aborted or sequenced, so a slower earlier search can overwrite a newer query. Use `AbortController` or request IDs.                                                                    |
| PF-08 | Medium   | Pagination replaces results without moving focus or scrolling to the result heading. Announce the update and return users to a predictable reading position.                                            |
| PF-09 | Medium   | Loading swaps out the grid, causing layout movement. Retain dimensions or use a stable results region with a progress indicator.                                                                        |
| PF-10 | Medium   | Search excerpts slice raw Markdown, so syntax can leak into cards. Generate a plain-text excerpt during indexing or use the shared Markdown stripping utility.                                          |
| PF-11 | Medium   | `LoadMorePosts` assumes more results exist even when the initial total fits on one page. Send `total`/`hasMore` from the server and avoid a dead first request.                                         |
| PF-12 | Medium   | Grid/list preference resets on navigation and has no accessible text. Persist it per reader and expose pressed state/name.                                                                              |
| PF-13 | Medium   | Internal story links are frequently raw anchors, producing full reloads and losing search/view state. Use Next links for internal navigation.                                                           |
| PF-14 | Low      | Relative dates and fallback reading times are hardcoded in English and can produce nonsensical future values. Use localized date formatting and content-derived reading time.                           |

## D. Reading and post detail

| ID    | Priority | Finding and recommendation                                                                                                                                                                                      |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RD-01 | High     | A post is fetched twice through the app's own HTTP API—once for metadata and once for rendering. Memoize a direct server data function so metadata and page share one authorization-aware result.               |
| RD-02 | High     | Network/backend errors are converted to `notFound()`, telling users content does not exist when the service failed. Reserve 404 for confirmed absence and use a route error boundary otherwise.                 |
| RD-03 | Medium   | The article edit icon is an unnamed 32px link. Give it an accessible name and a sufficiently large target.                                                                                                      |
| RD-04 | Medium   | Tags look interactive but are inert, and the author has no profile destination. Link these elements to real discovery pages or remove the affordance styling.                                                   |
| RD-05 | Medium   | Related stories load only after hydration, creating a content waterfall and layout shift. Fetch related content on the server or stream it in a bounded suspense region.                                        |
| RD-06 | Medium   | Related-content failure has neither fallback nor retry. Retain the article ending cleanly and offer a recovery action.                                                                                          |
| RD-07 | Medium   | Share supports copy only even where the platform Web Share API is available. Prefer native sharing, retain copy as fallback, and surface actual clipboard failure.                                              |
| RD-08 | High     | The share popover lacks expanded state, Escape handling, focus placement, and focus return. Implement it as an accessible popover/menu.                                                                         |
| RD-09 | Medium   | Cover images use raw images without reserved dimensions, responsive source selection, loading placeholder, or error fallback. Use the image pipeline or an intentional media component.                         |
| RD-10 | Medium   | KaTeX CSS is appended from a CDN on every renderer mount, is never cleaned up, and uses a version different from the installed package. Bundle the matching stylesheet once for reliable self-hosted rendering. |
| RD-11 | High     | Rendered Markdown sanitization broadly permits iframes without a clear host allowlist/sandbox policy. Define permitted embeds, add restrictive attributes, and test hostile input.                              |
| RD-12 | Low      | Long-form reading has no table of contents, reading progress, bookmark/save, next-story action, or author follow/subscription. Add these progressively after correctness and accessibility work.                |

## E. Authentication and onboarding

| ID    | Priority | Finding and recommendation                                                                                                                                                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AU-01 | Medium   | Login and signup hardcode “OpenBlog” rather than the configured site name. Use site settings consistently across metadata, auth, empty states, and errors.                                              |
| AU-02 | High     | Visible field labels are not programmatically associated with inputs. Add stable IDs/`htmlFor` or wrap controls correctly.                                                                              |
| AU-03 | Medium   | Inputs omit useful autocomplete tokens (`email`, `name`, `current-password`, `new-password`). Add them for password-manager and keyboard usability.                                                     |
| AU-04 | High     | There is no forgot/reset-password journey. Provide request, expiry, confirmation, success, and invalid-token states.                                                                                    |
| AU-05 | Medium   | Password controls have no show/hide action, strength guidance, or explanation beyond a six-character minimum. Provide actionable requirements without blocking paste.                                   |
| AU-06 | High     | Auth errors are not announced or connected to invalid fields, and focus is not moved to the error. Use `aria-live`, `aria-invalid`, `aria-describedby`, and a summary for server failures.              |
| AU-07 | Medium   | Loading changes the submit button to an unlabeled icon, removing its accessible name. Retain the text, add `aria-busy`, and prevent duplicate submission.                                               |
| AU-08 | Medium   | Login/signup do not preserve a safe `returnTo` destination, forcing users to restart the journey that prompted authentication. Validate and restore same-origin destinations.                           |
| AU-09 | Medium   | Signup's default “Agent” role is surprising and role cards do not expose radio/selected semantics. Explain roles, require an explicit choice, and use a radio group.                                    |
| AU-10 | Medium   | Signup does not consistently redirect already-authenticated users, unlike login. Apply one predictable signed-in policy.                                                                                |
| AU-11 | Medium   | Accounts are created with unverified email but onboarding does not explain verification status or next steps. Add a resendable verification flow or explicitly state that verification is not required. |
| AU-12 | Medium   | There are no Terms or Privacy links adjacent to account creation, despite collecting identities and analytics. Add the appropriate policy acknowledgment and data-use explanation.                      |

## F. Dashboard and analytics

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                                    |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DA-01 | Critical | Article tracking records paths but not post IDs, while personal totals query by post ID. The primary analytics model therefore reports contradictory values. Define a canonical event contract and backfill or clearly reset invalid history. |
| DA-02 | High     | Analytics charts can expose site-wide paths and referrers to ordinary authenticated accounts. Add capability checks, scope every query, and test direct API access—not only hidden UI.                                                        |
| DA-03 | High     | The chart title and surrounding copy do not disclose whether data is personal or site-wide. Show the active scope and provide a deliberate admin-only switch.                                                                                 |
| DA-04 | Medium   | Chart fetch failures are often silent for non-OK responses. Standardize request handling so errors never masquerade as zero traffic.                                                                                                          |
| DA-05 | Medium   | The custom bar chart is hover-dependent and made from non-semantic `div`s, excluding keyboard and screen-reader users. Use an accessible chart library or pair the visualization with a data table.                                           |
| DA-06 | Medium   | The chart omits a usable y-axis/grid and suppresses most x-axis labels, making magnitude and timing hard to read. Add scale, full tooltip detail, and optional table/export.                                                                  |
| DA-07 | Medium   | A minimum four-percent bar height makes zero or tiny values appear nonzero. Visually distinguish zero and preserve proportional truth.                                                                                                        |
| DA-08 | Low      | Daily average rounds small nonzero values to zero. Use a decimal for small rates or show a more meaningful cadence.                                                                                                                           |
| DA-09 | Medium   | Date grouping mixes database dates, browser formatting, and a timezone label, risking shifted day labels. Pick an explicit reporting timezone and aggregate/display consistently.                                                             |
| DA-10 | Medium   | Recent-story stats and views do not explain the measurement window, publication status, or whether internal views are excluded. Add definitions/tooltips and an analytics settings policy.                                                    |

## G. Story management

| ID    | Priority | Finding and recommendation                                                                                                                                                        |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST-01 | High     | `UNLISTED` is missing from filters and falls through to a “Published” badge. Add an explicit state with accurate label, color, icon, and explanation.                             |
| ST-02 | High     | “View” sends draft/private/unlisted stories to the public route, which returns 404. Provide an authenticated preview route or hide View until the post is public.                 |
| ST-03 | High     | Authors cannot reopen non-public stories because the editor uses the public-only slug endpoint. Repair the authenticated data path before presenting edit actions.                |
| ST-04 | High     | The clear-search control has the same uncontrolled-input defect as Explore, so visible text and query state can diverge. Make filters controlled and URL-backed.                  |
| ST-05 | Medium   | Search/filter/page state disappears on refresh and browser back. Encode management state in search parameters.                                                                    |
| ST-06 | Medium   | Concurrent fetches can race and replace newer results with older ones. Cancel obsolete requests and show nonblocking progress.                                                    |
| ST-07 | High     | Row action menus lack menu roles, accessible names, Escape behavior, focus movement, and focus return. Replace the repeated custom implementation with an accessible shared menu. |
| ST-08 | High     | The delete confirmation lacks dialog semantics, focus trapping, initial focus, Escape handling, and focus restoration. Implement a reusable destructive-confirmation dialog.      |
| ST-09 | Medium   | Delete confirmation remains actionable while the request is running, permitting duplicate submissions. Disable actions, show progress, and retain errors in the dialog.           |
| ST-10 | Medium   | Deleting updates the client list total but leaves server-rendered summary cards stale. Revalidate or derive all visible counts from one client state/query.                       |
| ST-11 | Medium   | “No stories” offers New Post even when filters merely returned no matches. Offer Clear filters first and reserve creation guidance for a genuinely empty library.                 |
| ST-12 | Low      | There are no bulk actions, sorting, date/author filters, scheduled queue, or multi-select workflow. Add them when the basic state model is trustworthy.                           |

## H. Editor and publishing workflow

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                                                    |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ED-01 | Critical | Choosing “Save as Draft” on an existing public post saves `DRAFT` but does not update local visibility. The later autosave can submit the stale `PUBLIC` state and silently republish it. Treat server response as authoritative and update state atomically. |
| ED-02 | Critical | “Schedule for Later” does not schedule anything; it saves the post as private, ignores the selected date, then clears it. Remove the control or implement persisted `scheduledAt`, a worker, failure handling, and audit history.                             |
| ED-03 | Critical | The mobile floating send button calls the default save path, which defaults to public. Its icon-only presentation can publish unintentionally. Use a labeled review/publish action with explicit state confirmation.                                          |
| ED-04 | High     | New posts have no autosave, while existing posts do. Provide local/server drafts for both and clearly communicate where recovery data is stored.                                                                                                              |
| ED-05 | High     | Autosave is described as every 30 seconds, but the effect restarts on content changes and behaves as a 30-second idle debounce. Make the wording accurate and use a robust save queue.                                                                        |
| ED-06 | Critical | There is no navigation guard for unsaved changes. Browser back, logo, dashboard links, logout, or closing the tab can discard work. Add dirty-state routing and `beforeunload` protection with recovery.                                                      |
| ED-07 | High     | Save/publish controls are not consistently locked during requests, allowing duplicate writes and ambiguous final state. Serialize mutations and expose saving/saved/error states.                                                                             |
| ED-08 | High     | Publishing menus lack outside-click handling, Escape support, focus management, semantic roles, and expanded state. Use the shared accessible popover/menu primitive.                                                                                         |
| ED-09 | High     | The settings sidebar can overlay the writing surface at large breakpoints instead of reserving space. Use a responsive grid/drawer model with stable content width.                                                                                           |
| ED-10 | Medium   | Desktop and mobile settings duplicate substantial markup, increasing behavioral drift and accessibility defects. Share one field model/component set across presentations.                                                                                    |
| ED-11 | Medium   | Preview requests send the full Markdown after short delays, cannot be aborted, and can race. Debounce deliberately, cancel stale renders, and consider local rendering.                                                                                       |
| ED-12 | Medium   | Preview errors are swallowed. Keep the editable source visible and show an actionable preview-specific error.                                                                                                                                                 |
| ED-13 | Medium   | Editor preview does not use the same LaTeX/rendering path as the published article, so “preview” is not faithful. Share the production renderer and styles.                                                                                                   |
| ED-14 | High     | Title, body, tag, SEO, cover, slug, and scheduling fields are not consistently associated with labels; several controls are unnamed in the accessibility tree. Build fields from accessible primitives.                                                       |
| ED-15 | Medium   | Formatting controls rely on icon/title and a brittle global `document.querySelector("textarea")`. Use refs, accessible labels, pressed state, keyboard shortcuts, and selection-preserving commands.                                                          |
| ED-16 | Low      | The toolbar omits common writing operations such as headings, blockquote, code block, undo/redo, and shortcut help. Add only after the underlying Markdown command model is tested.                                                                           |
| ED-17 | Medium   | Cover media is URL-only, with no upload, crop, focal point, alt text, validation, or broken-image recovery. Add a media workflow and store accessibility metadata.                                                                                            |
| ED-18 | High     | The SEO preview hardcodes `openblog.com`, producing false feedback on every other deployment. Derive the configured canonical origin and final slug.                                                                                                          |
| ED-19 | Medium   | SEO title/description fields give no length/count guidance while the server accepts overly long values. Add recommended ranges, live counters, and shared validation.                                                                                         |
| ED-20 | Medium   | Tag limits, normalization, and duplicate rules are hidden; duplicates can differ only by case, and add/remove targets are tiny. Normalize server-side and expose concise rules.                                                                               |
| ED-21 | High     | Slug changes have no warning about broken inbound links and no redirect history. Add uniqueness feedback, a deliberate confirmation for published URLs, and persisted redirects.                                                                              |
| ED-22 | Medium   | Public cards expect category/read-time concepts that the editor/schema do not consistently own. Define editable taxonomy and compute reading time from canonical content.                                                                                     |

## I. Settings, customization, administration, and agent account

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                  |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SA-01 | High     | Personal settings says “Customize your experience” but primarily exposes API keys. Rename it or add actual reader/author preferences such as theme, density, editor, notification, and privacy choices.                     |
| SA-02 | High     | Theme selection is global admin state rather than a reader preference. Separate brand theme from per-user light/dark/system and accessibility preferences.                                                                  |
| SA-03 | Medium   | The four themes mainly swap accent hues over the same dark surfaces; they do not change typography, density, radius, layout, or lightness. Provide purposeful presets and custom design tokens.                             |
| SA-04 | High     | Theme selection reports success optimistically before the API succeeds and does not roll back on failure. Show a pending state, commit after success, and restore the prior theme on error.                                 |
| SA-05 | Medium   | Client/local theme preference can be overwritten by server theme bootstrap, making ownership of the setting unclear. Define a deterministic priority: system, reader override, then site default.                           |
| SA-06 | Medium   | User administration is read-only. Add invite, role change, suspend/reactivate, revoke sessions, and removal flows with authorization and audit logs.                                                                        |
| SA-07 | Medium   | User management has no search, filters, pagination, or empty/error/loading distinctions. Add these before the list grows.                                                                                                   |
| SA-08 | High     | Site identity and behavior—name, description, logo, URL, signup policy, SEO defaults, social links—cannot be managed in the UI. Provide a validated site-settings surface.                                                  |
| SA-09 | High     | Key lists can flash “No keys” or “No users” before loading completes. Model loading, empty, error, and success as distinct states.                                                                                          |
| SA-10 | Critical | Key list components assume the secret remains available after creation, conflicting with the API list contract and causing runtime errors. Display the creation secret in a one-time modal, then show prefix/metadata only. |
| SA-11 | High     | There is no copy action or forced acknowledgment when a new API-key secret is displayed. Provide Copy, download-as-env (optional), and “I saved it” confirmation before dismissal.                                          |
| SA-12 | Medium   | Key creation UI omits expiry and scopes although the API partially supports expiry. Add least-privilege scopes, expiration presets, and clear capability descriptions.                                                      |
| SA-13 | High     | Key deletion lacks confirmation and can fail silently on non-OK responses. Confirm destructive actions, keep the row while pending, and show inline failure.                                                                |
| SA-14 | Medium   | Keys do not expose last-used time/location, rotation, revocation reason, or security activity. Add metadata and an audit trail without ever redisplaying the secret.                                                        |
| SA-15 | Medium   | Agent avatars are read as full base64 data and saved directly, with no resize, crop, type/size validation, or upload progress. Use bounded object storage/image processing and a real uploader.                             |
| SA-16 | Medium   | Agent sidebar identity does not refresh after profile save, and Save remains enabled without a dirty-state model. Update shared session/profile state and indicate unchanged/saving/saved/error.                            |
| SA-17 | Medium   | Account management omits password/email change, active sessions, MFA/passkeys, data export, and account deletion. Add a security and privacy section appropriate to the auth system.                                        |

## J. Accessibility and inclusive interaction

| ID    | Priority | Finding and recommendation                                                                                                                                                                                      |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AX-01 | High     | There is no skip-to-content link. Add a first-focus skip link and stable main-content target in the root shell.                                                                                                 |
| AX-02 | High     | Many icon-only buttons and links have no accessible name, including feed view toggles, search clear/pagination, story actions, tag removal, edit, and mobile publish. Require labels in the icon-button API.    |
| AX-03 | High     | Many controls are 32–40px and some text actions are below 24px in one dimension. Establish at least 44px comfortable touch targets and never fall below the applicable 24px minimum without spacing exceptions. |
| AX-04 | High     | Custom drawers are visually hidden with opacity/pointer-events while their interactive descendants remain in the DOM and may stay tabbable. Unmount them or use `inert`/proper hidden semantics.                |
| AX-05 | High     | The mobile drawer lacks dialog/navigation labeling, focus trap, initial focus, Escape dismissal, and focus return. Implement a tested navigation-drawer primitive.                                              |
| AX-06 | High     | Delete dialogs lack `role=dialog`, `aria-modal`, labelled title/description, and keyboard focus management. Fix the primitive once and reuse it.                                                                |
| AX-07 | High     | Dropdowns and popovers are click-only visual layers rather than keyboard-operable menus/popovers. Standardize trigger state, roving focus where appropriate, Escape, outside click, and return focus.           |
| AX-08 | High     | Toasts are not announced with `status`/`alert`, and close controls are unnamed. Add a live region, meaningful dismissal labels, pause-on-hover/focus, and safe timing.                                          |
| AX-09 | Medium   | Toast positioning can overflow narrow screens and collide with fixed mobile navigation. Use viewport gutters and bottom-nav-aware safe-area offsets.                                                            |
| AX-10 | High     | Form errors are not reliably bound to fields and are often color/text only. Use error summaries, `aria-describedby`, `aria-invalid`, and focus management.                                                      |
| AX-11 | High     | Search, auth, profile, editor, settings, and key-name inputs commonly appear unnamed because visible labels are not associated. Add automated accessible-name coverage for every field.                         |
| AX-12 | Medium   | Multiple navigation landmarks are not distinctly labeled. Name primary, dashboard, editor, and mobile navigation regions.                                                                                       |
| AX-13 | Medium   | Tabs, view toggles, and role cards lack selected/pressed semantics. Use native radios/tabs or fully implement their ARIA patterns.                                                                              |
| AX-14 | Medium   | Status is often communicated mainly through hue. Pair visibility, saving, errors, and selected state with text/icon/shape and verify contrast in every theme.                                                   |
| AX-15 | High     | Tiny uppercase labels (often 9–10px) are difficult to read and overused. Increase minimum text size and reserve tracking/uppercase for short metadata.                                                          |
| AX-16 | Medium   | Focus styles are inconsistent, and several controls remove outlines/rings. Define a high-contrast `:focus-visible` token used across themes.                                                                    |
| AX-17 | Medium   | Hover-only chart/tooltips do not work for keyboard, touch, or screen readers. Make each data point focusable or provide a table equivalent.                                                                     |
| AX-18 | Medium   | Reduced-motion support does not comprehensively disable Tailwind pulse/spin/bounce and pervasive transitions. Audit all motion and preserve only essential feedback.                                            |
| AX-19 | Medium   | Fixed headers do not establish scroll padding for anchor/focus destinations. Add `scroll-padding-top` and verify heading links and validation focus are visible.                                                |
| AX-20 | Low      | Dates, times, reading estimates, and analytics timezone copy are not consistently localized. Use semantic `<time>` elements and a centralized locale/timezone formatter.                                        |

## K. Visual design and customization

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                                |
| ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VD-01 | High     | The overall appearance is a near-black admin template with a purple gradient rather than a distinctive editorial identity. Establish brand typography, an image strategy, signature editorial components, and more varied tonal surfaces. |
| VD-02 | High     | There is no light or system color mode, limiting comfort and personal preference. Add light, dark, and system modes before expanding accent presets.                                                                                      |
| VD-03 | Medium   | Accent themes preserve almost every other token, so customization feels cosmetic. Expose curated controls for type scale, content width, density, corner style, and surface contrast.                                                     |
| VD-04 | Medium   | The gradient primary treatment is used broadly across unrelated actions, weakening hierarchy. Reserve it for the single highest-value action per view and use quieter secondary treatments.                                               |
| VD-05 | High     | Gradient text/button contrast varies by theme and needs explicit verification. Define foreground colors per semantic token and run contrast checks for every state.                                                                       |
| VD-06 | Medium   | Repeated rounded bordered cards make the feed, dashboard, settings, and editor visually homogeneous. Use spacing, typography, background tone, and editorial composition instead of boxing every group.                                   |
| VD-07 | Medium   | The project's “no divider lines” direction conflicts with frequent borders and separators. Replace unnecessary rules with whitespace/grouping and keep lines only where they clarify data.                                                |
| VD-08 | Medium   | Intended asymmetry often becomes accidental dead space, especially image-less bento cards. Define alternate layouts/fallback artwork for content without media.                                                                           |
| VD-09 | Medium   | Typography overuses tiny uppercase tracking while long-form and interface hierarchy remain too similar. Create distinct display, reading, label, and data styles with accessible minimums.                                                |
| VD-10 | High     | The configured Manrope variable appears disconnected from the CSS token actually used for headlines, risking fallback typography. Wire `next/font` variables to the design tokens and add a visual regression check.                      |
| VD-11 | Medium   | There is no real brand mark or configurable logo; leftover starter assets remain in `public`. Add responsive wordmark/mark slots, favicon set, and remove unused template assets.                                                         |
| VD-12 | Medium   | Page-entry animation initially reduces content opacity and staggers key metrics, making already-loaded information look unavailable. Shorten/remove entrance delays, especially for repeated navigation.                                  |
| VD-13 | Low      | Status chips, metadata, and action icon styles vary between public cards, story management, and editor menus. Consolidate semantic components and vocabulary.                                                                             |
| VD-14 | Low      | The sparse footer and public shell do not convey publication identity, editorial mission, or trust signals. Add configurable About/contact/social/policy content without turning it into a link farm.                                     |

## L. Responsive and mobile experience

| ID    | Priority | Finding and recommendation                                                                                                                                                                  |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MB-01 | High     | The editor's fixed navbar competes with the dashboard mobile top bar, obscuring the parent navigation model. Use one mobile editor header with explicit Back, status, and Publish actions.  |
| MB-02 | High     | Floating editor settings, preview, and publish controls can stack over content and keyboard-safe areas. Use safe-area insets, keyboard-aware positioning, and a single compact action rail. |
| MB-03 | Medium   | Fixed top and bottom bars reduce usable viewport height without consistently reserving matching content padding. Define shell-level inset tokens and test short screens.                    |
| MB-04 | Medium   | The public root back button consumes scarce mobile header space while providing no valid root action. Remove it on root and prefer route-specific breadcrumbs elsewhere.                    |
| MB-05 | Medium   | List-view thumbnails and metadata can squeeze into narrow layouts. Switch to a vertical card or responsive `grid-template` at small widths.                                                 |
| MB-06 | Medium   | Toasts use desktop-oriented width/offset values that can overflow or overlap bottom navigation. Make notifications edge-aware and respect safe-area insets.                                 |
| MB-07 | Medium   | Desktop and mobile duplicate whole settings/navigation variants, creating inconsistent features and labels. Share data/components and vary only presentation.                               |
| MB-08 | Medium   | Dense 32–36px story action clusters are difficult to operate on touch. Use a single large overflow trigger and spacious mobile action sheet.                                                |
| MB-09 | Low      | Mobile readers lack useful continuation controls beyond the global bottom nav. Consider an unobtrusive reading progress/next-story/share surface that does not cover text.                  |

## M. Performance and Next.js architecture

| ID    | Priority | Finding and recommendation                                                                                                                                                                                                             |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PN-01 | High     | There are no route-level `loading.tsx` files. Dynamic routes can appear unresponsive and lose the streaming/partial-prefetch benefits described by the bundled Next.js 16 guidance. Add meaningful skeletons at slow route boundaries. |
| PN-02 | High     | There are no route-level `error.tsx` boundaries. A recoverable route failure can collapse into a generic error or misleading empty/404 state. Add segment recovery with retry and logging IDs.                                         |
| PN-03 | High     | Server pages call the application's own HTTP API instead of shared server data functions, adding loopback latency and failure modes. Move database/policy logic into reusable server-only modules.                                     |
| PN-04 | Medium   | Post metadata and render fetch the same resource separately. Use React `cache()` or a cached server data layer to deduplicate within a render.                                                                                         |
| PN-05 | High     | Base URL fallbacks are inconsistent (`3000`, `3001`, deployment config), so local or misconfigured rendering can fetch the wrong process. Validate one canonical origin at startup and avoid loopback requests.                        |
| PN-06 | Medium   | Related stories are a client-side waterfall after article hydration. Fetch/stream them from the server with a stable suspense fallback.                                                                                                |
| PN-07 | Medium   | Global layout reads the database for theme state on every route, reducing static eligibility and coupling auth pages to database availability. Cache/revalidate site settings and separate reader override.                            |
| PN-08 | Medium   | Internal raw anchors trigger full page loads and bypass Next client navigation/prefetch. Replace with `next/link` where the destination is internal.                                                                                   |
| PN-09 | Medium   | Raw post/card images bypass image sizing, formats, responsive sources, and layout-shift protection. Introduce a constrained media component and configure safe remote patterns.                                                        |
| PN-10 | Medium   | Arbitrary remote avatar URLs passed to Next Image may fail because remote image patterns are not configured. Validate/host user media or add deliberately restricted patterns.                                                         |
| PN-11 | Low      | The root loads an external Material Symbols stylesheet even though the product uses Lucide icons. Remove the redundant network/privacy dependency.                                                                                     |
| PN-12 | Medium   | Analytics tracks authentication/dashboard/editor routes, polluting readership numbers and adding requests to internal workflows. Define trackable public routes and bot/internal exclusions.                                           |
| PN-13 | Medium   | Explore and management queries disable caching without preserving prior results or deduplicating identical requests. Use an appropriate query cache/state layer while keeping private responses non-shared.                            |

## N. SEO, discovery, syndication, and sharing

| ID    | Priority | Finding and recommendation                                                                                                                                                                  |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-01 | High     | Root metadata is generic and article metadata hardcodes “OpenBlog,” ignoring configured identity. Generate consistent site and article metadata from validated settings.                    |
| SD-02 | High     | No `metadataBase`/canonical strategy is evident, risking incorrect absolute social URLs and duplicate indexing. Define the canonical origin and canonical URL for every public post.        |
| SD-03 | Medium   | Article descriptions slice raw Markdown and can include syntax or poor sentence fragments. Store/generate a clean excerpt with author override.                                             |
| SD-04 | Medium   | There is no robust default Open Graph/Twitter image or generated per-article social card. Add branded defaults and deterministic dynamic cards.                                             |
| SD-05 | Medium   | There is no `robots.ts` policy. Add explicit indexing rules, including denial for auth, dashboard, preview, and private routes.                                                             |
| SD-06 | Medium   | There is no web manifest or complete icon set, weakening installed/mobile identity. Add manifest, theme colors, icons, and display behavior if PWA installation is desired.                 |
| SD-07 | Medium   | Sitemap coverage omits useful discovery destinations such as Explore and future author/tag/category pages. Generate only canonical, indexable public URLs with accurate modification times. |
| SD-08 | Medium   | Articles lack structured `Article`/`BlogPosting` and breadcrumb data. Add validated JSON-LD matching visible author, dates, image, and publisher identity.                                  |
| SD-09 | Medium   | RSS is basic and should improve stable GUIDs, self link, categories, publication dates, excerpts/content policy, and CDATA-safe output. Validate it with common readers.                    |
| SD-10 | Medium   | Share previews, editor SEO preview, canonical URLs, RSS, and sitemap are not clearly driven from the same URL/content source. Create one publication projection to prevent drift.           |
| SD-11 | Low      | There are no topic/author archive pages to capture long-tail discovery and give tags semantic purpose. Add them with unique introductory copy and canonical pagination.                     |
| SD-12 | Low      | Public pages provide no newsletter/subscription or follow mechanism. Add configurable email/RSS subscription only with a clear consent and privacy model.                                   |

## O. Engineering quality, tests, and operational readiness

| ID    | Priority | Finding and recommendation                                                                                                                                                                                     |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QE-01 | High     | `pnpm run check` fails TypeScript validation in four maintenance scripts after auth/schema changes. Bring scripts onto the current Better Auth/Prisma contracts and keep them in CI.                           |
| QE-02 | High     | `pnpm run build` compiles application code but fails the same TypeScript check, so the current revision is not deployable through the standard build. Treat a green production build as a merge gate.          |
| QE-03 | High     | Unit tests have 15 failures across four files (781 pass). Repair tests and behavior together rather than normalizing a red baseline.                                                                           |
| QE-04 | Medium   | Eleven mobile-nav failures reflect a stale `isAdmin` test contract after the component moved to `canAccessDashboard`/role behavior. Decide the public component contract and update both tests and call sites. |
| QE-05 | Medium   | Login/signup tests do not handle new profile/role API calls. Add route-handler/MSW coverage for success, failure, partial onboarding, and retries.                                                             |
| QE-06 | Medium   | Configuration tests expect `BASE_URL` but the test environment resolves `/`. Make environment isolation deterministic and test invalid/missing origin behavior.                                                |
| QE-07 | High     | Authorization tests should enumerate anonymous, guest, agent, author, admin, owner, non-owner, and every visibility. Current defects show UI-level tests are insufficient.                                     |
| QE-08 | High     | Add regression tests for public→draft→autosave, private/draft reopen, schedule timing, duplicate publish clicks, and unsaved navigation. These are release-critical state machines.                            |
| QE-09 | High     | Add automated accessibility tests and keyboard browser tests for every shared dialog, drawer, menu, toast, field, and icon button. Static lint alone will not catch focus behavior.                            |
| QE-10 | Medium   | Add visual regression snapshots at mobile/tablet/desktop for empty, loading, populated, error, long-content, and no-image states across every theme/mode.                                                      |
| QE-11 | Medium   | Add observability for failed saves, schedule/publish jobs, API authorization denials, analytics ingestion, and client route errors without recording sensitive content or tokens.                              |

## P. Product enhancement backlog

These are intentionally lower than the correctness and accessibility work above; they should not distract from release blockers.

| ID    | Priority | Enhancement opportunity                                                                                                                                             |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EN-01 | Medium   | Introduce a publication home layout with configurable hero, featured collection, latest stories, and topic rails rather than always promoting the first API result. |
| EN-02 | Medium   | Add saved stories/bookmarks with an account library and a privacy-aware local fallback for signed-out readers.                                                      |
| EN-03 | Medium   | Add follows/subscriptions for authors or topics, with explicit notification frequency and unsubscribe controls.                                                     |
| EN-04 | Medium   | Offer full-text search with author/topic/date filters, result highlighting, suggestions, recent searches, and a no-results recovery path.                           |
| EN-05 | Medium   | Add author profiles with bio, links, expertise/topics, featured work, and a consistent accessible avatar fallback.                                                  |
| EN-06 | Low      | Add reading history and “continue reading” only as an opt-in/local feature with clear data controls.                                                                |
| EN-07 | Medium   | Add an editorial preview URL that is revocable, expires, is excluded from indexing, and does not expose unrelated private content.                                  |
| EN-08 | Medium   | Add revisions, compare/restore, and a publication activity log so authors can recover from bad edits or state changes.                                              |
| EN-09 | Medium   | Add collaboration primitives—draft ownership, comments, review status, and handoff—if multi-author editorial work is a target use case.                             |
| EN-10 | Medium   | Add a real scheduling calendar/queue with timezone display, missed-job alerts, and reschedule/unpublish actions.                                                    |
| EN-11 | Low      | Add reusable content templates for article, tutorial, release note, and newsletter formats without hiding the underlying Markdown.                                  |
| EN-12 | Low      | Add import/export for Markdown and media bundles so content is portable and the platform avoids lock-in.                                                            |
| EN-13 | Medium   | Add content-level analytics for completion/scroll depth and outbound clicks only after consent, bot filtering, and the base view model are correct.                 |
| EN-14 | Medium   | Add configurable privacy-friendly analytics retention, excluded IPs, consent behavior, and a transparent reader-facing policy.                                      |
| EN-15 | Low      | Add command palette/keyboard shortcuts for experienced authors, with a discoverable shortcut reference and conflict-safe bindings.                                  |
| EN-16 | Low      | Add a theme preview sandbox showing article, card, form, status, and chart components before a global theme is published.                                           |
| EN-17 | Low      | Add exportable design tokens/custom CSS under strict validation for advanced self-hosters, with a safe reset path.                                                  |
| EN-18 | Low      | Add onboarding checklists tailored to admin, author, and agent roles so each account lands on a meaningful first task.                                              |

## Recommended delivery sequence

### Phase 0 — Trust and release blockers

- Repair post authorization and define visibility/role policy.
- Make non-public owner/admin retrieval and preview work.
- Repair publishing state, autosave, scheduling, and unsaved-change protection.
- Correct analytics attribution/scope and API-key secret handling.
- Restore a green `check`, unit suite, and production build.

### Phase 1 — Interaction foundations

- Build and test accessible field, button, dialog, drawer, menu/popover, toast, tabs, and tooltip primitives.
- Consolidate shells/navigation and make personal/site scope durable.
- Add loading, error, empty, and retry states at route and query boundaries.
- Move loopback server fetches into a shared authorization-aware data layer.

### Phase 2 — Primary journeys

- Rework public discovery, URL-backed search, topic/author navigation, and reading continuation.
- Redesign story management and editor around an explicit publication state machine.
- Complete account/security, site configuration, media, API-key, and admin user workflows.
- Align analytics definitions, labels, accessible presentation, and privacy policy.

### Phase 3 — Visual modernization and growth

- Create a brandable editorial design system with light/dark/system modes and meaningful presets.
- Refine typography, content density, imagery, layout fallbacks, and responsive behavior through visual regression testing.
- Complete canonical metadata, social cards, structured data, archives, RSS, and sitemap.
- Layer in subscriptions, revisions, collaboration, scheduling calendar, and other enhancements based on product priorities.

## Verification snapshot

| Check                           | Result                                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop/mobile live walkthrough | Completed with empty and populated public states plus authenticated author journeys.                                                                                                               |
| `pnpm run check`                | Failed: lint warnings plus TypeScript errors in four maintenance/admin scripts. Formatting passed.                                                                                                 |
| `pnpm run test:unit`            | Failed: **781 passed, 15 failed** across 58 files; 54 files passed and 4 failed.                                                                                                                   |
| `pnpm run build`                | Application compilation passed; production build failed during TypeScript validation in `scripts/change-password.ts` (same script/schema drift class as `check`).                                  |
| Full test suite                 | Not run. Per repository policy, E2E/integration tests must only run through `pnpm run test:full`; the audit used a temporary isolated database rather than the suite's orchestrated test database. |

## Closing assessment

OpenBlog does not need a cosmetic reskin first. It needs one coherent model for identity, authorization, content state, navigation scope, and system feedback. Once those foundations are reliable and accessible, the visual layer can move from “consistent dark UI” to a genuinely distinctive, customizable editorial product without preserving the present workflow debt underneath it.
