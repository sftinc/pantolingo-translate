import { describe, it, expect } from 'vitest'
import { generateVerificationCode, isValidCodeFormat } from './auth-code.js'

const SAFE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

describe('generateVerificationCode', () => {
	it('returns an 8-character code', () => {
		const code = generateVerificationCode()
		expect(code).toHaveLength(8)
	})

	it('only uses characters from the safe charset', () => {
		// Generate multiple codes to increase confidence
		for (let i = 0; i < 100; i++) {
			const code = generateVerificationCode()
			for (const char of code) {
				expect(SAFE_CHARSET).toContain(char)
			}
		}
	})

	it('does not contain ambiguous characters (0, O, 1, I, L)', () => {
		const ambiguousChars = ['0', 'O', '1', 'I', 'L']

		// Generate multiple codes to increase confidence
		for (let i = 0; i < 100; i++) {
			const code = generateVerificationCode()
			for (const char of ambiguousChars) {
				expect(code).not.toContain(char)
			}
		}
	})

	it('generates different codes each time', () => {
		const codes = new Set<string>()
		for (let i = 0; i < 100; i++) {
			codes.add(generateVerificationCode())
		}
		// All codes should be unique (extremely unlikely to have collision)
		expect(codes.size).toBe(100)
	})
})

describe('isValidCodeFormat', () => {
	it('accepts valid 8-character codes', () => {
		expect(isValidCodeFormat('ABCD2345')).toBe(true)
		expect(isValidCodeFormat('WXYZ6789')).toBe(true)
		expect(isValidCodeFormat('HJKMNPQR')).toBe(true)
	})

	it('accepts lowercase codes (case-insensitive)', () => {
		expect(isValidCodeFormat('abcd2345')).toBe(true)
		expect(isValidCodeFormat('wxyz6789')).toBe(true)
	})

	it('accepts mixed-case codes', () => {
		expect(isValidCodeFormat('AbCd2345')).toBe(true)
	})

	it('rejects codes with wrong length', () => {
		expect(isValidCodeFormat('ABC2345')).toBe(false) // 7 chars
		expect(isValidCodeFormat('ABCD23456')).toBe(false) // 9 chars
		expect(isValidCodeFormat('')).toBe(false)
	})

	it('rejects codes with invalid characters', () => {
		// Ambiguous characters that are excluded
		expect(isValidCodeFormat('ABCD0345')).toBe(false) // Contains 0
		expect(isValidCodeFormat('ABCDO345')).toBe(false) // Contains O (uppercase)
		expect(isValidCodeFormat('ABCD1345')).toBe(false) // Contains 1
		expect(isValidCodeFormat('ABCDI345')).toBe(false) // Contains I
		expect(isValidCodeFormat('ABCDL345')).toBe(false) // Contains L
	})

	it('rejects non-string inputs', () => {
		expect(isValidCodeFormat(null as unknown as string)).toBe(false)
		expect(isValidCodeFormat(undefined as unknown as string)).toBe(false)
		expect(isValidCodeFormat(12345678 as unknown as string)).toBe(false)
	})
})
