# Todo: Database Migration for Table Renames

## Summary

Run the database migration to rename tables and columns to match the updated application code.

## Why

| Current Name | New Name | Reason |
|--------------|----------|--------|
| `host` | `translation` | Better describes the table's purpose (translation configuration) |
| `translated_path` | `translation_path` | Consistency with `translation` table naming |
| `translated_segment` | `translation_segment` | Consistency with `translation` table naming |
| `website.domain` | `website.hostname` | More accurate - it stores the full hostname |

## Phase 1: Run Migration

**Goal:** Rename database tables and columns

- [ ] Take down applications (translate + www)
- [ ] Run migration SQL against database
- [ ] Deploy updated code
- [ ] Bring up applications

### Migration SQL

```sql
BEGIN;

-- 1. UPDATE website TABLE
ALTER TABLE website RENAME COLUMN domain TO hostname;
ALTER TABLE website ADD COLUMN apex text;

COMMENT ON COLUMN website.hostname IS 'Full hostname of the origin website (e.g., blog.example.com)';
COMMENT ON COLUMN website.apex IS 'Apex/root domain for DNS TXT verification (e.g., example.com)';

-- 2. RENAME host → translation
ALTER TABLE host RENAME TO translation;
ALTER SEQUENCE host_id_seq RENAME TO translation_id_seq;
ALTER INDEX host_pkey RENAME TO translation_pkey;
ALTER INDEX host_hostname_key RENAME TO translation_hostname_key;
ALTER INDEX idx_host_website_id RENAME TO idx_translation_website_id;
ALTER TABLE translation RENAME CONSTRAINT host_website_id_fkey TO translation_website_id_fkey;
ALTER TRIGGER host_updated_at ON translation RENAME TO translation_updated_at;

COMMENT ON TABLE translation IS 'Maps hostnames to target languages and website configurations for the translation proxy';

-- 3. RENAME translated_path → translation_path
ALTER TABLE translated_path RENAME TO translation_path;
ALTER SEQUENCE translated_path_id_seq RENAME TO translation_path_id_seq;
ALTER INDEX translated_path_pkey RENAME TO translation_path_pkey;
ALTER INDEX translated_path_website_path_id_lang_key RENAME TO translation_path_website_path_id_lang_key;
ALTER INDEX idx_translated_path_reverse RENAME TO idx_translation_path_translated_path;
ALTER TABLE translation_path RENAME CONSTRAINT translated_path_website_path_id_fkey TO translation_path_website_path_id_fkey;
ALTER TRIGGER translated_path_word_count ON translation_path RENAME TO translation_path_word_count;

COMMENT ON TABLE translation_path IS 'Stores translated URL paths per language, linked to source paths in website_path';

-- 4. RENAME translated_segment → translation_segment
ALTER TABLE translated_segment RENAME TO translation_segment;
ALTER SEQUENCE translated_segment_id_seq RENAME TO translation_segment_id_seq;
ALTER INDEX translated_segment_pkey RENAME TO translation_segment_pkey;
ALTER INDEX translated_segment_website_segment_id_lang_key RENAME TO translation_segment_website_segment_id_lang_key;
ALTER TABLE translation_segment RENAME CONSTRAINT translated_segment_website_segment_id_fkey TO translation_segment_website_segment_id_fkey;
ALTER TRIGGER translated_segment_word_count ON translation_segment RENAME TO translation_segment_word_count;

COMMENT ON TABLE translation_segment IS 'Stores translated text segments per language, linked to source segments in website_segment';

-- 5. RENAME TRIGGER FUNCTIONS
ALTER FUNCTION set_translated_path_word_count() RENAME TO set_translation_path_word_count;
ALTER FUNCTION set_translated_segment_word_count() RENAME TO set_translation_segment_word_count;

COMMIT;
```

### Rollback SQL

```sql
BEGIN;

-- Rollback function renames
ALTER FUNCTION set_translation_segment_word_count() RENAME TO set_translated_segment_word_count;
ALTER FUNCTION set_translation_path_word_count() RENAME TO set_translated_path_word_count;

-- Rollback translation_segment → translated_segment
ALTER TRIGGER translation_segment_word_count ON translation_segment RENAME TO translated_segment_word_count;
ALTER TABLE translation_segment RENAME CONSTRAINT translation_segment_website_segment_id_fkey TO translated_segment_website_segment_id_fkey;
ALTER INDEX translation_segment_website_segment_id_lang_key RENAME TO translated_segment_website_segment_id_lang_key;
ALTER INDEX translation_segment_pkey RENAME TO translated_segment_pkey;
ALTER SEQUENCE translation_segment_id_seq RENAME TO translated_segment_id_seq;
ALTER TABLE translation_segment RENAME TO translated_segment;

-- Rollback translation_path → translated_path
ALTER TRIGGER translation_path_word_count ON translation_path RENAME TO translated_path_word_count;
ALTER TABLE translation_path RENAME CONSTRAINT translation_path_website_path_id_fkey TO translated_path_website_path_id_fkey;
ALTER INDEX idx_translation_path_translated_path RENAME TO idx_translated_path_reverse;
ALTER INDEX translation_path_website_path_id_lang_key RENAME TO translated_path_website_path_id_lang_key;
ALTER INDEX translation_path_pkey RENAME TO translated_path_pkey;
ALTER SEQUENCE translation_path_id_seq RENAME TO translated_path_id_seq;
ALTER TABLE translation_path RENAME TO translated_path;

-- Rollback translation → host
ALTER TRIGGER translation_updated_at ON translation RENAME TO host_updated_at;
ALTER TABLE translation RENAME CONSTRAINT translation_website_id_fkey TO host_website_id_fkey;
ALTER INDEX idx_translation_website_id RENAME TO idx_host_website_id;
ALTER INDEX translation_hostname_key RENAME TO host_hostname_key;
ALTER INDEX translation_pkey RENAME TO host_pkey;
ALTER SEQUENCE translation_id_seq RENAME TO host_id_seq;
ALTER TABLE translation RENAME TO host;

-- Rollback website changes
ALTER TABLE website DROP COLUMN apex;
ALTER TABLE website RENAME COLUMN hostname TO domain;

COMMIT;
```

## Notes

- Application code has been updated in the same commit
- Deployment: Take down → migrate DB → deploy code → bring up
- Not a production system - brief downtime is acceptable
