import type { Context } from 'hono'
import { getAuth } from '@hono/clerk-auth'

export const getMe = async (c: Context) => {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const clerkClient = c.get('clerk')
  const user = await clerkClient.users.getUser(auth.userId)
  return c.json({
    id: user.id,
    email: user.emailAddresses?.[0]?.emailAddress ?? null,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    imageUrl: user.imageUrl ?? null,
    createdAt: user.createdAt,
  })
}
