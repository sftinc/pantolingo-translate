# Rollback: Performance Timing Instrumentation

This document captures the timing/debug instrumentation added to diagnose slow page loads.

**Note:** During this investigation, we discovered and fixed a pathname cache bug (see section 5).
The normalization loop MUST be kept - only remove the timing/logging.

## Console.log Statements Added (Quick Reference)

| Location | Log Message |
|----------|-------------|
| src/index.ts | `  Pathname DB Lookup: ${allPathnames.size} paths (${...}ms)` |
| src/index.ts | `  Pathname Translate Batch: ${allPathnames.size} paths (${...}ms)` |
| src/index.ts | `  Translation Upsert: ${translationItems.length} items (${...}ms)` |
| src/index.ts | `  Pathname Upsert: ${pathnameUpdates.length} paths (${...}ms)` |
| src/index.ts | `  Junction: pathname ${...}ms \| lookup ${...} IDs ${...}ms \| link ${...}ms` |
| src/index.ts | `  DB Init: hostConfig ${...}ms \| pathnameLookup ${...}ms` |
| src/index.ts | `  Fetch & Parse: ... \| Cache Lookup: ${cacheLookupTime}ms` |
| src/translation/translate-pathnames.ts | `  Pathname Cache: HIT (${...}/${...})` |
| src/translation/translate-pathnames.ts | `  Pathname Cache: MISS (${...}/${...} need translation)` |

## Changes to Remove

### src/index.ts

#### 1. Remove `cacheLookupTime` variable declaration (line ~358)
```typescript
// REMOVE this line:
let cacheLookupTime = 0
```

#### 2. Remove hostConfig timing (lines ~126-128)
```typescript
// REMOVE these lines:
const dbStart = Date.now()
// ... (keep the getHostConfig call itself)
const hostConfigTime = Date.now() - dbStart
```

#### 3. Remove pathnameLookup timing (lines ~208-210)
```typescript
// REMOVE these lines:
const pathnameLookupStart = Date.now()
// ... (keep the lookupPathname call itself)
const pathnameLookupTime = Date.now() - pathnameLookupStart
```

#### 4. Remove cache lookup timing (lines ~381-385)
```typescript
// REMOVE timing, change from:
const cacheStart = Date.now()
const segmentTexts = normalizedSegments.map((s) => s.value)
const cachedTranslations = await batchGetTranslations(hostConfig.hostId, segmentTexts)
cacheLookupTime = Date.now() - cacheStart

// TO:
const segmentTexts = normalizedSegments.map((s) => s.value)
const cachedTranslations = await batchGetTranslations(hostConfig.hostId, segmentTexts)
```

#### 5. Remove Pathname DB Lookup timing (lines ~444-453)
```typescript
// REMOVE timing vars and console.log, change from:
const pathnameDbLookupStart = Date.now()
const normalizedToOriginal = new Map<string, string>()
for (const path of allPathnames) {
    const { normalized } = normalizePathname(path)
    normalizedToOriginal.set(normalized, path)
}
const normalizedPaths = Array.from(normalizedToOriginal.keys())
const existingPathnames = await batchLookupPathnames(hostConfig.hostId, normalizedPaths)
console.log(`  Pathname DB Lookup: ${allPathnames.size} paths (${Date.now() - pathnameDbLookupStart}ms)`)

// TO (KEEP the normalization loop - it's a bug fix!):
const normalizedToOriginal = new Map<string, string>()
for (const path of allPathnames) {
    const { normalized } = normalizePathname(path)
    normalizedToOriginal.set(normalized, path)
}
const normalizedPaths = Array.from(normalizedToOriginal.keys())
const existingPathnames = await batchLookupPathnames(hostConfig.hostId, normalizedPaths)
```

#### 6. Remove Pathname Translate Batch timing (lines ~455-476)
```typescript
// REMOVE timing, change from:
const pathnameBatchStart = Date.now()
const batchResult = await translatePathnamesBatch(...)
console.log(`  Pathname Translate Batch: ${allPathnames.size} paths (${Date.now() - pathnameBatchStart}ms)`)

// TO:
const batchResult = await translatePathnamesBatch(...)
```

