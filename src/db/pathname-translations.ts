/**
 * Pathname-Translation junction table operations
 * Links translations to the pages where they are used
 */

import { pool } from './pool'

/**
 * Link a pathname to multiple translations
 * Uses ON CONFLICT DO NOTHING for idempotency
 *
 * @param pathnameId - Pathname ID from batchUpsertPathnames
 * @param translationIds - Array of translation IDs to link
 *
 * SQL: 1 query with UNNEST
 */
export async function linkPathnameTranslations(
	pathnameId: number,
	translationIds: number[]
): Promise<void> {
	if (translationIds.length === 0) {
		return
	}

	try {
		await pool.query(
			`INSERT INTO pathname_translation (pathname_id, translation_id)
			SELECT $1, unnest($2::int[])
			ON CONFLICT (pathname_id, translation_id) DO NOTHING`,
			[pathnameId, translationIds]
		)
	} catch (error) {
		console.error('Failed to link pathname translations:', error)
		// Non-blocking - don't throw
	}
}
