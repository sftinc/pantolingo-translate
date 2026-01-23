/**
 * Verification code generation and validation utilities
 *
 * Uses a safe charset that excludes visually ambiguous characters:
 * - No 0 (zero) / O (oh)
 * - No 1 (one) / I (eye) / L (el)
 *
 * Charset: ABCDEFGHJKMNPQRSTUVWXYZ23456789 (31 characters)
 * Entropy: 31^8 ≈ 852 billion combinations
 */

const SAFE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

/**
 * Generate a cryptographically secure 8-character verification code
 * Uses rejection sampling to avoid modulo bias
 */
export function generateVerificationCode(): string {
	// 248 is the largest multiple of 31 under 256, so we reject bytes >= 248
	// to avoid bias toward the first 7 characters (256 % 31 = 7)
	const maxValidByte = 248
	const array = new Uint8Array(CODE_LENGTH * 2) // Extra bytes for rejection sampling
	crypto.getRandomValues(array)

	let code = ''
	let i = 0
	while (code.length < CODE_LENGTH) {
		if (i >= array.length) {
			// Refill if needed (extremely unlikely - would need 8+ rejections)
			crypto.getRandomValues(array)
			i = 0
		}
		const byte = array[i++]
		if (byte < maxValidByte) {
			code += SAFE_CHARSET[byte % SAFE_CHARSET.length]
		}
	}

	return code
}

/**
 * Validate that a code matches the expected format
 * - Exactly 8 characters
 * - Only characters from the safe charset (case-insensitive)
 */
export function isValidCodeFormat(code: string): boolean {
	if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
		return false
	}

	const upperCode = code.toUpperCase()
	for (const char of upperCode) {
		if (!SAFE_CHARSET.includes(char)) {
			return false
		}
	}

	return true
}
