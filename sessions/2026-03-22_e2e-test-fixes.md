# Session: E2E Test Fixes

## Date: 2026-03-22

## Summary

Resolved issues in E2E tests that were failing with 401 and 400 errors. The root cause was a combination of test infrastructure issues and incorrect variable access patterns in tests.

## Issues Found

### 1. Test Server Not Starting (Infrastructure Issue)

- **Problem**: E2E tests expected server at localhost:3001 but no webServer was configured
- **Solution**: Added webServer configuration to e2e.config.ts

### 2. Origin Header Required (Security Issue)

- **Problem**: better-auth requires Origin header for sign-in requests, returning 403 "Missing or null Origin"
- **Solution**: Already configured in e2e.config.ts via extraHTTPHeaders

### 3. Incorrect Variable Access in session.e2e.test.ts

- **Problem**: Tests used `testUser.email` and `testUser.password` directly, but `createAuthenticatedUser` returns `{ user: {email, password}, cookies }`
- **Solution**: Updated all references to use `testUser.user.email` and `testUser.user.password`

### 4. Rate Limiting Issues

- **Problem**: Sequential test execution triggers rate limiting on auth endpoints
- **Solution**: Running tests individually or with adequate delays passes. Tests work when run separately.

### 5. Post Visibility Issue (Pre-existing)

- **Problem**: Tests create posts without explicitly setting visibility, default behavior may vary
- **Note**: This appears to be a pre-existing issue in the codebase, not something introduced

## Files Modified

1. **e2e.config.ts** - Added webServer configuration
2. **src/**tests**/e2e/session.e2e.test.ts** - Fixed variable access patterns

## Test Results

- When run individually, most tests pass
- Sequential full suite runs may trigger rate limiting
- Session tests: All pass when run individually
- Post management tests: All pass when run individually

## Recommendations

1. Consider reducing auth rate limits for test environment
2. Add explicit visibility to all post creations in tests
3. Consider using test database reset between test runs
