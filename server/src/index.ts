import './config/env.js'
import { Server } from 'http'
import { clerkMiddleware } from '@hono/clerk-auth'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/authRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import { initializeDatabase, query } from './config/db.js'

// Initialize database schema tables on startup
initializeDatabase().catch((err) => {
  console.error('Fatal: Failed to connect or initialize database:', err);
  process.exit(1);
});

export const app = new Hono()


const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:3000', 'http://localhost:3001','http://localhost:3002'];

// Always allow local development origins in addition to configured ones
const allowedOrigins = new Set([
  ...frontendUrls,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]);

app.use('*', cors({
  origin: (origin) => {
    if (allowedOrigins.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }
    return frontendUrls[0];
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400,
}))

app.use('*', clerkMiddleware())
app.route('/auth', authRoutes)
app.route('/projects', projectRoutes)

app.post('/subscribe', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email || !email.includes('@')) {
      return c.json({ error: 'Invalid email address' }, 400);
    }
    
    // Insert into database, ignore if duplicate email
    await query(
      'INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    
    return c.json({ success: true });
  } catch (err) {
    console.error('Error in subscribe route:', err);
    return c.json({ error: 'Failed to subscribe' }, 500);
  }
})

app.get('/', (c) => {
  return c.text('Backend is running!')
})

let port = 8083;
if (process.env.PORT) {
  const parsed = parseInt(process.env.PORT, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 65535) {
    console.error(`Fatal: Invalid PORT environment variable "${process.env.PORT}". Port must be a valid integer between 0 and 65535.`);
    process.exit(1);
  }
  port = parsed;
}

import { WebSocket, WebSocketServer } from 'ws'
import { setupWSConnection } from './config/yjsServer.js'
import { startCompileWorker } from './compileWorker.js'

if (process.env.NODE_ENV !== 'test') {
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  }, (info) => {
    console.log(`Server is running on http://0.0.0.0:${info.port}`)
  })

  interface ExtWebSocket extends WebSocket {
    isAlive?: boolean
  }

  const wss = new WebSocketServer({ server: server as unknown as Server })

  wss.on('connection', (conn: ExtWebSocket, req) => {
    conn.isAlive = true
    conn.on('pong', () => {
      conn.isAlive = true
    })

    const url = req.url || ''
    // Expected path format: /ws/{fileId}
    const roomName = url.split('/').pop() || 'default'
    console.log(`🔌 New WS connection for Yjs room: ${roomName}`)
    setupWSConnection(conn, roomName)
  })

  const interval = setInterval(() => {
    wss.clients.forEach((client: ExtWebSocket) => {
      if (client.isAlive === false) {
        console.log('🔌 Terminating inactive/broken WebSocket connection.')
        return client.terminate()
      }
      client.isAlive = false
      client.ping()
    })
  }, 20000)

  wss.on('close', () => {
    clearInterval(interval)
  })

  // Poll compilation_jobs in this process so a separate Render worker is optional
  if (process.env.DISABLE_INLINE_COMPILER !== 'true') {
    void startCompileWorker().catch((err) => {
      console.error('Fatal: in-process compile worker crashed:', err)
      process.exit(1)
    })
  }
}

// Trigger hot reload
