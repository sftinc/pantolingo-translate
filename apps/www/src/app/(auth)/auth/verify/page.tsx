import { redirect } from 'next/navigation'
import { getAuthCookieData } from '@/lib/auth-cookie'
import { getTurnstileSiteKey } from '@/lib/turnstile'
import { VerifyHumanForm } from '@/components/ui/VerifyHumanForm'

// Force dynamic rendering to ensure fresh cookie reads
export const dynamic = 'force-dynamic'

export default async function AuthVerifyPage() {
	// Read auth cookie and extract email + flow
	const authData = await getAuthCookieData()
	if (!authData) {
		redirect('/login')
	}

	const turnstileSiteKey = getTurnstileSiteKey()

	return (
		<VerifyHumanForm
			turnstileSiteKey={turnstileSiteKey}
			flow={authData.flow}
		/>
	)
}
