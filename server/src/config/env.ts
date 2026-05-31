// Load environment variables from .env file before any other modules are imported.
// In Docker, environment variables are injected by docker-compose, so the .env file
// may not exist — that's fine, we just skip loading it.
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Walk up to find the .env file. Works for both:
//   - tsx watch:  src/config/env.ts  → ../../.env  → server/.env
//   - compiled:   dist/src/config/env.js → ../../../.env → server/.env
const candidates = [
  path.resolve(__dirname, '../../.env'),   // tsx watch (src/config → server/)
  path.resolve(__dirname, '../../../.env'), // compiled  (dist/src/config → server/)
];

let loaded = false;
for (const envPath of candidates) {
  try {
    process.loadEnvFile(envPath);
    console.log('✅ Loaded .env from', envPath);
    loaded = true;
    break;
  } catch {
    // File not found at this path, try next
  }
}

if (!loaded) {
  console.log('ℹ️  No .env file found (expected in Docker where env vars are injected).');
}
