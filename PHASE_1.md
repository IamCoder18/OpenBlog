# Phase 1: Infrastructure & Core Setup

## Objective

Establish the foundational infrastructure for OpenBlog, including the Next.js application framework, database schema, authentication system, and environment configuration. This phase creates the platform upon which all subsequent features depend.

---

## Scope

### Deliverables

1. **Next.js Application**
   - Initialized Next.js 14+ project with TypeScript
   - App Router architecture
   - Tailwind CSS configured

2. **Postgres Database**
   - Users table (id, credentials, roles, api_keys)
   - Posts table (title, body_markdown, body_html, visibility, author_id, timestamps)
   - Metadata table (seo_description, tags, slug)

3. **Authentication**
   - BetterAuth integration
   - Session management
   - Role-based access (Admin/Agent)

4. **Environment Configuration**
   - Configuration system for BLOG_NAME, BASE_URL, PORT, DATABASE_URL
   - Environment variable validation

---

## UI/UX Governance

**This phase has minimal UI work.** Any UI components created during setup must strictly follow DESIGN.md:

- Use the color palette defined in DESIGN.md (surface #131315, primary #d2bbff, etc.)
- Apply Manrope for headlines, Inter for body text
- Implement the "No-Line Rule": no 1px solid borders for sectioning
- Use surface hierarchy (surface-container-low, surface-container, etc.) for layering
- Apply 4px minimum border radius (0.25rem / lg)

**Reference:** No UI reference files apply directly to this phase, but all future phases must reference the ui_reference folder.

---

## Agent Verification Checklist

Complete all checkpoints before proceeding to Phase 2:

- [ ] I have initialized a Next.js 14+ project with TypeScript and App Router
- [ ] I have configured Tailwind CSS with DESIGN.md color tokens
- [ ] I have set up the Postgres database with the required schema (Users, Posts, Metadata)
- [ ] I have integrated BetterAuth for authentication
- [ ] I have implemented role-based access control (Admin/Agent roles)
- [ ] I have created the environment configuration system with required variables
- [ ] I have verified that the project builds without errors
- [ ] I have verified that basic authentication flow works (sign up, sign in, sign out)

---

## Testing & Validation

### Success Criteria

| Criteria                                   | Validation Method                         |
| ------------------------------------------ | ----------------------------------------- |
| Next.js app runs in development mode       | Manual: `pnpm run dev` and browser access |
| Database schema is correctly initialized   | Database migration verification           |
| Authentication registers and logs in users | Manual testing with test accounts         |
| Environment variables load correctly       | Log verification on startup               |
| TypeScript compiles without errors         | `pnpm run check`                          |

### Automated Tests Required

- Database connection test
- Authentication flow test (registration, login, logout, session)
- Environment configuration validation test

---

## Technical Notes

- Use the latest stable Next.js version
- Use Prisma or Drizzle as the ORM for database interactions
- Store sensitive credentials in environment variables, never in code
- The authentication system must support both human users and agent accounts

---

## Dependencies

- None (this is the foundation phase)

---

## Next Phase Preview

Phase 2 will build upon this foundation to implement the Content Management API layer, including:

- Full CRUD operations for posts
- Markdown rendering with syntax highlighting
- LaTeX mathematical notation support
- API endpoints for all platform actions
