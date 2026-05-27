// Load environment variables from .env file before any other modules are imported
try {
  process.loadEnvFile();
} catch (e) {
  console.warn('Could not load .env file:', e);
}
