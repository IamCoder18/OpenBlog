# Test Coverage Audit Report

**Date:** 2026-04-25  
**Project:** OpenBlog  
**Scope:** Comprehensive test coverage analysis and identification of mock-only tests

---

## Executive Summary

This audit reveals significant gaps in test coverage across the OpenBlog codebase. While there are 44 test files, many critical source files lack tests entirely, and several existing tests violate the project's own `TESTING_BEST_PRACTICES.md` by testing mocks rather than real code (the "Mocking Trap").

**Key Findings:**

- ~25 source files completely untested (API routes, components, lib utilities)
- Critical "mocking trap" violations in API test files
- 30+ test failures in current test run
- Syntax errors in 2 source files blocking test execution

---

## 1. Current Test Infrastructure

### Testing Framework Stack

| Layer           | Tool                            | Environment  | Config File                    |
| --------------- | ------------------------------- | ------------ | ------------------------------ |
| **Unit**        | Vitest 4.1.0                    | jsdom        | `vitest.config.ts`             |
| **Integration** | Vitest 4.1.0                    | node         | `vitest.integration.config.ts` |
| **E2E**         | Playwright 1.58.2               | real browser | `e2e.config.ts`                |
| **Component**   | Vitest + @testing-library/react | jsdom        | `vitest.config.ts`             |

### Test Scripts

- `pnpm run test:unit` - Unit tests (vitest --run)
- `pnpm run test:integration` - Integration tests
- `pnpm run test:e2e` - E2E tests (requires Docker DB)
- `pnpm run test:full` - Complete suite via `scripts/test-full.sh`

---

## 2. Existing Test Files (44 files)

### API Tests (13 files in `src/__tests__/api/`)

| Test File                   | Lines   | Status                                       |
| --------------------------- | ------- | -------------------------------------------- |
| `posts.post.test.ts`        | 1465    | ⚠️ Heavy mocking - tests mocks not real code |
| `posts.get.test.ts`         | unknown | ✅ Exists                                    |
| `posts.slug.get.test.ts`    | unknown | ✅ Exists                                    |
| `posts.slug.put.test.ts`    | unknown | ✅ Exists                                    |
| `posts.slug.delete.test.ts` | unknown | ✅ Exists                                    |
| `auth.test.ts`              | 1617+   | ⚠️ Mocks entire better-auth API              |
| `keys.test.ts`              | unknown | ✅ Exists                                    |
| `analytics.test.ts`         | unknown | ✅ Exists                                    |
| `sitemap.test.ts`           | unknown | ✅ Exists                                    |
| `sitemap-rss.test.ts`       | unknown | ✅ Exists                                    |
| `feed-xml.test.ts`          | unknown | ✅ Exists                                    |
| `userprofile.test.ts`       | unknown | ✅ Exists                                    |
| `admin-set-role.test.ts`    | unknown | ✅ Exists                                    |

### Component Tests (14 files in `src/__tests__/components/`)

| Test File                     | Status                                     |
| ----------------------------- | ------------------------------------------ |
| `Dashboard.test.tsx`          | ✅ Exists (6 tests, 1 failing)             |
| `ExplorePage.test.tsx`        | ✅ Exists                                  |
| `LoginPage.test.tsx`          | ❌ 15 tests failing                        |
| `SignupPage.test.tsx`         | ❌ 15 tests failing                        |
| `Navbar.test.tsx`             | ❌ 4 tests failing                         |
| `Footer.test.tsx`             | ❌ 1 test failing                          |
| `EditorClient.test.tsx`       | ❌ Fails to parse (syntax error in source) |
| `SettingsPage.test.tsx`       | ✅ Exists                                  |
| `LoadMorePosts.test.tsx`      | ❌ 1 test failing                          |
| `NotFound.test.tsx`           | ✅ Exists                                  |
| `MobileBottomNav.test.tsx`    | ❌ 2 tests failing                         |
| `RelatedPostsClient.test.tsx` | ❌ Fails to parse (syntax error in source) |
| `LatexRenderer.test.tsx`      | ✅ Exists                                  |
| `admin/Sidebar.test.tsx`      | ❌ 4 tests failing                         |

### Integration Tests (5 files in `src/__tests__/integration/`)

| Test File               | Lines   | Approach                   |
| ----------------------- | ------- | -------------------------- |
| `posts-create.test.ts`  | 1103    | ✅ Uses real database      |
| `posts-update.test.ts`  | unknown | ✅ Uses real database      |
| `posts-delete.test.ts`  | unknown | ✅ Uses real database      |
| `posts-related.test.ts` | unknown | ✅ Related posts algorithm |
| `userprofile.test.ts`   | unknown | ✅ Profile integration     |

### E2E Tests (7 files in `src/__tests__/e2e/`)

