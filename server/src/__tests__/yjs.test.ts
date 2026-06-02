import { vi, describe, it, expect, beforeEach } from 'vitest'
import { query } from '../config/db.js'
import type { QueryResult, QueryResultRow } from 'pg'
import type { WebSocket } from 'ws'

function mockQueryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: '',
    rowCount: rows.length,
    oid: 0,
    fields: [],
  }
}

// Mock db query
vi.mock('../config/db.js', () => ({
  initializeDatabase: vi.fn(),
  query: vi.fn(),
}))

import { setupWSConnection, forceSaveRoom } from '../config/yjsServer.js'

// Simple mock for WebSocket
class MockWebSocket {
  binaryType = ''
  readyState = 1 // OPEN
  sentMessages: any[] = []
  listeners: { [event: string]: Function[] } = {}

  send(data: any) {
    this.sentMessages.push(data)
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  }

  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args))
    }
  }
}

describe('Yjs Collaborative Socket Server Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize room state from database when a client connects', async () => {
    // Mock DB select returning a file with content
    vi.mocked(query).mockResolvedValueOnce(mockQueryResult([
      { id: 'room-1', content: 'Initial Text Content', yjs_state: null }
    ]))

    const ws = new MockWebSocket()
    await setupWSConnection(ws as unknown as WebSocket, 'room-1')

    // Wait a brief tick for async db load inside setupWSConnection
    await new Promise(resolve => setTimeout(resolve, 10))

    // Should have set binaryType
    expect(ws.binaryType).toBe('arraybuffer')

    // Should have sent sync step 1 message
    expect(ws.sentMessages.length).toBeGreaterThan(0)
    expect(query).toHaveBeenCalledWith('SELECT yjs_state, content FROM files WHERE id = $1', ['room-1'])
  })

  it('should save the room state to database when last client disconnects', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ id: 'room-2', content: '', yjs_state: null }])) // load
      .mockResolvedValueOnce(mockQueryResult([])) // save on disconnect

    const ws = new MockWebSocket()
    await setupWSConnection(ws as unknown as WebSocket, 'room-2')

    await new Promise(resolve => setTimeout(resolve, 10))

    // Disconnect client
    ws.trigger('close')

    // Wait for async disconnect save to complete
    await new Promise(resolve => setTimeout(resolve, 15))

    // Should have called update query to save Yjs state
    expect(vi.mocked(query)).toHaveBeenCalledTimes(2)
    const secondCall = vi.mocked(query).mock.calls[1]
    expect(secondCall[0]).toContain('UPDATE files SET yjs_state = $1, content = $2')
  })
})
