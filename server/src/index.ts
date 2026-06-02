import './config/env.js'
import { Server } from 'http'
import { clerkMiddleware } from '@hono/clerk-auth'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/authRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import { initializeDatabase } from './config/db.js'

// Initialize database schema tables on startup
initializeDatabase().catch((err) => {
  console.error('Fatal: Failed to connect or initialize database:', err);
  process.exit(1);
});

export const app = new Hono()


const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use('*', cors({
  origin: frontendUrls,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  credentials: true,
}))

app.use('*', clerkMiddleware())
app.route('/auth', authRoutes)
app.route('/projects', projectRoutes)


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

if (process.env.NODE_ENV !== 'test') {
  const server = serve({
    fetch: app.fetch,
    port
  }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  })

  const wss = new WebSocketServer({ server: server as unknown as Server })

  wss.on('connection', (conn: WebSocket, req) => {
    const url = req.url || ''
    // Expected path format: /ws/{fileId}
    const roomName = url.split('/').pop() || 'default'
    console.log(`🔌 New WS connection for Yjs room: ${roomName}`)
    setupWSConnection(conn, roomName)
  })
}

// Trigger hot reload
