import { config } from 'dotenv'
import { Pool } from 'pg'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const CONCURRENCY = 2

interface PathRow {
	domain: string
	id: number
	path: string
}

const pool = new Pool({
	connectionString: process.env.POSTGRES_DB_URL,
	ssl: process.env.POSTGRES_DB_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
})

async function checkPath(domain: string, path: string): Promise<{ status: number; path: string } | null> {
	const url = `https://${domain}${path}`
	try {
		const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
		if (response.status >= 400) {
			return { status: response.status, path }
		}
		return null
	} catch {
		// Network errors treated as errors
		return { status: 0, path }
	}
}

async function processWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results: R[] = []
	let index = 0

	async function worker() {
		while (index < items.length) {
			const currentIndex = index++
			const result = await processor(items[currentIndex], currentIndex)
			results[currentIndex] = result
		}
	}

	const workers = Array(Math.min(concurrency, items.length))
		.fill(null)
		.map(() => worker())

	await Promise.all(workers)
	return results
}

// Skip paths with placeholders like [N1], [slug], etc.
function hasPlaceholder(path: string): boolean {
	return /\[[^\]]+\]/.test(path)
}

async function main() {
	console.log('Fetching paths from database...')

	const result = await pool.query<PathRow>(`
		SELECT o.domain, op.id, op.path
		FROM origin o
		JOIN origin_path op ON op.origin_id = o.id
		ORDER BY op.id
	`)

	const allPaths = result.rows
	const paths = allPaths.filter((p) => !hasPlaceholder(p.path))
	console.log(`Found ${allPaths.length} paths, checking ${paths.length} (skipping ${allPaths.length - paths.length} with placeholders)`)

	const errorPaths: string[] = []
	let checked = 0

	await processWithConcurrency(paths, CONCURRENCY, async (row) => {
		const result = await checkPath(row.domain, row.path)
		checked++

		if (result) {
			errorPaths.push(`${result.status} ${result.path}`)
			console.log(`[${checked}/${paths.length}] ERROR ${result.status}: ${result.path}`)
		} else if (checked % 50 === 0) {
			console.log(`[${checked}/${paths.length}] Progress...`)
		}

		return result
	})

	// Write results
	const outputPath = join(dirname(fileURLToPath(import.meta.url)), 'error-paths.txt')
	writeFileSync(outputPath, errorPaths.join('\n'))

	console.log(`\nDone! Found ${errorPaths.length} error paths`)
	console.log(`Results written to: ${outputPath}`)

	await pool.end()
}

main().catch(console.error)
