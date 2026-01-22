# Respect Origin Cache-Control with Dev Override

## Summary

Replace the per-translation `proxied_cache` override with logic that respects the origin's Cache-Control header (with a 5-minute minimum for static assets). Add a website-level dev override to temporarily disable caching for all content.

## Why

| Current | Proposed |
|---------|----------|
| `translation.proxied_cache` overrides origin | Respect origin Cache-Control |
| No minimum cache time | 5-minute floor for static assets |
| No dev override | `website.cache_disabled_until` timestamp |

## Phase 1: Pre-Deploy Database Migration

**Goal:** Add new column before deploying code changes

- [x] Add `cache_disabled_until` column to `website` table

```sql
-- Add cache_disabled_until to website table
ALTER TABLE website ADD COLUMN IF NOT EXISTS cache_disabled_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN website.cache_disabled_until IS
  'When set and > NOW(), forces Cache-Control: no-cache on all proxied content';
```

## Phase 2: Update Database Package

**Goal:** Update TranslationConfig interface and query

- [x] Remove `proxiedCache` from `TranslationConfig` interface
- [x] Add `cacheDisabledUntil: Date | null` to interface
- [x] Update SQL query to fetch `w.cache_disabled_until` instead of `t.proxied_cache`
- [x] Map to `cacheDisabledUntil` in the config object

## Phase 3: Implement Cache Control Logic

**Goal:** Extract cache logic to testable module with new behavior

- [x] Create `apps/translate/src/utils/cache-control.ts`
- [x] Implement `getCacheControl()` function with:
  - Dev override check (cacheDisabledUntil in future → 'no-cache')
  - Static assets: 5-min minimum, respect origin when >= 5 min
  - HTML: pass through origin Cache-Control or default to 'no-cache'
- [x] Update `apps/translate/src/index.ts`:
  - Import `getCacheControl`
  - Use for static asset caching
  - Use for non-HTML content proxying
  - Use for HTML responses

## Phase 4: Unit Tests

**Goal:** Test cache control logic

- [x] Create `apps/translate/src/utils/cache-control.test.ts`
- [x] All 30 tests passing (including API/data format tests)

## Phase 4b: API/Data Format Handling

**Goal:** Ensure JSON/XML API responses respect origin cache instead of enforcing 5-min minimum

- [x] Add `isDataFileExtension()` helper for `.json`, `.xml` file extensions
- [x] Add `isDataContentType()` helper for `application/json`, `application/xml`, `text/xml`
- [x] Update static asset path to use `!isDataFileExtension(pathname)` for `applyMinimumCache`
- [x] Update non-HTML Content-Type path to use `!isDataContentType(contentType)` for `applyMinimumCache`

## Phase 4c: Directive Preservation

**Goal:** Preserve useful Cache-Control directives from origin

- [x] When max-age >= 5 min: pass through entire origin header (preserves `immutable`, `stale-while-revalidate`, `private`, etc.)
- [x] When enforcing 5-min minimum: preserve `private` and `no-transform` directives
- [x] All 36 tests passing

## Phase 5: Post-Deploy Database Migration (PENDING)

**Goal:** Remove unused column after code is deployed

- [ ] Deploy code changes to production
- [ ] Verify cache control working correctly
- [ ] Remove `proxied_cache` column from `translation` table:

```sql
-- Remove proxied_cache from translation table (now unused)
ALTER TABLE translation DROP COLUMN IF EXISTS proxied_cache;
```

## Verification

1. Run unit tests: `pnpm test` - all cache-control tests pass
2. Manual testing:
   - Set `cache_disabled_until` via SQL to future timestamp
   - Verify translate app returns `Cache-Control: no-cache` on all responses
   - Set to null or past timestamp
   - Verify static assets get 5-min minimum
   - Test with origin that sends various Cache-Control values

Note: Translation config has 60-second in-memory cache, so changes may take up to 60 seconds to take effect.

## Out of Scope

- Dashboard UI for toggling dev cache override (no website settings UI exists yet)
- Will test via direct SQL until UI is built

## Decisions Made

- **5-min minimum**: Static assets only, excluding data formats (HTML and APIs respect origin)
- **Data formats**: `.json`, `.xml` extensions and `application/json`, `application/xml`, `text/xml` Content-Types respect origin cache
- **Directive preservation**: Pass through origin header when max-age >= 5 min; preserve `private` and `no-transform` when enforcing minimum
- **Configurability**: Hardcoded 5-min is sufficient for now
- **Dev override header**: Simple `no-cache` (not overly aggressive)
- **Origin no-cache/max-age=0 for static**: Override to 5 min (use dev override if fresh content needed)
