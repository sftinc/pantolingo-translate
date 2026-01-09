import { notFound } from 'next/navigation'
import { getOriginById, getLangsForOrigin } from '@pantolingo/db'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { LangTable } from '@/components/dashboard/LangTable'

export const dynamic = 'force-dynamic'

interface OriginDetailPageProps {
	params: Promise<{ id: string }>
}

export default async function OriginDetailPage({ params }: OriginDetailPageProps) {
	const { id } = await params
	const originId = parseInt(id, 10)

	if (isNaN(originId)) {
		notFound()
	}

	const origin = await getOriginById(originId)

	if (!origin) {
		notFound()
	}

	const langs = await getLangsForOrigin(originId)

	return (
		<div>
			<DashboardNav
				breadcrumbs={[
					{ label: 'Dashboard', href: '/dashboard' },
					{ label: `${origin.domain} (${origin.originLang})` },
				]}
			/>

			<h2 className="mb-4 text-2xl font-semibold text-[var(--text-heading)]">Languages</h2>

			<LangTable langs={langs} originId={originId} />
		</div>
	)
}
