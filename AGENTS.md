<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# General Principles

- **Prioritize Quality**: Always prioritize code quality, security, and test coverage.
- **Standards**: Follow established project standards and accessibility requirements for all UI components.
- **Communication**: Maintain clear, technical communication and escalate blocking issues immediately.

---

# CLI Tooling & Workflows

Use the following scripts to maintain code quality and format standards:

| Command               | Action         | Description                                                  |
| :-------------------- | :------------- | :----------------------------------------------------------- |
| `pnpm run check`      | **Check All**  | Runs Lint, Format, and Type checks without modifying files.  |
| `pnpm run lint:fix`   | **Lint Fix**   | Automatically resolves fixable ESLint errors.                |
| `pnpm run format:fix` | **Format Fix** | Runs Prettier to format code according to project standards. |

---

# Testing Mandates

Before creating or fixing tests, **you must read `TESTING_BEST_PRACTICES.md`**.

**Core Directives:**

- **Never mock API routes:** Import the actual route handlers and test them natively.
- **Mock only external dependencies:** Restrict mocks to boundaries like `next/server`, DB, or Auth.
- **E2E tests require a real database:** The test database must be running in Docker.

**Test Execution:**

- `pnpm run test:unit`: Runs fast, isolated unit tests.
- `pnpm run test:full`: Runs the complete suite (Unit + E2E).
- **Crucial Rule:** Never run `test:e2e` or `test:integration` directly; it is exclusively meant to be orchestrated internally by `test:full`.

---

# Session Documentation

Document all tasks, decisions, and progress in dedicated session markdown files to maintain a clear audit trail.

**File Naming Convention:** `sessions/YYYY-MM-DD_phaseN-description.md`

**Required Content Structure:**

- **Session Metadata:** Date and high-level description.
- **Task Status:** Clear delineation of what is completed vs. in progress.
- **Architecture & Logic:** Technical decisions made and the rationale behind them.
- **Blockers:** Issues encountered and their specific resolutions.
- **Verification:** Testing results and coverage reports.
- **Handoff:** Next steps and recommendations for the subsequent session.