| Test File                  | Lines   | Coverage              |
| -------------------------- | ------- | --------------------- |
| `posts.e2e.test.ts`        | 1972    | Full post workflows   |
| `public-blog.e2e.test.ts`  | unknown | Public blog rendering |
| `session.e2e.test.ts`      | unknown | Session management    |
| `security.e2e.test.ts`     | unknown | Security tests        |
| `api-key.e2e.test.ts`      | unknown | API key E2E           |
| `userprofile.e2e.test.ts`  | unknown | User profile E2E      |
| `feed-sitemap.e2e.test.ts` | unknown | Feed and sitemap      |

### Lib Tests (2 files in `src/__tests__/lib/`)

| Test File          | Lines   | Coverage                                |
| ------------------ | ------- | --------------------------------------- |
| `markdown.test.ts` | 566     | ✅ Good - tests real markdown rendering |
| `config.test.ts`   | unknown | ✅ Exists                               |

---

## 3. Critical Finding: Tests That Test Mocks (Mocking Trap)

Per `TESTING_BEST_PRACTICES.md`:

> "A critical anti-pattern is deep mocking of application logic. When you mock the functionality you are trying to verify, you test the mock's implementation, not the codebase."

### Violating Test Files

#### 3.1 `src/__tests__/api/posts.post.test.ts` (1465 lines)

**Mocking Violations:**

- Mocks entire Prisma client with in-memory implementation (`mockedPrisma`)
- Mocks `NextRequest`/`NextResponse` with custom classes
- Mocks `next/headers`
- Mocks `@/auth` (better-auth)
- Mocks `../utils/test-utils` (setupTestDatabase, cleanupDatabase, createUser, createPost)

**Evidence (lines 69-214):**

```typescript
const { mockedPrisma, mockPrismaReset } = vi.hoisted(() => {
  const mockPosts: any[] = [];
  const mockUsers: any[] = [];
  // ... re-implements Prisma filtering, sorting, pagination
  const prisma = {
    post: {
      findUnique: vi.fn(async (options: any) => {
        return mockPosts.find(p => p.slug === options?.where?.slug) || null;
      }),
      create: vi.fn(async (data: any) => {
        // ... implements create logic in mock
      }),
      findMany: vi.fn(async () => {
        return mockPosts.filter(p => p.visibility === "PUBLIC");
      }),
      // ... more mock implementations
    },
    // ... more mocked models
  };
  return { mockedPrisma: prisma, ... };
});
```

**Problem:** The test creates a fake database in JavaScript that tries to mimic Prisma/PostgreSQL behavior. This doesn't test the actual code - it tests the mock's behavior.

#### 3.2 `src/__tests__/__mocks__/db.ts` (187 lines)

**This file IS the mocking trap implementation:**

```typescript
export const prisma = {
  post: {
    findMany: vi.fn(async (options: any) => {
      let results = mockPosts.filter(p => p.visibility === "PUBLIC");
      // Re-implements filtering, sorting, pagination in JavaScript
      if (options?.where?.metadata?.tags?.hasSome) { ... }
      if (options?.orderBy?.publishedAt === "desc") { ... }
      return results.slice(skip, skip + take);
    }),
    // ... more mock implementations
  },
};
```

**Why This Is Bad:**

1. If PostgreSQL `orderBy` behavior differs from JavaScript `sort()`, tests pass but real code fails
2. If Prisma `hasSome` filtering logic changes, mock won't reflect it
3. Tests give false confidence

#### 3.3 `src/__tests__/api/auth.test.ts` (1617+ lines)

**Mocking Violations:**

- Mocks entire better-auth API
- Tests the mocks rather than real auth behavior
- Should use integration test approach with real auth

---

## 4. Untested Source Files

### 4.1 API Routes Without Tests

| Source File                            | Purpose                | Priority                      |
| -------------------------------------- | ---------------------- | ----------------------------- |
| `src/app/api/render-markdown/route.ts` | Markdown rendering API | **HIGH**                      |
| `src/app/api/profile/route.ts`         | User profile API       | **HIGH**                      |
| `src/app/api/profile/role/route.ts`    | Profile role API       | **HIGH**                      |
| `src/app/api/settings/theme/route.ts`  | Theme settings         | **MEDIUM**                    |
| `src/app/api/users/route.ts`           | User management        | **HIGH**                      |
| `src/app/api/keys/[id]/route.ts`       | API key by ID          | **HIGH**                      |
| `src/app/api/auth/[...all]/route.ts`   | Auth catch-all route   | **HIGH**                      |
| `src/app/api/analytics/route.ts`       | Analytics endpoints    | ⚠️ Has test but may need more |
| `src/app/feed.xml/route.ts`            | Feed XML generation    | **MEDIUM**                    |
| `src/app/sitemap.ts`                   | Sitemap generation     | **MEDIUM**                    |

