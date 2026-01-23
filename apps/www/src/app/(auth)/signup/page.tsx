import { getTurnstileSiteKey } from '@/lib/turnstile'
import { SignupForm } from './SignupForm'

export default function SignupPage() {
	const turnstileSiteKey = getTurnstileSiteKey()
	return <SignupForm turnstileSiteKey={turnstileSiteKey} />
}
