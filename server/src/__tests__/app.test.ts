import { vi, describe, it, expect } from 'vitest'
import type { Context, Next, ContextVariableMap } from 'hono'

// Mock the database configuration to prevent real connections during tests
vi.mock('../config/db.js', () => ({
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  pool: {
    connect: vi.fn(),
    on: vi.fn(),
  },
}))

// Mock Clerk authentication middleware and helper functions
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (c: Context, next: Next) => {
    // Mock the clerk client environment variable/context setter
    c.set('clerk', {
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_123',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: 'https://example.com/john.png',
          createdAt: 1700000000000,
        }),
      },
    } as unknown as ContextVariableMap['clerk'])
    await next()
  },
  getAuth: (c: Context) => {
    // Default mock response for getAuth in routes
    const authHeader = c.req.header('Authorization')
    if (authHeader === 'Bearer mock-valid-token') {
      return { userId: 'user_123' }
    }
    return { userId: null }
  },
}))

import { app } from '../index.js'

describe('Backend Server API Tests', () => {
  it('GET / should return 200 and backend status text', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Backend is running!')
  })

  it('GET /auth/me without token should return 404/401 unauthorized or not found', async () => {
    const res = await app.request('/auth/me')
    // According to authRoutes.ts, if !userId, it returns 404 with { error: 'User not found' }
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toEqual({ error: 'User not found' })
  })

  it('GET /auth/me with valid mock token should return user profile info', async () => {
    const res = await app.request('/auth/me', {
      headers: {
        Authorization: 'Bearer mock-valid-token',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      id: 'user_123',
      email: 'test@example.com',
      name: 'John Doe',
      imageUrl: 'https://example.com/john.png',
      createdAt: 1700000000000,
    })
  })
})
