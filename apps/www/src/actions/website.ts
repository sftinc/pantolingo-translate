'use server'

import { requireAccountId } from '@/lib/auth'
import { canAccessWebsite, updateWebsiteSettings as dbUpdateWebsiteSettings } from '@pantolingo/db'

export async function saveWebsiteSettings(
	websiteId: number,
	settings: {
		skipWords: string[]
		skipPath: string[]
		skipSelectors: string[]
		translatePath: boolean
	}
): Promise<{ success: boolean; error?: string }> {
	try {
		if (settings.skipWords.length > 50) {
			return { success: false, error: 'Too many skip words (max 50)' }
		}
		if (settings.skipPath.length > 25) {
			return { success: false, error: 'Too many skip paths (max 25)' }
		}
		if (settings.skipSelectors.length > 25) {
			return { success: false, error: 'Too many skip selectors (max 25)' }
		}
		if (settings.skipSelectors.some(s => s.length > 200)) {
			return { success: false, error: 'Skip selector too long (max 200 characters)' }
		}

		const accountId = await requireAccountId()

		if (!(await canAccessWebsite(accountId, websiteId))) {
			return { success: true } // Silent success - don't leak existence
		}

		return dbUpdateWebsiteSettings(websiteId, settings)
	} catch {
		return { success: false, error: 'An error occurred' }
	}
}
