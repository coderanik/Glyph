import { describe, expect, it } from 'vitest'
import { changedNewLines, diffLines, rangesForLines } from '../lib/diffLines'

describe('diffLines', () => {
  it('shows removed and added lines like a comparison', () => {
    const rows = diffLines('alpha\nbeta\ngamma', 'alpha\nBETA\ngamma', 1)
    expect(rows.some((row) => row.kind === 'del' && row.text === 'beta')).toBe(true)
    expect(rows.some((row) => row.kind === 'add' && row.text === 'BETA')).toBe(true)
    expect(changedNewLines(rows)).toContain(2)
  })

  it('maps a changed line onto offsets in the later text', () => {
    const after = 'alpha\nBETA\ngamma'
    expect(rangesForLines(after, after, [2])).toEqual([{ from: 6, to: 10 }])
  })
})
