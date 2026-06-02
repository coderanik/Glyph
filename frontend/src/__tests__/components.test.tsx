import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import StatusBar from '../components/StatusBar'

vi.mock('lucide-react', () => {
  return {
    Circle: () => <div data-testid="icon-circle" />,
    Clock: () => <div data-testid="icon-clock" />,
    FileText: () => <div data-testid="icon-filetext" />,
    AlignLeft: () => <div data-testid="icon-alignleft" />,
    CheckCircle: () => <div data-testid="icon-checkcircle" />,
    Loader2: () => <div data-testid="icon-loader2" />,
    Save: () => <div data-testid="icon-save" />,
  }
})

describe('StatusBar Component', () => {
  it('renders connected state with online count and word count', () => {
    render(
      <StatusBar
        connected={true}
        onlineCount={3}
        wordCount={450}
        hasErrors={false}
        errorCount={0}
        autoSaveStatus="idle"
      />
    )
    expect(screen.getByText('Connected · 3 online')).toBeDefined()
    expect(screen.getByText('450 words')).toBeDefined()
    expect(screen.getByText('Compiled')).toBeDefined()
  })

  it('renders disconnected state when connection is offline', () => {
    render(
      <StatusBar
        connected={false}
        onlineCount={0}
        wordCount={10}
        hasErrors={false}
        errorCount={0}
      />
    )
    expect(screen.getByText('Disconnected')).toBeDefined()
  })

  it('renders auto-save saving state', () => {
    render(
      <StatusBar
        connected={true}
        onlineCount={1}
        wordCount={10}
        hasErrors={false}
        errorCount={0}
        autoSaveStatus="saving"
      />
    )
    expect(screen.getByText('Saving...')).toBeDefined()
  })

  it('renders auto-save saved state', () => {
    render(
      <StatusBar
        connected={true}
        onlineCount={1}
        wordCount={10}
        hasErrors={false}
        errorCount={0}
        autoSaveStatus="saved"
      />
    )
    expect(screen.getByText('Saved')).toBeDefined()
  })

  it('renders error counts when compilation has errors', () => {
    render(
      <StatusBar
        connected={true}
        onlineCount={1}
        wordCount={10}
        hasErrors={true}
        errorCount={4}
      />
    )
    expect(screen.getByText('4 errors')).toBeDefined()
  })
})
