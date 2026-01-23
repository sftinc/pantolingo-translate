/**
 * Email JWT utilities for magic link code entry flow
 *
 * Uses next-auth/jwt to create signed JWTs containing the email address.
 * This avoids storing email in cookies (which causes multi-tab issues)
 * and instead passes it in the URL as a signed token.
 */

import { encode, decode } from 'next-auth/jwt'

const EMAIL_JWT_MAX_AGE = 10 * 60 // 10 minutes (matches auth token TTL)
const EMAIL_JWT_SALT = 'pantolingo-email-verification'

interface EmailJwtPayload {
	email: string
	purpose: string
}

/**
 * Create a signed JWT containing the email address
 *
 * @param email - The email address to encode
 * @returns The signed JWT string
 */
export async function createEmailJwt(email: string): Promise<string> {
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		throw new Error('AUTH_SECRET not configured')
	}

	return encode<EmailJwtPayload>({
		token: {
			email,
			purpose: 'email-verification',
		},
		secret,
		salt: EMAIL_JWT_SALT,
		maxAge: EMAIL_JWT_MAX_AGE,
	})
}

/**
 * Verify and decode an email JWT
 *
 * @param token - The JWT string to verify
 * @returns The email address if valid, null otherwise
 */
export async function verifyEmailJwt(token: string): Promise<string | null> {
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		console.error('[auth-jwt] AUTH_SECRET not configured')
		return null
	}

	try {
		const decoded = await decode<EmailJwtPayload>({
			token,
			secret,
			salt: EMAIL_JWT_SALT,
		})

		if (!decoded || decoded.purpose !== 'email-verification' || typeof decoded.email !== 'string') {
			return null
		}

		return decoded.email
	} catch {
		// Token expired or invalid
		return null
	}
}
