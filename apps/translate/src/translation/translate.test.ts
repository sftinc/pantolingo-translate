import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { replaceSkipWords, restoreSkipWords, SkipWordReplacement } from './skip-words.js'
import { translateBatch } from './translate.js'

describe('Fallback + Skip Word Interaction', () => {
	it('restores skip words correctly when translation falls back to original', () => {
		const skipWords = ['eBay', 'PayPal']
		const original = 'Buy on eBay with PayPal'

		// Step 1: Replace skip words (what translateSegments does before calling LLM)
		const { text: withPlaceholders, replacements } = replaceSkipWords(original, skipWords)
		expect(withPlaceholders).toBe('Buy on [S1] with [S2]')

		// Step 2: Simulate translation failure - fallback returns original WITH placeholders
		const fallbackText = withPlaceholders // This is what translateBatch returns on failure

		// Step 3: Restore skip words (what translateSegments does after translateBatch)
		const restored = restoreSkipWords(fallbackText, replacements)

		// Verify: Original text is correctly restored
		expect(restored).toBe(original)
	})

	it('handles partial skip word restoration in fallback text', () => {
		const skipWords = ['Amazon']
		const original = 'Shop at Amazon today'

		const { text: withPlaceholders, replacements } = replaceSkipWords(original, skipWords)

		// Fallback preserves placeholders
		const fallbackText = withPlaceholders
		const restored = restoreSkipWords(fallbackText, replacements)

		expect(restored).toBe(original)
	})

	it('restores different skip words per segment when batch has mixed success/failure', () => {
		// Simulates translateSegments flow with multiple segments, each having different skip words
		const skipWords = ['eBay', 'PayPal', 'Amazon']

		// Three segments, each with a different skip word
		const segments = ['Buy on eBay today', 'Pay with PayPal now', 'Shop at Amazon here']

		// Step 1: Replace skip words per segment (each gets its own replacements array)
		const itemReplacements: SkipWordReplacement[][] = []
		const stringsToTranslate = segments.map((text) => {
			const { text: replacedText, replacements } = replaceSkipWords(text, skipWords)
			itemReplacements.push(replacements)
			return replacedText
		})

		// All three have [S1] but each maps to a DIFFERENT word
		expect(stringsToTranslate).toEqual([
			'Buy on [S1] today', // [S1] = eBay
			'Pay with [S1] now', // [S1] = PayPal
			'Shop at [S1] here', // [S1] = Amazon
		])

		// Step 2: Simulate batch translation with partial failure
		// - Segment 0: succeeds → "Compra en [S1] hoy"
		// - Segment 1: FAILS → fallback to "Pay with [S1] now" (original with placeholder)
		// - Segment 2: succeeds → "Compra en [S1] aquí"
		const batchResults = [
			'Compra en [S1] hoy', // translated
			'Pay with [S1] now', // fallback (failed)
			'Compra en [S1] aquí', // translated
		]

		// Step 3: Restore skip words using each segment's own replacements
		const restored = batchResults.map((text, i) => {
			if (itemReplacements[i] && itemReplacements[i].length > 0) {
				return restoreSkipWords(text, itemReplacements[i])
			}
			return text
		})

		// Each [S1] is restored to the correct brand for that segment
		expect(restored).toEqual([
			'Compra en eBay hoy', // [S1] → eBay
			'Pay with PayPal now', // [S1] → PayPal (original restored)
			'Compra en Amazon aquí', // [S1] → Amazon
		])
	})
})

