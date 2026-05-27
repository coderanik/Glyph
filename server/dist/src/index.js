import './config/env.js';
import { clerkMiddleware } from '@hono/clerk-auth';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import { initializeDatabase } from './config/db.js';
// Initialize database schema tables on startup
initializeDatabase().catch((err) => {
    console.error('Fatal: Failed to connect or initialize database:', err);
});
const app = new Hono();
app.use('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use('*', clerkMiddleware());
app.route('/auth', authRoutes);
app.route('/projects', projectRoutes);
app.get('/', (c) => {
    return c.text('Backend is running!');
});
const server = serve({
    fetch: app.fetch,
    port: 8083
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
// Setup Yjs WebSocket server for collaborative editing
import { WebSocketServer } from 'ws';
import { setupWSConnection } from './config/yjsServer.js';
const wss = new WebSocketServer({ server: server });
wss.on('connection', (conn, req) => {
    const url = req.url || '';
    // Expected path format: /ws/{fileId}
    const roomName = url.split('/').pop() || 'default';
    console.log(`🔌 New WS connection for Yjs room: ${roomName}`);
    setupWSConnection(conn, roomName);
});
// Trigger hot reload
