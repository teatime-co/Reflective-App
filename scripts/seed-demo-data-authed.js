#!/usr/bin/env node

/**
 * Seed Demo Data Script (Authenticated Mode)
 *
 * This script:
 * 1. Loads demo seed data into local database (via sqlite3 CLI)
 * 2. Pre-configures auth for test@example.com
 * 3. Sets privacy tier to FULL_SYNC
 * 4. Leaves entries ready to sync (they'll upload on next sync cycle)
 *
 * Prerequisites:
 * - Backend server running with test@example.com account created
 * - App must have started at least once to initialize schema
 * - sqlite3 CLI installed (brew install sqlite3)
 *
 * Usage: node scripts/seed-demo-data-authed.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getAuthToken(email, password) {
  try {
    const response = await fetch('http://localhost:8000/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    throw new Error(`Failed to authenticate: ${error.message}`);
  }
}

async function storeAuthToken(token) {
  const { default: keytar } = await import('keytar');

  try {
    await keytar.setPassword('reflective', 'auth-token', token);
    log('Stored auth token in keychain', 'green');
    return true;
  } catch (error) {
    log(`Warning: Could not store token in keychain: ${error.message}`, 'yellow');
    return false;
  }
}

async function main() {
  log('\n=========================================', 'bright');
  log('Reflective Authenticated Demo Data Seeder', 'bright');
  log('=========================================\n', 'bright');

  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'testpass123';
  const BACKEND_URL = 'http://localhost:8000';

  const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'reflective-web', 'reflective', 'database.db');
  const seedPath = path.join(__dirname, 'seed-data-demo.sql');
  const settingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'reflective-web', 'config.json');

  log(`Database path: ${dbPath}`, 'blue');

  if (!fs.existsSync(dbPath)) {
    log('\nError: Database not found!', 'red');
    log('Please start the app first to initialize the database schema.', 'yellow');
    log('Then run this script again.\n', 'yellow');
    process.exit(1);
  }

  log('\nStep 1: Checking backend connectivity...', 'blue');
  try {
    const healthCheck = await fetch(`${BACKEND_URL}/api/encryption/context`);
    if (!healthCheck.ok) throw new Error('Backend not responding');
    log('Backend is running', 'green');
  } catch (error) {
    log('\nError: Backend server not accessible!', 'red');
    log(`Make sure the server is running at ${BACKEND_URL}`, 'yellow');
    log('Run: cd reflective-server && uvicorn app.main:app --reload\n', 'yellow');
    process.exit(1);
  }

  log('\nStep 2: Authenticating with backend...', 'blue');
  let authToken;
  try {
    authToken = await getAuthToken(TEST_EMAIL, TEST_PASSWORD);
    log(`Authenticated as ${TEST_EMAIL}`, 'green');
  } catch (error) {
    log('\nError: Authentication failed!', 'red');
    log(error.message, 'yellow');
    log('\nMake sure test@example.com account exists:', 'yellow');
    log('  cd reflective-server && python dev_reset.py\n', 'yellow');
    process.exit(1);
  }

  log('\nStep 3: Storing auth token in keychain...', 'blue');
  await storeAuthToken(authToken);

  log('\nStep 4: Loading demo seed data...', 'blue');

  if (!fs.existsSync(seedPath)) {
    log('\nError: Seed data file not found!', 'red');
    log(`Expected: ${seedPath}\n`, 'yellow');
    process.exit(1);
  }

  try {
    // Use sqlite3 CLI to load data (avoids Node.js vs Electron native module conflict)
    execSync(`sqlite3 "${dbPath}" < "${seedPath}"`, { stdio: 'pipe' });
    log('Loaded demo seed data', 'green');

    // Verify data was loaded
    const entryCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM entries;"`, { encoding: 'utf8' }).trim();
    const tagCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM tags;"`, { encoding: 'utf8' }).trim();

    log(`Loaded ${entryCount} entries and ${tagCount} tags`, 'green');

  } catch (error) {
    log('\nError loading seed data:', 'red');
    log(error.message, 'red');
    if (error.stderr) {
      log(error.stderr.toString(), 'red');
    }
    process.exit(1);
  }

  log('\nStep 5: Configuring settings...', 'blue');
  try {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    settings.privacyTier = 'full_sync';
    settings.backendUrl = BACKEND_URL;
    settings.lastSyncTime = null;

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    log('Set privacy tier to FULL_SYNC', 'green');
  } catch (error) {
    log(`Warning: Could not update settings: ${error.message}`, 'yellow');
  }

  log('\n=========================================', 'bright');
  log('Setup Complete!', 'green');
  log('=========================================\n', 'bright');

  log('Configuration:', 'bright');
  log(`  User: ${TEST_EMAIL}`, 'blue');
  log(`  Privacy Tier: FULL_SYNC`, 'blue');
  log(`  Backend: ${BACKEND_URL}`, 'blue');
  log(`  Local Entries: 35`, 'blue');
  log(`  Backend Entries: 0 (will sync on app start)`, 'blue');

  log('\nNext steps:', 'bright');
  log('  1. Start the app: npm run dev', 'yellow');
  log('  2. App will auto-sync entries to backend (30-second cycle)', 'yellow');
  log('  3. Watch sync indicator for upload progress', 'yellow');
  log('  4. Verify backend has entries:', 'yellow');
  log('     curl http://localhost:8000/api/sync/backups \\', 'yellow');
  log('       -H "Authorization: Bearer <token>"\n', 'yellow');
}

main().catch(error => {
  log('\nUnexpected error:', 'red');
  log(error.stack, 'red');
  process.exit(1);
});
