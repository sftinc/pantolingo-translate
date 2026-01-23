'use client'

import { useState, useActionState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormInput } from '@/components/ui/FormInput'
import { Spinner } from '@/components/ui/Spinner'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Turnstile } from '@/components/ui/Turnstile'
import {
	checkEmailExists,
	sendMagicLink,
	signInWithPassword,
	type AuthActionState,
} from '@/actions/auth'
import { isValidEmail } from '@/lib/validation'

type LoginStep = 'email' | 'password'

function getSafeCallbackUrl(url: string | null): string {
	if (!url) return '/dashboard'
	if (url.startsWith('/') && !url.startsWith('//')) {
		return url
	}
	return '/dashboard'
}

interface LoginFormProps {
	turnstileSiteKey: string
}

export function LoginForm({ turnstileSiteKey }: LoginFormProps) {
	const searchParams = useSearchParams()
	const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'))
	const errorParam = searchParams.get('error')
	const messageParam = searchParams.get('message')

	const [step, setStep] = useState<LoginStep>('email')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [emailError, setEmailError] = useState<string | null>(null)
	const [passwordError, setPasswordError] = useState<string | null>(null)
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
	const [showTurnstile, setShowTurnstile] = useState(false)
	const [isPending, startTransition] = useTransition()

	const [passwordState, passwordAction] = useActionState<AuthActionState, FormData>(
		signInWithPassword,
		null
	)

	// Handle email step submission
	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setEmailError(null)

		const trimmedEmail = email.trim()
		if (!trimmedEmail) {
			setEmailError('Email is required')
			return
		}
		if (!isValidEmail(trimmedEmail)) {
			setEmailError('Please enter a valid email address')
			return
		}

		startTransition(async () => {
			const exists = await checkEmailExists(trimmedEmail)
			if (!exists) {
				setEmailError('No account found with this email')
			} else {
				setStep('password')
			}
		})
	}

	// Handle password step submission
	const handlePasswordSubmit = (formData: FormData) => {
		setPasswordError(null)
		const pwd = (formData.get('password') as string) || ''

		if (pwd.length < 8) {
			setPasswordError('Password must be at least 8 characters')
			return
		}

		passwordAction(formData)
	}

	// Handle forgot password - show Turnstile first, then send magic link
	const handleForgotPassword = () => {
		if (!turnstileToken) {
			// Show Turnstile widget
			setShowTurnstile(true)
			return
		}
		// Turnstile already verified, send magic link
		startTransition(async () => {
			const formData = new FormData()
			formData.set('email', email.trim())
			formData.set('turnstileToken', turnstileToken)
			await sendMagicLink(null, formData)
		})
	}

	// Called when Turnstile is verified, automatically trigger forgot password
	const handleTurnstileVerify = (token: string) => {
		setTurnstileToken(token)
		// Automatically send magic link after verification
		startTransition(async () => {
			const formData = new FormData()
			formData.set('email', email.trim())
			formData.set('turnstileToken', token)
			await sendMagicLink(null, formData)
		})
	}

	// Map error codes to messages
	const getErrorMessage = (error: string) => {
		switch (error) {
			case 'Verification':
				return 'The magic link has expired or is invalid.'
			case 'Configuration':
				return 'Server configuration error. Please try again later.'
			case 'CredentialsSignin':
				return 'Invalid credentials'
			default:
				return error
		}
	}

	// Map message codes to success messages
	const getSuccessMessage = (message: string) => {
		switch (message) {
			case 'signedOut':
				return 'You have been signed out successfully.'
			default:
				return null
		}
	}

	const successMessage = messageParam ? getSuccessMessage(messageParam) : null

	const error = errorParam || emailError || passwordError || passwordState?.error

	return (
		<main className="flex min-h-screen flex-col">
			<div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-end">
				<ThemeToggle />
			</div>
			<div className="flex flex-1 flex-col items-center justify-center p-6">
				<div className="w-full max-w-md bg-[var(--card-bg)] p-10 rounded-lg shadow-[0_2px_8px_var(--shadow-color)]">
					<h1 className="text-3xl font-semibold mb-2 text-[var(--text-heading)] text-center">
						Login to Pantolingo
					</h1>
					<p className="text-base text-[var(--text-muted)] mb-6 text-center">
						{step === 'email' ? 'Enter your email to continue' : 'Enter your password'}
					</p>

					{successMessage && (
						<div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
							{successMessage}
						</div>
					)}

					{error && (
						<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
							{getErrorMessage(error)}
						</div>
					)}

					{step === 'email' ? (
						<form onSubmit={handleEmailSubmit}>
							<FormInput
								id="email"
								name="email"
								type="email"
								required
								autoFocus
								placeholder="you@example.com"
								label="Email address"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value)
									setEmailError(null)
								}}
								className="mb-4"
							/>
							<button
								type="submit"
								disabled={isPending}
								className="w-full py-3 bg-[var(--accent)] text-white rounded-md font-medium hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
							>
								{isPending ? <Spinner size="sm" /> : 'Continue'}
							</button>
						</form>
					) : (
						<form action={handlePasswordSubmit}>
							<input type="hidden" name="callbackUrl" value={callbackUrl} />
							<input type="hidden" name="email" value={email.trim()} />

							{/* Show email styled as readonly input */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-[var(--text-body)] mb-2">
									Email address
								</label>
								<div className="flex items-center justify-between px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--input-bg)]">
									<span className="text-[var(--text-muted)]">{email.trim()}</span>
									<button
										type="button"
										onClick={() => {
											setStep('email')
											setPassword('')
											setPasswordError(null)
										}}
										className="text-sm text-[var(--accent)] hover:underline"
									>
										Change
									</button>
								</div>
							</div>

							<FormInput
								id="password"
								name="password"
								type="password"
								required
								autoFocus
								placeholder="Enter your password"
								label="Password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value)
									setPasswordError(null)
								}}
								className="mb-2"
							/>

							<div className="mb-4 text-right">
								<button
									type="button"
									onClick={handleForgotPassword}
									disabled={isPending}
									className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
								>
									Forgot password?
								</button>
							</div>

							{showTurnstile && !turnstileToken && turnstileSiteKey && (
								<div className="mb-4">
									<Turnstile siteKey={turnstileSiteKey} onVerify={handleTurnstileVerify} />
								</div>
							)}

							<SubmitButton>Login to Pantolingo</SubmitButton>
						</form>
					)}

					<p className="mt-6 text-center text-sm text-[var(--text-muted)]">
						Don&apos;t have an account?{' '}
						<Link href="/signup" className="text-[var(--accent)] hover:underline">
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
