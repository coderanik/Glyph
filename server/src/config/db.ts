import pg from 'pg';

const { Pool } = pg;

// We use the DATABASE_URL environment variable to connect to Supabase/PostgreSQL
let databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.includes('[YOUR-PASSWORD]')) {
  console.warn('⚠️ Warning: DATABASE_URL contains placeholder [YOUR-PASSWORD]. Falling back to local default.');
  databaseUrl = undefined;
}

if (!databaseUrl) {
  console.warn('⚠️ Warning: DATABASE_URL environment variable is not defined or is placeholder. Using local Postgres default.');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  // For serverless environments or long-lived server, configure pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // If connecting to Supabase over SSL (recommended/required in production):
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Prevent unhandled errors from crashing the Node.js server when connections drop/time out in the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle pg pool client:', err);
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Automatically create database tables if they do not exist
export async function initializeDatabase() {
  console.log('🔄 Initializing PostgreSQL database schema...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 1. Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Files Table (Store contents as TEXT)
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        path VARCHAR(500) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, path)
      )
    `);

    // Ensure yjs_state column exists for persistence
    await client.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS yjs_state BYTEA');

    // 3. Compilation Jobs Table
    // Added pdf_data BYTEA to store the compiled PDF directly in the database
    await client.query(`
      CREATE TABLE IF NOT EXISTS compilation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
        pdf_url TEXT,
        logs TEXT,
        pdf_data BYTEA,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 4. Project Collaborators Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_collaborators (
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        permission VARCHAR(10) NOT NULL CHECK (permission IN ('read', 'write')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, user_id)
      )
    `);

    // 5. Share Links Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS share_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        permission VARCHAR(10) NOT NULL CHECK (permission IN ('read', 'write')),
        token VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL database schema initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to initialize database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}
