import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastStack from '../components/ToastStack'

describe('ConfirmDialog', () => {
  it('asks in the page and confirms only when the button is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Move to trash?"
        message={'"Recursive Resume" will be moved to trash. You can restore it later.'}
        confirmLabel="Move to trash"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    expect(screen.getByRole('dialog', { name: 'Move to trash?' })).toBeDefined()
    expect(screen.getByText(/Recursive Resume/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('ToastStack', () => {
  it('shows a toast card for a completed action', () => {
    const onDismiss = vi.fn()
    render(
      <ToastStack
        toasts={[{ id: 1, message: 'Recursive Resume has been moved to trash', tone: 'success' }]}
        onDismiss={onDismiss}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /moved to trash/ }))
    expect(onDismiss).toHaveBeenCalledWith(1)
  })
})
