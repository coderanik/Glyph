import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Context, Next, ContextVariableMap } from 'hono'
import { query } from '../config/db.js'
import type { QueryResult, QueryResultRow } from 'pg'

function mockQueryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: '',
    rowCount: rows.length,
    oid: 0,
    fields: [],
  }
}

// We will mock db.js
vi.mock('../config/db.js', () => ({
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  pool: {
    connect: vi.fn(),
    on: vi.fn(),
  },
}))

// We will mock Clerk
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (c: Context, next: Next) => {
    c.set('clerk', {
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_123',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'John',
          lastName: 'Doe',
        }),
      },
    } as unknown as ContextVariableMap['clerk'])
    await next()
  },
  getAuth: (c: Context) => {
    return { userId: 'user_123' }
  },
}))

import { app } from '../index.js'

describe('Project Controller API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /projects should return lists of user projects', async () => {
    const mockProjects = [
      { id: 'proj-1', name: 'Project 1', owner_id: 'user_123', created_at: '2026-06-02' }
    ]
    // Mock the query return value
    vi.mocked(query).mockResolvedValue(mockQueryResult(mockProjects))

    const res = await app.request('/projects', {
      headers: { Authorization: 'Bearer mock-token' }
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].name).toBe('Project 1')
  })

  it('POST /projects should create a new project', async () => {
    const mockCreated = { id: 'proj-2', name: 'New Project', ownerId: 'user_123' }
    vi.mocked(query).mockResolvedValue(mockQueryResult([mockCreated]))

    const res = await app.request('/projects', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Project' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('New Project')
  })

  it('GET /projects/:projectId/files should return project files', async () => {
    // Mock checkProjectAccess (owner_id check)
    // 1st call for checkProjectAccess: select owner_id
    // 2nd call for getFiles: select files
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ owner_id: 'user_123' }]))
      .mockResolvedValueOnce(mockQueryResult([{ id: 'file-1', name: 'main.tex', path: 'main.tex', content: 'hello' }]))

    const res = await app.request('/projects/proj-1/files', {
      headers: { Authorization: 'Bearer mock-token' }
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].name).toBe('main.tex')
  })

  it('POST /projects/:projectId/files should create a file if owner', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ owner_id: 'user_123' }])) // checkProjectAccess
      .mockResolvedValueOnce(mockQueryResult([])) // previous content
      .mockResolvedValueOnce(mockQueryResult([{ id: 'file-2', name: 'test.tex', path: 'test.tex', content: 'content' }])) // insert file
      .mockResolvedValueOnce(mockQueryResult([])) // revision insert
      .mockResolvedValueOnce(mockQueryResult([])) // trim old revisions

    const res = await app.request('/projects/proj-1/files', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test.tex', content: 'content' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('test.tex')
  })

  it('GET /projects/:projectId/pdf returns the latest successful PDF', async () => {
    const pdf = Buffer.from('%PDF-1.4')
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ owner_id: 'user_123' }]))
      .mockResolvedValueOnce(mockQueryResult([{ pdf_data: pdf }]))

    const res = await app.request('/projects/proj-1/pdf', {
      headers: { Authorization: 'Bearer mock-token' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
  })

  it('GET /projects/:projectId/pdf is 404 when nothing has compiled', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ owner_id: 'user_123' }]))
      .mockResolvedValueOnce(mockQueryResult([]))

    const res = await app.request('/projects/proj-1/pdf', {
      headers: { Authorization: 'Bearer mock-token' },
    })
    expect(res.status).toBe(404)
  })

  it('GET /projects/:projectId/files/:fileId/revisions lists saved changes', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ owner_id: 'user_123' }]))
      .mockResolvedValueOnce(mockQueryResult([{
        id: 'rev-1',
        createdAt: '2026-10-03T03:08:00.000Z',
        summary: '\\section{Intro}',
        fileName: 'main.tex',
      }]))

    const res = await app.request('/projects/proj-1/files/file-1/revisions', {
      headers: { Authorization: 'Bearer mock-token' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json[0].summary).toBe('\\section{Intro}')
  })
})
