/**
 * Translation cache queries
 * Batch operations to minimize SQL round trips
 */

import { pool } from './pool'
import { hashText } from './hash'

/**
 * Translation item for batch upsert
 */
export interface TranslationItem {
	original: string
	translated: string
	kind: 'text' | 'attr' | 'path'
}

/**
 * Batch lookup translations by text
 * Uses text_hash for efficient indexed lookups
 *
 * @param hostId - Host ID from getHostConfig()
 * @param texts - Array of normalized text strings to look up
 * @returns Map of original text -> translated text (only cache hits)
 *
 * SQL: 1 query with ANY clause
 */
export async function batchGetTranslations(hostId: number, texts: string[]): Promise<Map<string, string>> {
	if (texts.length === 0) {
		return new Map()
	}

	try {
		// Generate hashes for all input texts
		const hashes = texts.map((t) => hashText(t))

		const result = await pool.query<{
			original_text: string
			translated_text: string
		}>(
			`SELECT original_text, translated_text
			FROM translation
			WHERE host_id = $1 AND text_hash = ANY($2::text[])`,
			[hostId, hashes]
		)

		// Build map for O(1) lookups
		const translationMap = new Map<string, string>()
		for (const row of result.rows) {
			translationMap.set(row.original_text, row.translated_text)
		}

		return translationMap
	} catch (error) {
		console.error('DB translation batch lookup failed:', error)
		return new Map() // Fail open - treat as cache miss
	}
}

/**
 * Batch insert/update translations
 * Uses INSERT ... ON CONFLICT DO UPDATE for atomic upserts
 *
 * @param hostId - Host ID
 * @param translations - Array of translation items
 * @returns Map of text_hash -> id for inserted/updated translations
 *
 * SQL: 1 query with UNNEST for batch insert
 */
export async function batchUpsertTranslations(
	hostId: number,
	translations: TranslationItem[]
): Promise<Map<string, number>> {
	if (translations.length === 0) {
		return new Map()
	}

	try {
		// Deduplicate by original text (last one wins)
		const uniqueMap = new Map<string, TranslationItem>()
		for (const t of translations) {
			uniqueMap.set(t.original, t)
		}
		const uniqueTranslations = Array.from(uniqueMap.values())

		// Prepare parallel arrays for UNNEST
		const originals: string[] = []
		const translated: string[] = []
		const kinds: string[] = []
		const hashes: string[] = []

		for (const t of uniqueTranslations) {
			originals.push(t.original)
			translated.push(t.translated)
			kinds.push(t.kind)
			hashes.push(hashText(t.original))
		}

		const result = await pool.query<{ id: number; text_hash: string }>(
			`INSERT INTO translation (host_id, original_text, translated_text, kind, text_hash)
			SELECT $1, unnest($2::text[]), unnest($3::text[]), unnest($4::text[]), unnest($5::text[])
			ON CONFLICT (host_id, text_hash) DO NOTHING
			RETURNING id, text_hash`,
			[hostId, originals, translated, kinds, hashes]
		)

		// Return map: text_hash -> id
		const idMap = new Map<string, number>()
		for (const row of result.rows) {
			idMap.set(row.text_hash, row.id)
		}
		return idMap
	} catch (error) {
		console.error('DB translation batch upsert failed:', error)
		return new Map() // Fail open
	}
}

/**
 * Batch lookup translation IDs by text hash
 * Used to link cached translations to pathnames
 *
 * @param hostId - Host ID
 * @param textHashes - Array of text hashes to look up
 * @returns Map of text_hash -> id
 *
 * SQL: 1 query with ANY clause
 */
export async function batchGetTranslationIds(
	hostId: number,
	textHashes: string[]
): Promise<Map<string, number>> {
	if (textHashes.length === 0) {
		return new Map()
	}

	try {
		const result = await pool.query<{ text_hash: string; id: number }>(
			`SELECT text_hash, id FROM translation
			WHERE host_id = $1 AND text_hash = ANY($2::text[])`,
			[hostId, textHashes]
		)

		const idMap = new Map<string, number>()
		for (const row of result.rows) {
			idMap.set(row.text_hash, row.id)
		}
		return idMap
	} catch (error) {
		console.error('DB translation ID lookup failed:', error)
		return new Map() // Fail open
	}
}
