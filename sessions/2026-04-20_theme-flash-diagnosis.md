# Theme Flash Issue Diagnosis

**Date:** 2026-04-20  
**Issue:** Theme flashes correctly from server for a second, then switches to old theme stored in localStorage

---

## Root Cause

The issue is a **race condition** in `ClientProviders.tsx` where client-side JavaScript unconditionally overrides the server-rendered theme with a locally stored one.

### The Flow Causing the Flash:

1. **Server Render (Correct):**
   - `getTheme()` fetches the **current** theme from the database (e.g., "midnight")
   - Server outputs: `<html data-theme="midnight">`
   - User sees the correct server theme initially

2. **Client Hydration Begins:**
   - React hydrates on the client
   - `ClientProviders` component renders
   - `ThemeBootstrap` component runs its `useEffect`

3. **The Problem (useEffect runs AFTER first paint):**

   ```tsx
   // ClientProviders.tsx lines 6-18
   function ThemeBootstrap() {
     useEffect(() => {
       const stored = localStorage.getItem("openblog-theme"); // "default" (old theme)
       const serverTheme = document.documentElement.getAttribute("data-theme"); // "midnight"

       if (stored && stored !== serverTheme) {
         document.documentElement.setAttribute("data-theme", stored); // OVERRIDES to "default"!
       }
       // ...
     }, []);
   }
   ```

4. **The Flash:**
   - Server renders with "midnight" theme → user sees correct theme
   - useEffect runs after hydration → overrides to "default" from localStorage
   - Result: 1-second flash of server theme, then revert to old localStorage theme

---

## Why This Happens

The logic in `ThemeBootstrap` is **inverted**:

| Current Logic                            | Intent                         | Actual Behavior                         |
| ---------------------------------------- | ------------------------------ | --------------------------------------- |
| If `stored !== serverTheme` → use stored | "Preserve user's local choice" | Overrides server with stale local value |

The code assumes localStorage holds the user's preferred theme and should win over server. But when an admin changes the site theme in settings, the server returns the new theme while localStorage still has the old one.

---

## Key Files Involved

| File                                              | Role                                        |
| ------------------------------------------------- | ------------------------------------------- |
| `src/app/layout.tsx` (line 52)                    | Server renders `data-theme={theme}` from DB |
| `src/components/ClientProviders.tsx` (lines 6-18) | Client-side theme override logic            |
| `src/lib/config.ts` (lines 47-53)                 | `getTheme()` fetches from database          |

---

## Proposed Fix Direction

The logic should be **server-first**, not client-first:

- The server theme from the database should always win
- localStorage should only be updated to match the server, never used to override it

This is a logic inversion bug, not a timing issue.

---

## Not a Cookie Issue

- Theme is stored in **localStorage** only (key: `openblog-theme`)
- No cookies involved in theme storage

---

## Resolution

**Fixed in:** `src/components/ClientProviders.tsx` (lines 6-15)

**Before (buggy):**

```tsx
if (stored && stored !== serverTheme) {
  document.documentElement.setAttribute("data-theme", stored);
} else if (serverTheme) {
  localStorage.setItem("openblog-theme", serverTheme);
}
```

**After (fixed):**

```tsx
if (serverTheme && stored !== serverTheme) {
  localStorage.setItem("openblog-theme", serverTheme);
}
```

**How it works now:**

- Server always provides the correct theme via `data-theme` attribute
- Client only syncs localStorage to match the server (never overrides)
- No flash occurs because server theme is already applied before JavaScript runs