describe('translateBatch with partial failures', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.stubGlobal('fetch', originalFetch)
	})

	/**
	 * Helper to create a successful API response
	 */
	function mockSuccessResponse(translation: string, tokens = { prompt: 10, completion: 5, cost: 0.001 }) {
		return {
			ok: true,
			json: () =>
				Promise.resolve({
					choices: [{ message: { content: translation } }],
					usage: {
						prompt_tokens: tokens.prompt,
						completion_tokens: tokens.completion,
						cost: tokens.cost,
					},
				}),
		}
	}

	/**
	 * Helper to create a failed API response
	 */
	function mockFailResponse(status = 500, statusText = 'Internal Server Error') {
		return {
			ok: false,
			status,
			statusText,
			text: () => Promise.resolve('API Error'),
		}
	}

	it('falls back to original text when some translations fail', async () => {
		const mockFetch = vi.mocked(globalThis.fetch)

		// First call succeeds, second fails, third succeeds
		mockFetch
			.mockResolvedValueOnce(mockSuccessResponse('Hola') as Response)
			.mockResolvedValueOnce(mockFailResponse() as Response)
			.mockResolvedValueOnce(mockSuccessResponse('Adiós') as Response)

		const items = [
			{ text: 'Hello', type: 'segment' as const },
			{ text: 'World', type: 'segment' as const },
			{ text: 'Goodbye', type: 'segment' as const },
		]

		const result = await translateBatch(items, 'en-us', 'es-mx', 'test-api-key')

		// Verify: successful translations used, failed one falls back to original
		expect(result.translations).toEqual(['Hola', 'World', 'Adiós'])
		expect(result.apiCallCount).toBe(3)
	})

	it('falls back to original when API returns empty response', async () => {
		const mockFetch = vi.mocked(globalThis.fetch)

		// Return empty content
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					choices: [{ message: { content: '   ' } }], // Empty/whitespace
					usage: { prompt_tokens: 10, completion_tokens: 0, cost: 0 },
				}),
		} as Response)

		const items = [{ text: 'Hello', type: 'segment' as const }]

		const result = await translateBatch(items, 'en-us', 'es-mx', 'test-api-key')

		// Falls back to original
		expect(result.translations).toEqual(['Hello'])
	})

	it('accumulates usage only for successful translations', async () => {
		const mockFetch = vi.mocked(globalThis.fetch)

		// First succeeds with usage, second fails
		mockFetch
			.mockResolvedValueOnce(mockSuccessResponse('Hola', { prompt: 100, completion: 50, cost: 0.01 }) as Response)
			.mockResolvedValueOnce(mockFailResponse() as Response)

		const items = [
			{ text: 'Hello', type: 'segment' as const },
			{ text: 'World', type: 'segment' as const },
		]

		const result = await translateBatch(items, 'en-us', 'es-mx', 'test-api-key')

		// Usage only from successful translation
		expect(result.totalUsage).toEqual({
			promptTokens: 100,
			completionTokens: 50,
			cost: 0.01,
		})
	})

	it('handles all translations failing gracefully', async () => {
		const mockFetch = vi.mocked(globalThis.fetch)

		// All fail
		mockFetch
			.mockResolvedValueOnce(mockFailResponse() as Response)
			.mockResolvedValueOnce(mockFailResponse() as Response)

		const items = [
			{ text: 'Hello', type: 'segment' as const },
			{ text: 'World', type: 'segment' as const },
		]

		const result = await translateBatch(items, 'en-us', 'es-mx', 'test-api-key')

		// All fall back to originals
		expect(result.translations).toEqual(['Hello', 'World'])
		expect(result.totalUsage).toEqual({ promptTokens: 0, completionTokens: 0, cost: 0 })
		expect(result.apiCallCount).toBe(2)
	})

	it('includes context in warning when failures occur', async () => {
		const mockFetch = vi.mocked(globalThis.fetch)
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mockFetch.mockResolvedValueOnce(mockFailResponse() as Response)

		const items = [{ text: 'Hello', type: 'segment' as const }]
		const context = { host: 'es.example.com', pathname: '/products' }

		await translateBatch(items, 'en-us', 'es-mx', 'test-api-key', 'balanced', context)

		// Verify context appears in warning
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('1/1 translations failed for es.example.com/products')
		)

		warnSpy.mockRestore()
	})
})
