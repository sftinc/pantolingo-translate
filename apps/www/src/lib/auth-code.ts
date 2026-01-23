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
 */
export function generateVerificationCode(): string {
	const array = new Uint8Array(CODE_LENGTH)
	crypto.getRandomValues(array)

	let code = ''
	for (let i = 0; i < CODE_LENGTH; i++) {
		code += SAFE_CHARSET[array[i] % SAFE_CHARSET.length]
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
