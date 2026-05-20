# Integration Test Status

## Current Test Results

- **Unit tests**: 682 passing
- **Integration tests**: ~70-80 passing, ~90 failing (varies run to run)

## Known Issues

### 1. Test Isolation Problem

When all integration test files run together, many fail. However, when each test file is run individually, most tests pass. This suggests a test isolation issue related to:

- Database state sharing between tests
- Prisma client connection handling
- Cleanup timing between tests

### 2. Test Files

The following integration test files exist:

- `posts-create.test.ts` - POST /api/posts tests
- `posts-update.test.ts` - PUT /api/posts/[slug] tests
- `posts-delete.test.ts` - DELETE /api/posts/[slug] tests
- `posts-related.test.ts` - GET /api/posts/[slug]/related tests
- `userprofile.test.ts` - UserProfile role tests

### 3. Types of Failures

- FK constraint errors when creating users/profiles
- Assertion errors (wrong status codes returned)
- Tests that create posts directly work, but tests that call API routes fail

## Root Causes

1. **Prisma client sharing**: The global Prisma client may not be properly isolated between test files
2. **Cleanup timing**: Database cleanup may be happening at wrong times
3. **Vitest worker issues**: Tests may be running in same worker and interfering

## Possible Fixes

1. **Sequential test execution**: Run each test file in a separate process
2. **Fresh Prisma client per test**: Create new client for each test instead of using global
3. **Improved cleanup**: Ensure database cleanup happens correctly between tests
4. **Test environment isolation**: Use vitest's --isolate option or similar

## Note

The unit tests (682) all pass. The integration test failures appear to be environmental/test infrastructure issues rather than bugs in the application code itself.
