import { describe, it, expect } from 'vitest'
import { findTextMatches } from '../lib/searchFiles'

describe('findTextMatches', () => {
  const files = [
    { id: 'a', name: 'main.tex', content: 'Hello Glyph\n\\section{Intro}\nHello again' },
    { id: 'b', name: 'refs.bib', content: 'glyph paper' },
  ]

  it('finds matches across files with line numbers', () => {
    const matches = findTextMatches(files, 'hello')
    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({ fileId: 'a', fileName: 'main.tex', line: 1, from: 0, to: 5 })
    expect(matches[1]).toMatchObject({ fileId: 'a', line: 3 })
  })

  it('matches case-insensitively in other files', () => {
    const matches = findTextMatches(files, 'Glyph')
    expect(matches.map((hit) => hit.fileName)).toEqual(['main.tex', 'refs.bib'])
  })

  it('returns nothing for a blank query', () => {
    expect(findTextMatches(files, '   ')).toEqual([])
  })
})