### 4.2 Components Without Tests (~20 components)

| Source File                                      | Purpose                | Priority   |
| ------------------------------------------------ | ---------------------- | ---------- |
| `src/components/AnalyticsTracker.tsx`            | Page view tracking     | **MEDIUM** |
| `src/components/ClientProviders.tsx`             | React providers        | **LOW**    |
| `src/components/LogoutButton.tsx`                | Logout functionality   | **MEDIUM** |
| `src/components/MobileBackButton.tsx`            | Mobile navigation      | **LOW**    |
| `src/components/QueryToast.tsx`                  | Toast notifications    | **MEDIUM** |
| `src/components/ShareButton.tsx`                 | Social sharing         | **MEDIUM** |
| `src/components/ToastContext.tsx`                | Toast state management | **MEDIUM** |
| `src/components/DesktopBackLink.tsx`             | Desktop navigation     | **LOW**    |
| `src/components/dashboard/DashboardSettings.tsx` | Settings UI            | **MEDIUM** |
| `src/components/dashboard/DashboardStories.tsx`  | Stories list           | **MEDIUM** |
| `src/components/dashboard/ViewsChart.tsx`        | Analytics chart        | **MEDIUM** |
| `src/components/admin/DateRangeSelector.tsx`     | Date filtering         | **MEDIUM** |
| `src/components/admin/DeleteModal.tsx`           | Delete confirmation    | **MEDIUM** |
| `src/components/admin/SettingsClient.tsx`        | Admin settings         | **MEDIUM** |
| `src/components/admin/StoriesList.tsx`           | Admin stories          | **MEDIUM** |
| `src/components/agent/AgentApiKeys.tsx`          | Agent API keys         | **MEDIUM** |
| `src/components/agent/AgentProfileSettings.tsx`  | Agent profile          | **MEDIUM** |
| `src/components/agent/AgentSidebar.tsx`          | Agent sidebar          | **MEDIUM** |
| `src/components/ExploreClient.tsx`               | Explore page client    | **MEDIUM** |
| `src/app/explore/ExploreClient.tsx`              | Explore client logic   | **MEDIUM** |

### 4.3 Lib Files Without Tests

| Source File                 | Purpose                       | Priority   |
| --------------------------- | ----------------------------- | ---------- |
| `src/lib/api-error.ts`      | API error handling (86 lines) | **HIGH**   |
| `src/lib/api-fetch.ts`      | Fetch wrapper (52 lines)      | **HIGH**   |
| `src/lib/auth.ts`           | Auth configuration            | **HIGH**   |
| `src/lib/session.ts`        | Session management (66 lines) | **HIGH**   |
| `src/lib/hooks.ts`          | Custom hooks (29 lines)       | **MEDIUM** |
| `src/lib/strip-markdown.ts` | Markdown stripping (36 lines) | **HIGH**   |
| `src/lib/db.ts`             | Database client               | **HIGH**   |

### 4.4 App Pages Without Tests

| Source File                         | Purpose             | Priority   |
| ----------------------------------- | ------------------- | ---------- |
| `src/app/page.tsx`                  | Home page           | **MEDIUM** |
| `src/app/layout.tsx`                | Root layout         | **LOW**    |
| `src/app/blog/[slug]/page.tsx`      | Blog post page      | **HIGH**   |
| `src/app/blog/[slug]/not-found.tsx` | Blog not found      | **LOW**    |
| `src/app/agent/*`                   | All agent pages     | **MEDIUM** |
| `src/app/dashboard/*`               | All dashboard pages | **MEDIUM** |
| `src/app/auth/*`                    | Auth pages          | **MEDIUM** |
| `src/app/not-found.tsx`             | Global not found    | **LOW**    |

---

## 5. Current Test Failures (30+ failing tests)

### 5.1 Syntax Errors Blocking Tests

| File                                            | Error                               | Impact                               |
| ----------------------------------------------- | ----------------------------------- | ------------------------------------ |
| `src/components/RelatedPostsClient.tsx`         | JSX syntax errors (mismatched tags) | Blocks `RelatedPostsClient.test.tsx` |
| `src/app/dashboard/editor/EditorClient.tsx:886` | `Expected ',' got 'Identifier'`     | Blocks `EditorClient.test.tsx`       |

### 5.2 Component Test Failures

| Test File                  | Failures      | Root Cause                                              |
| -------------------------- | ------------- | ------------------------------------------------------- |
| `LoginPage.test.tsx`       | 15/15 failing | MSW not intercepting/auth mock issues                   |
| `SignupPage.test.tsx`      | 15/15 failing | Same as above                                           |
| `Navbar.test.tsx`          | 4/18 failing  | Class name mismatch (bg-violet-500/10 vs bg-primary/10) |
| `admin/Sidebar.test.tsx`   | 4/12 failing  | Same class name issue                                   |
| `Footer.test.tsx`          | 1/5 failing   | Missing copyright text "© 2026 OpenBlog"                |
| `Dashboard.test.tsx`       | 1/6 failing   | Footer rendering issue                                  |
| `LoadMorePosts.test.tsx`   | 1/30 failing  | Spinner not showing                                     |
| `MobileBottomNav.test.tsx` | 2/23 failing  | Icon props mismatch                                     |

