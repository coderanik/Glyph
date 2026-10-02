import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Sidebar from '../components/Sidebar'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null }),
}))

describe('Sidebar search', () => {
  it('lists matches from the search panel and jumps to one', () => {
    const onSearchJump = vi.fn()
    render(
      <Sidebar
        isEditor
        isOpen
        activeActivityItem={1}
        files={[
          { id: 'file-1', name: 'main.tex', path: 'main.tex', content: 'A glyph in the margin' },
        ]}
        activeFileId="file-1"
        onSearchJump={onSearchJump}
      />
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Search files' }), {
      target: { value: 'glyph' },
    })

    fireEvent.click(screen.getByRole('button', { name: /glyph/i }))
    expect(onSearchJump).toHaveBeenCalledWith('file-1', 2, 7)
  })
})
