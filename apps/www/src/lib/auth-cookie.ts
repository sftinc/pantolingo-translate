/**
 * Auth cookie utilities for magic link code entry flow
 *
 * Uses next-auth/jwt to create signed JWTs containing the email address and flow type.
 * The JWT is stored in an HTTP-only cookie to keep it out of browser history,
 * server logs, and prevent XSS access.
 *
 * Multi-tab note: If a user opens multiple auth tabs, each new magic link
 * request overwrites the cookie. This is acceptable - the latest auth flow wins.
 */

import { cookies, headers } from 'next/headers'
import { encode, decode } from 'next-auth/jwt'

export const AUTH_COOKIE_NAME = 'pantolingo-auth'

const AUTH_COOKIE_MAX_AGE = 10 * 60 // 10 minutes (matches auth token TTL)
const AUTH_COOKIE_SALT = 'pantolingo-auth-verification'

export type AuthFlow = 'login' | 'signup'

interface AuthCookiePayload {
	email: string
	flow: AuthFlow
	purpose: string
}

/**
 * Create a signed JWT containing the email address and flow type
 *
 * @param email - The email address to encode
 * @param flow - The auth flow type ('login' or 'signup')
 * @returns The signed JWT string
 */
export async function createAuthCookie(email: string, flow: AuthFlow): Promise<string> {
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		throw new Error('AUTH_SECRET not configured')
	}

	return encode<AuthCookiePayload>({
		token: {
			email,
			flow,
			purpose: 'auth-verification',
		},
		secret,
		salt: AUTH_COOKIE_SALT,
		maxAge: AUTH_COOKIE_MAX_AGE,
	})
}

/**
 * Verify and decode an auth cookie JWT
 *
 * @param token - The JWT string to verify
 * @returns The payload if valid, null otherwise
 */
export async function verifyAuthCookie(token: string): Promise<{ email: string; flow: AuthFlow } | null> {
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		console.error('[auth-cookie] AUTH_SECRET not configured')
		return null
	}

	try {
		const decoded = await decode<AuthCookiePayload>({
			token,
			secret,
			salt: AUTH_COOKIE_SALT,
		})

		if (
			!decoded ||
			decoded.purpose !== 'auth-verification' ||
			typeof decoded.email !== 'string' ||
			(decoded.flow !== 'login' && decoded.flow !== 'signup')
		) {
			return null
		}

		return { email: decoded.email, flow: decoded.flow }
	} catch {
		return null
	}
}

/**
 * Set the auth cookie (HTTP-only, scoped to /auth paths)
 *
 * @param jwt - The JWT string to store
 */
export async function setAuthCookie(jwt: string): Promise<void> {
	const cookieStore = await cookies()
	const headerStore = await headers()
	const host = headerStore.get('host') || ''
	const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
	cookieStore.set(AUTH_COOKIE_NAME, jwt, {
		httpOnly: true,
		secure: !isLocalhost,
		sameSite: 'lax',
		path: '/auth',
		maxAge: AUTH_COOKIE_MAX_AGE,
	})
}

/**
 * Get the auth cookie JWT from the HTTP-only cookie
 *
 * Note: We read from the raw Cookie header instead of using cookies() API
 * because cookies() can return stale/empty values in certain Next.js render contexts.
 *
 * @returns The JWT string if present, null otherwise
 */
export async function getAuthCookieToken(): Promise<string | null> {
	const headerStore = await headers()
	const cookieHeader = headerStore.get('cookie') || ''

	// Parse the cookie header manually to get our specific cookie
	const cookiePairs = cookieHeader.split(';').map((c) => c.trim())
	const ourCookie = cookiePairs.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
	const value = ourCookie ? ourCookie.substring(AUTH_COOKIE_NAME.length + 1) : null

	return value || null
}

/**
 * Get email and flow from the auth cookie
 *
 * @returns Object with email and flow if valid, null otherwise
 */
export async function getAuthCookieData(): Promise<{ email: string; flow: AuthFlow } | null> {
	const token = await getAuthCookieToken()
	if (!token) {
		return null
	}
	return verifyAuthCookie(token)
}

/**
 * Get just the flow from the auth cookie
 *
 * @returns The flow type if valid, null otherwise
 */
export async function getFlowFromCookie(): Promise<AuthFlow | null> {
	const data = await getAuthCookieData()
	return data?.flow ?? null
}

/**
 * Clear the auth cookie
 */
export async function clearAuthCookie(): Promise<void> {
	const cookieStore = await cookies()
	cookieStore.delete({ name: AUTH_COOKIE_NAME, path: '/auth' })
}
