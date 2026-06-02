import { vi, describe, it, expect, beforeEach } from 'vitest'
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

// Mock db query
vi.mock('../config/db.js', () => ({
  initializeDatabase: vi.fn(),
  query: vi.fn(),
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    rm: vi.fn().mockResolvedValue(undefined),
    realpath: vi.fn((p) => p),
  }
}))

// Mock existsSync
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}))

// Mock child_process exec
const mockExec = vi.fn()
vi.mock('child_process', () => ({
  exec: (cmd: string, opts: any, cb: any) => {
    mockExec(cmd, opts, cb)
  }
}))

import { pollQueue, compileJob } from '../compileWorker.js'

describe('Compile Worker Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
      cb(null, { stdout: 'latexmk output', stderr: '' })
    })
  })

  it('pollQueue should return false if no jobs in queue', async () => {
    vi.mocked(query).mockResolvedValue(mockQueryResult([]))
    const result = await pollQueue()
    expect(result).toBe(false)
  })

  it('pollQueue should claim a job and run it successfully', async () => {
    // 1st call: pollQueue claims the job
    // 2nd call: compileJob fetches the project files
    // 3rd call: compileJob updates the database with compilation success
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ id: 'job_123', projectId: 'proj_123' }]))
      .mockResolvedValueOnce(mockQueryResult([{ path: 'main.tex', content: 'test content' }]))
      .mockResolvedValueOnce(mockQueryResult([]))

    const result = await pollQueue()
    expect(result).toBe(true)
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('compileJob should handle compiler failure gracefully', async () => {
    // Mock compileJob fetches files
    vi.mocked(query)
      .mockResolvedValueOnce(mockQueryResult([{ path: 'main.tex', content: 'bad content' }]))
      .mockResolvedValueOnce(mockQueryResult([])) // update job status call

    // Force mockExec / exec to fail for this test
    mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
      cb(new Error('Compilation failed'), { stdout: '', stderr: 'LaTeX Error' })
    })

    await compileJob('job_456', 'proj_456')
    expect(query).toHaveBeenCalledTimes(2)
  })
})
