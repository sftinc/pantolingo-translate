/**
 * Cloudflare Turnstile server-side utilities
 *
 * Environment variables:
 * - TURNSTILE_SITE_KEY: Public key for client widget
 * - TURNSTILE_SECRET_KEY: Secret key for server verification
 *
 * Test keys for development (from Cloudflare docs):
 * - Site key: 1x00000000000000000000AA (always passes)
 * - Secret key: 1x0000000000000000000000000000000AA (always passes)
 */

/**
 * Get the Turnstile site key for use in client components
 * This should be called server-side and passed to the Turnstile component as a prop
 */
export function getTurnstileSiteKey(): string {
	return process.env.TURNSTILE_SITE_KEY || ''
}

interface TurnstileResponse {
	success: boolean
	'error-codes'?: string[]
	challenge_ts?: string
	hostname?: string
}

/**
 * Verify a Turnstile token server-side
 *
 * @param token - The token from the Turnstile widget (cf-turnstile-response)
 * @returns true if verification passed, false otherwise
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
	const secretKey = process.env.TURNSTILE_SECRET_KEY
	if (!secretKey) {
		console.error('[turnstile] TURNSTILE_SECRET_KEY not configured')
		return false
	}

	if (!token) {
		return false
	}

	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				secret: secretKey,
				response: token,
			}),
		})

		const data: TurnstileResponse = await response.json()

		if (!data.success) {
			console.warn('[turnstile] Verification failed:', data['error-codes'])
		}

		return data.success
	} catch (error) {
		console.error('[turnstile] Verification error:', error)
		return false
	}
}
