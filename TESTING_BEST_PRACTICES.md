# Testing Best Practices

## Overview

This document outlines the testing strategy and best practices for OpenBlog. The primary goal of our testing suite is to verify actual application behavior, ensure data integrity, and catch real regressions. To achieve this, we prioritize testing real code over testing mock implementations, actively avoiding the "Mocking Trap."

---

## Architecture & Test Layers

| Layer                 | Tool         | What to Test                                                                                    | Mocking Strategy                                                                                                                                                   |
| :-------------------- | :----------- | :---------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**              | Vitest       | Pure functions, algorithms, basic utilities (e.g., string manipulation).                        | **Shallow mocks only.** Mock external network boundaries (e.g., Auth service APIs) or simple DB CRUD. **Do not mock** pure business logic like Markdown rendering. |
| **Integration / API** | Vitest       | Route handlers, DB queries, authentication flow, pure business logic integration.               | **Shallow mocks only.** Mock external network boundaries (e.g., Auth service APIs) or simple DB CRUD. **Do not mock** pure business logic like Markdown rendering. |
| **Component**         | Vitest + RTL | React UI components, state changes, rendering logic.                                            | **Network boundaries only.** Use MSW (Mock Service Worker) to intercept API calls. Do not mock `fetch` directly.                                                   |
| **E2E**               | Playwright   | Full user workflows, rendering engine DOM output, complex database logic (e.g., Related Posts). | **Zero mocks.** Use a real Dockerized test database and real browser interactions.                                                                                 |

---

## 🚨 The "Mocking Trap": What NOT to Mock

A critical anti-pattern is deep mocking of application logic. When you mock the functionality you are trying to verify, you test the mock's implementation, not the codebase.

### 1. Do Not Mock Pure Business Logic

Functions that transform data without side effects must **never** be mocked in API or Integration tests.

- **❌ BAD:** Mocking `@/lib/markdown` (`renderMarkdown`) in Post creation/update tests. This bypasses the actual rendering and sanitization logic, hiding potential XSS vulnerabilities or broken LaTeX rendering.
- **✅ GOOD:** Let the API route call the real `renderMarkdown` function and assert that the resulting `bodyHtml` contains the correctly transformed elements.

### 2. Avoid "Second Database" Mocks

Do not build complex in-memory database mocks that replicate Prisma's behavior (filtering, sorting, pagination, `hasSome` tags).

- **❌ BAD:** Re-implementing Prisma's `orderBy` or relation filtering inside a `mockedPrisma` object for unit tests. If the mock logic differs from real Postgres logic, the test is deceptive.
- **✅ GOOD:** For simple CRUD, a shallow Prisma spy (`vi.fn().mockResolvedValue`) is acceptable. For complex data retrieval (like the "Related Posts" algorithm), write an **Integration/E2E test against a real test database**.

### 3. Do Not Mock Route Handlers

- **❌ BAD:** `vi.mock("@/app/api/posts/route", () => ({ POST: vi.fn() }));`
- **✅ GOOD:** Import the real route handler (`import { POST } from "@/app/api/posts/route";`) and pass it a constructed `NextRequest` object.

---

## API Route Tests

When testing API routes, test the integration of the handler with its internal dependencies.

```typescript
// ✅ GOOD - Import the real route and only mock the strict boundary (e.g., the DB call, not the rendering logic)
import { POST } from "@/app/api/posts/route";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/posts", () => {
  it("creates a post and successfully renders markdown to HTML", async () => {
    // The DB is mocked, but the markdown rendering engine is REAL
    prisma.post.create.mockResolvedValue({ id: "1" });

    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "Test",
        slug: "test",
        bodyMarkdown: "# Hello World",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    // Verifying real business logic ran
    expect(data.bodyHtml).toContain("<h1>Hello World</h1>");
  });
});
```

---

## Component Tests (UI)

Use MSW (Mock Service Worker) for all component-level API mocking. Do not mutate `global.fetch`. MSW intercepts requests at the network level, providing a realistic environment for React components.

```typescript
// ✅ GOOD
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("/api/posts", () => {
    return HttpResponse.json({ posts: [], total: 0, limit: 10, offset: 0 });
  })
);
```

## Running Tests

### Local Execution

```bash
# Run unit tests (Fast)
pnpm run test:unit

# Run unit + integration + E2E Tests
pnpm run test:full
```

**Note on E2E testing:** Never execute `npm run test:e2e` or `npm run test:integration` manually. This script is intended solely for internal orchestration by the `test:full` command to ensure the environment (like the dev server on port 3001) is properly staged and torn down.

---

## Agent Checklist

Verify:

- [ ] **No Route Mocking:** I am importing real route handlers in my API tests.
- [ ] **No Logic Mocking:** I have not mocked pure business logic like `@/lib/markdown`. The rendering engine runs natively in my API tests.
- [ ] **No DB Re-implementation:** I am not building complex filtering/sorting logic into `mockedPrisma`. Complex queries are covered by E2E/Integration tests.
- [ ] **MSW for UI:** I am using MSW to mock network requests in React components, not `global.fetch`.
- [ ] **E2E Orchestration:** I am running `pnpm run test:full` to test workflows, rather than bypassing environment setups with direct `test:e2e` calls.
