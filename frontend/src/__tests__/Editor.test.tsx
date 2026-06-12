import React from 'react'
import { render } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Editor from '../components/Editor'

// Mock yjs
vi.mock('yjs', () => {
  class MockText {
    observers: ((...args: unknown[]) => void)[] = []
    observe(cb: (...args: unknown[]) => void) {
      this.observers.push(cb)
    }
    toString() {
      return 'mocked-yjs-content'
    }
    insert() {}
    unobserve(cb: (...args: unknown[]) => void) {
      this.observers = this.observers.filter(o => o !== cb)
    }
  }
  class MockDoc {
    getText() {
      return new MockText()
    }
  }
  return {
    Doc: MockDoc,
    Text: MockText,
  }
})

// Mock y-websocket
vi.mock('y-websocket', () => {
  class MockWebsocketProvider {
    on(event: string, cb: (sync: boolean) => void) {
      if (event === 'sync') {
        cb(true)
      }
    }
    off(event: string, cb: (...args: unknown[]) => void) {}
    connect() {}
    destroy() {}
  }
  return {
    WebsocketProvider: MockWebsocketProvider,
  }
})

// Mock y-codemirror.next
vi.mock('y-codemirror.next', () => ({
  yCollab: vi.fn(),
}))

// Mock codemirror & @codemirror/state
vi.mock('codemirror', () => ({
  EditorView: class MockEditorView {
    destroy = vi.fn()
    dispatch = vi.fn()
  },
  basicSetup: [],
}))

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({})),
    readOnly: {
      of: vi.fn(),
    },
  },
  Compartment: class {
    of = vi.fn(() => ({}))
    reconfigure = vi.fn(() => ({}))
  },
}))

vi.mock('@codemirror/view', () => ({
  keymap: {
    of: vi.fn(),
  },
  EditorView: {
    editable: {
      of: vi.fn(),
    },
  },
}))

describe('Editor Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and mounts the container', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Editor
        fileId="file-123"
        initialContent="Hello World"
        onChange={onChange}
      />
    )
    expect(container.firstChild).toBeDefined()
  })
})
