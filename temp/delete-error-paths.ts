import { config } from 'dotenv'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const pool = new Pool({
	connectionString: process.env.POSTGRES_DB_URL,
	ssl: process.env.POSTGRES_DB_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
})

async function main() {
	// Read error paths from file
	const errorFile = join(dirname(fileURLToPath(import.meta.url)), 'error-paths.txt')
	const content = readFileSync(errorFile, 'utf-8')

	// Parse paths (format: "404 /path/here")
	const paths = content
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => {
			const match = line.match(/^\d+\s+(.+)$/)
			return match ? match[1] : null
		})
		.filter((p): p is string => p !== null)

	console.log(`Found ${paths.length} error paths to delete`)

	if (paths.length === 0) {
		console.log('No paths to delete')
		await pool.end()
		return
	}

	// Delete from origin_path (CASCADE will handle translated_path, origin_path_segment, origin_path_view)
	const result = await pool.query(
		`DELETE FROM origin_path
		 WHERE path = ANY($1::text[])
		 RETURNING id, path`,
		[paths]
	)

	console.log(`Deleted ${result.rowCount} origin_path records`)
	console.log('(CASCADE automatically deleted related translated_path, origin_path_segment, origin_path_view records)')

	await pool.end()
}

main().catch(console.error)
