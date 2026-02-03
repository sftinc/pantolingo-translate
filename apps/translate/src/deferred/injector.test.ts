import { describe, it, expect } from 'vitest'
import { dedupePendingSegments } from './injector.js'
import type { PendingSegment } from '../dom/applicator.js'

describe('dedupePendingSegments', () => {
	it('removes duplicate hash+kind+attr combinations', () => {
		const pending: PendingSegment[] = [
			{ hash: 'abc', kind: 'text', content: 'Help', showSkeleton: true },
			{ hash: 'abc', kind: 'text', content: 'Help', showSkeleton: true }, // duplicate
			{ hash: 'abc', kind: 'attr', content: 'Help', attr: 'aria-label', showSkeleton: true }, // different kind
			{ hash: 'def', kind: 'html', content: 'Login', showSkeleton: true },
		]
		const result = dedupePendingSegments(pending)
		expect(result).toHaveLength(3)
		expect(result.map((p) => p.hash)).toEqual(['abc', 'abc', 'def'])
		expect(result.map((p) => p.kind)).toEqual(['text', 'attr', 'html'])
	})

	it('preserves order of first occurrence', () => {
		const pending: PendingSegment[] = [
			{ hash: 'a', kind: 'text', content: 'First', showSkeleton: true },
			{ hash: 'b', kind: 'text', content: 'Second', showSkeleton: true },
			{ hash: 'a', kind: 'text', content: 'First', showSkeleton: true }, // duplicate
		]
		const result = dedupePendingSegments(pending)
		expect(result).toHaveLength(2)
		expect(result[0].hash).toBe('a')
		expect(result[1].hash).toBe('b')
	})

	it('handles empty array', () => {
		const result = dedupePendingSegments([])
		expect(result).toEqual([])
	})

	it('returns same array when no duplicates', () => {
		const pending: PendingSegment[] = [
			{ hash: 'a', kind: 'text', content: 'One', showSkeleton: true },
			{ hash: 'b', kind: 'html', content: 'Two', showSkeleton: true },
			{ hash: 'c', kind: 'attr', content: 'Three', attr: 'title', showSkeleton: true },
		]
		const result = dedupePendingSegments(pending)
		expect(result).toHaveLength(3)
		expect(result).toEqual(pending)
	})

	it('treats same hash with different attr as unique', () => {
		const pending: PendingSegment[] = [
			{ hash: 'xyz', kind: 'attr', content: 'Search', attr: 'placeholder', showSkeleton: true },
			{ hash: 'xyz', kind: 'attr', content: 'Search', attr: 'aria-label', showSkeleton: true }, // different attr
			{ hash: 'xyz', kind: 'attr', content: 'Search', attr: 'placeholder', showSkeleton: true }, // duplicate
		]
		const result = dedupePendingSegments(pending)
		expect(result).toHaveLength(2)
		expect(result[0].attr).toBe('placeholder')
		expect(result[1].attr).toBe('aria-label')
	})

	it('treats same hash with different kind as unique', () => {
		const pending: PendingSegment[] = [
			{ hash: 'same', kind: 'text', content: 'Hello', showSkeleton: true },
			{ hash: 'same', kind: 'html', content: 'Hello', showSkeleton: true },
			{ hash: 'same', kind: 'text', content: 'Hello', showSkeleton: true }, // duplicate of first
		]
		const result = dedupePendingSegments(pending)
		expect(result).toHaveLength(2)
		expect(result[0].kind).toBe('text')
		expect(result[1].kind).toBe('html')
	})
})