### 5.3 API Test Failures

| Test File            | Failure      | Root Cause                                                      |
| -------------------- | ------------ | --------------------------------------------------------------- |
| `posts.post.test.ts` | 1/89 failing | "should return 201 with code blocks" - expects 201 but gets 400 |

---

## 6. Recommended Actions

### 6.1 Immediate (Critical)

1. **Fix Syntax Errors** (BLOCKING - cannot test until fixed)
   - `RelatedPostsClient.tsx` - Fix JSX tag mismatch (lines 141-152)
   - `EditorClient.tsx:886` - Fix parsing error with div className

2. **Rewrite Mock-Heavy Tests**
   - `posts.post.test.ts` - Should follow integration test pattern (use real DB)
   - `auth.test.ts` - Should test real auth behavior
   - Delete or refactor `__mocks__/db.ts` - Violates TESTING_BEST_PRACTICES.md

### 6.2 High Priority (Add Missing Tests)

1. **API Routes:**
   - Create `src/__tests__/api/render-markdown.test.ts`
   - Create `src/__tests__/api/profile.test.ts`
   - Create `src/__tests__/api/profile.role.test.ts`
   - Create `src/__tests__/api/users.test.ts`
   - Create `src/__tests__/api/keys.[id].test.ts`

2. **Lib Files:**
   - Create `src/__tests__/lib/api-error.test.ts`
   - Create `src/__tests__/lib/api-fetch.test.ts`
   - Create `src/__tests__/lib/session.test.ts`
   - Create `src/__tests__/lib/strip-markdown.test.ts` (only 36 lines, easy win)

### 6.3 Medium Priority

1. **Components:** Add tests for ~20 untested components
2. **Fix existing test failures:** Update tests to match current class names (primary vs violet)

---

## 7. Compliance with TESTING_BEST_PRACTICES.md

### ✅ Good Practices Found

- `src/__tests__/lib/markdown.test.ts` - Tests real markdown rendering
- Integration tests use real database
- Component tests use MSW for API mocking

### ❌ Violations Found

1. **"Do Not Mock Pure Business Logic"** - VIOLATED in `posts.post.test.ts`
2. **"Avoid Second Database Mocks"** - VIOLATED in `__mocks__/db.ts`
3. **"Do Not Mock Route Handlers"** - VIOLATED in multiple API tests

---

## 8. Coverage Summary

| Category   | Files   | Tested | Untested | Coverage % |
| ---------- | ------- | ------ | -------- | ---------- |
| API Routes | 16      | 10     | 6        | 62.5%      |
| Components | 34      | 14     | 20       | 41%        |
| Lib Files  | 8       | 2      | 6        | 25%        |
| App Pages  | 20+     | 0      | 20+      | ~0%        |
| **Total**  | **78+** | **26** | **52+**  | **~33%**   |

---

## 9. Appendix: Full Untested File List

### API Routes

```
src/app/api/render-markdown/route.ts
src/app/api/profile/route.ts
src/app/api/profile/role/route.ts
src/app/api/settings/theme/route.ts
src/app/api/users/route.ts
src/app/api/keys/[id]/route.ts
src/app/api/auth/[...all]/route.ts
```

### Components

```
src/components/AnalyticsTracker.tsx
src/components/ClientProviders.tsx
src/components/LogoutButton.tsx
src/components/MobileBackButton.tsx
src/components/QueryToast.tsx
src/components/ShareButton.tsx
src/components/ToastContext.tsx
src/components/DesktopBackLink.tsx
src/components/dashboard/DashboardSettings.tsx
src/components/dashboard/DashboardStories.tsx
src/components/dashboard/ViewsChart.tsx
src/components/admin/DateRangeSelector.tsx
src/components/admin/DeleteModal.tsx
src/components/admin/SettingsClient.tsx
src/components/admin/StoriesList.tsx
src/components/agent/AgentApiKeys.tsx
src/components/agent/AgentProfileSettings.tsx
src/components/agent/AgentSidebar.tsx
src/components/ExploreClient.tsx
```

### Lib Files

```
src/lib/api-error.ts
src/lib/api-fetch.ts
src/lib/auth.ts
src/lib/session.ts
src/lib/hooks.ts
src/lib/strip-markdown.ts
src/lib/db.ts
```

---

**Report Generated:** 2026-04-25  
**Next Steps:** Address critical syntax errors first, then systematically add tests for untested files.
