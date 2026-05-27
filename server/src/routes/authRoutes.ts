import {Hono} from 'hono'
import {getAuth} from '@hono/clerk-auth'
import {getMe} from '../controllers/authController.js'

const authRoutes = new Hono()

authRoutes.get('/me', (c) => {
    const {userId} = getAuth(c)
    if (!userId) {
        return c.json({ error: 'User not found' }, 404)
    }
    return getMe(c)
})

export default authRoutes