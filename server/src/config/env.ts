// Load environment variables from .env file before any other modules are imported.
// In Docker, environment variables are injected by docker-compose, so the .env file
// may not exist — that's fine, we just skip loading it.
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Walk up to find the .env file. Works for both:
//   - tsx watch:  src/config/env.ts  → ../../.env  → server/.env
//   - compiled:   dist/src/config/env.js → ../../../.env → server/.env
const candidates = [
  path.resolve(__dirname, '../../.env'),     // tsx watch in server/
  path.resolve(__dirname, '../../../.env'),   // compiled in server/ OR tsx watch in root/
  path.resolve(__dirname, '../../../../.env'), // compiled in root/
];

let loaded = false;
for (const envPath of candidates) {
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.slice(0, index).trim();
          let val = trimmed.slice(index + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
      console.log('✅ Loaded .env from', envPath);
      loaded = true;
      break;
    }
  } catch (err) {
    // File not found or read error at this path, try next
  }
}

if (!loaded) {
  console.log('ℹ️  No .env file found (expected in Docker where env vars are injected).');
}
