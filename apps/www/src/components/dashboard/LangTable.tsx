'use client'

import { useRouter } from 'next/navigation'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { formatNumber, getLanguageName } from '@/lib/utils'
import type { LangWithStats } from '@pantolingo/db'

interface LangTableProps {
	langs: LangWithStats[]
	originId: number
}

export function LangTable({ langs, originId }: LangTableProps) {
	const router = useRouter()

	if (langs.length === 0) {
		return <EmptyState message="No languages configured for this origin" />
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Language</TableHead>
					<TableHead className="text-right">Segments</TableHead>
					<TableHead className="text-right">Paths</TableHead>
					<TableHead className="text-right">Unreviewed</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{langs.map((lang) => (
					<TableRow
						key={lang.targetLang}
						clickable
						onClick={() => router.push(`/dashboard/origin/${originId}/lang/${lang.targetLang}`)}
					>
						<TableCell className="font-medium">{getLanguageName(lang.targetLang)}</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatNumber(lang.translatedSegmentCount)}
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatNumber(lang.translatedPathCount)}
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{lang.unreviewedSegmentCount + lang.unreviewedPathCount > 0 ? (
								<Badge variant="warning">
									{formatNumber(lang.unreviewedSegmentCount + lang.unreviewedPathCount)}
								</Badge>
							) : (
								<Badge variant="success">0</Badge>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
