/**
 * Pathname-Translation junction table operations
 * Links translated paths to the translated segments on that page
 *
 * Uses normalized schema:
 * - pathname_translation links translated_path to translated_segment
 */

import { pool } from './pool'

/**
 * Link a translated path to multiple translated segments
 * Uses ON CONFLICT DO NOTHING for idempotency
 *
 * @param translatedPathId - Translated path ID from batchUpsertPathnames
 * @param translatedSegmentIds - Array of translated segment IDs to link
 *
 * SQL: 1 query with UNNEST
 */
export async function linkPathnameTranslations(
	translatedPathId: number,
	translatedSegmentIds: number[]
): Promise<void> {
	if (translatedSegmentIds.length === 0) {
		return
	}

	try {
		await pool.query(
			`INSERT INTO pathname_translation (translated_path_id, translated_segment_id)
			SELECT $1, unnest($2::int[])
			ON CONFLICT (translated_path_id, translated_segment_id) DO NOTHING`,
			[translatedPathId, translatedSegmentIds]
		)
	} catch (error) {
		console.error('Failed to link pathname translations:', error)
		// Non-blocking - don't throw
	}
}