#### 7. Remove Translation Upsert timing (lines ~559-564)
```typescript
// REMOVE timing, change from:
const upsertTransStart = Date.now()
const translationIdMap = await batchUpsertTranslations(hostConfig.hostId, translationItems)
storedCount = translationIdMap.size
console.log(`  Translation Upsert: ${translationItems.length} items (${Date.now() - upsertTransStart}ms`)

// TO:
const translationIdMap = await batchUpsertTranslations(hostConfig.hostId, translationItems)
storedCount = translationIdMap.size
```

#### 8. Remove pathname upsert timing (lines ~630-640)
```typescript
// REMOVE timing, change from:
let pathnameUpsertTime = 0
if (pathnameUpdates.length > 0) {
    try {
        const upsertStart = Date.now()
        pathnameIdMap = await batchUpsertPathnames(hostConfig.hostId, pathnameUpdates)
        pathnameUpsertTime = Date.now() - upsertStart
        console.log(`  Pathname Upsert: ${pathnameUpdates.length} paths (${pathnameUpsertTime}ms)`)
    } catch ...

// TO:
if (pathnameUpdates.length > 0) {
    try {
        pathnameIdMap = await batchUpsertPathnames(hostConfig.hostId, pathnameUpdates)
    } catch ...
```

#### 9. Remove junction timing (lines ~650-680)
```typescript
// REMOVE all timing vars and the console.log, change from:
const junctionStart = Date.now()
// ... code ...
const pathnameTime = Date.now() - junctionStart
// ... code ...
const lookupStart = Date.now()
const allTranslationIds = await batchGetTranslationIds(hostConfig.hostId, allHashes)
const lookupTime = Date.now() - lookupStart
// ... code ...
const linkStart = Date.now()
await linkPathnameTranslations(currentPathnameId, Array.from(allTranslationIds.values()))
const linkTime = Date.now() - linkStart
console.log(`  Junction: pathname ${pathnameTime}ms | lookup ${allTranslationIds.size} IDs ${lookupTime}ms | link ${linkTime}ms`)

// TO (just keep the core logic):
const { normalized: normalizedPath } = normalizePathname(originalPathname)
let currentPathnameId = pathnameIdMap.get(normalizedPath)

if (!currentPathnameId) {
    const currentPathResult = await batchUpsertPathnames(hostConfig.hostId, [
        { original: normalizedPath, translated: normalizedPath },
    ])
    currentPathnameId = currentPathResult.get(normalizedPath)
}

if (currentPathnameId) {
    const allHashes = normalizedSegments.map((s) => hashText(s.value))
    const allTranslationIds = await batchGetTranslationIds(hostConfig.hostId, allHashes)

    if (allTranslationIds.size > 0) {
        await linkPathnameTranslations(currentPathnameId, Array.from(allTranslationIds.values()))
    }
}
```

#### 10. Remove DB Init log line (line ~710)
```typescript
// REMOVE this line:
console.log(`  DB Init: hostConfig ${hostConfigTime}ms | pathnameLookup ${pathnameLookupTime}ms`)
```

#### 11. Remove Cache Lookup from log (line ~725)
```typescript
// Change from:
`  Fetch & Parse: ${fetchTime + parseTime}ms | Extract: ${extractedSegments.length} segments (${extractTime}ms) | Cache Lookup: ${cacheLookupTime}ms`

// TO:
`  Fetch & Parse: ${fetchTime + parseTime}ms | Extract: ${extractedSegments.length} segments (${extractTime}ms)`
```

### src/translation/translate-pathnames.ts

#### 12. Remove Pathname Cache logging (lines ~233-242)
```typescript
// REMOVE these console.log statements from translatePathnamesBatch():

// In the early return block (line ~234):
console.log(`  Pathname Cache: HIT (${pathnames.size}/${pathnames.size})`)

// Before the batch translate (line ~242):
console.log(`  Pathname Cache: MISS (${uncachedPathnames.length}/${pathnames.size} need translation)`)
```
