#!/usr/bin/env node

/**
 * Seed Demo Data Script
 *
 * Loads the demo seed data into the Reflective database.
 * Run this AFTER the app has started at least once to initialize the schema.
 *
 * Usage: node scripts/seed-demo-data.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
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

function main() {
  log('\n=========================================', 'bright');
  log('Reflective Demo Data Seeder', 'bright');
  log('=========================================\n', 'bright');

  // Database path
  const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'reflective', 'database.db');

  log(`Database path: ${dbPath}`, 'blue');

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    log('\nError: Database not found!', 'red');
    log('Please start the app first to initialize the database schema.', 'yellow');
    log('Then run this script again.\n', 'yellow');
    process.exit(1);
  }

  // Open database
  log('\nOpening database...', 'blue');
  const db = new Database(dbPath);

  try {
    // Check if schema is initialized
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);

    log(`Found ${tables.length} tables: ${tableNames.join(', ')}`, 'green');

    if (!tableNames.includes('entries')) {
      log('\nError: Database schema not initialized!', 'red');
      log('Please start the app first to create the schema.', 'yellow');
      log('Then run this script again.\n', 'yellow');
      db.close();
      process.exit(1);
    }

    // Read seed SQL file
    const seedPath = path.join(__dirname, 'seed-data-demo.sql');
    log(`\nReading seed data from: ${seedPath}`, 'blue');

    if (!fs.existsSync(seedPath)) {
      log('\nError: Seed data file not found!', 'red');
      log(`Expected: ${seedPath}\n`, 'yellow');
      db.close();
      process.exit(1);
    }

    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Execute seed SQL
    log('\nExecuting seed data...', 'blue');
    db.exec(seedSQL);

    // Get statistics
    log('\nGathering statistics...', 'blue');

    const entryCount = db.prepare('SELECT COUNT(*) as count FROM entries').get().count;
    const tagCount = db.prepare('SELECT COUNT(*) as count FROM tags').get().count;
    const themeCount = db.prepare('SELECT COUNT(*) as count FROM themes').get().count;
    const entryTagCount = db.prepare('SELECT COUNT(*) as count FROM entry_tags').get().count;

    // Get sentiment distribution
    const sentimentStats = db.prepare(`
      SELECT
        COUNT(CASE WHEN sentiment_score > 1.0 THEN 1 END) as positive,
        COUNT(CASE WHEN sentiment_score BETWEEN -1.0 AND 1.0 THEN 1 END) as neutral,
        COUNT(CASE WHEN sentiment_score < -1.0 THEN 1 END) as negative,
        ROUND(AVG(sentiment_score), 2) as avg_sentiment,
        MIN(sentiment_score) as min_sentiment,
        MAX(sentiment_score) as max_sentiment
      FROM entries
    `).get();

    // Get date range
    const dateRange = db.prepare(`
      SELECT
        MIN(created_at) as first_entry,
        MAX(created_at) as last_entry
      FROM entries
    `).get();

    const firstDate = new Date(dateRange.first_entry).toLocaleDateString();
    const lastDate = new Date(dateRange.last_entry).toLocaleDateString();

    // Get theme distribution
    const themeDistribution = db.prepare(`
      SELECT theme_name, COUNT(*) as count
      FROM themes
      GROUP BY theme_name
      ORDER BY count DESC
    `).all();

    // Get tag usage
    const tagUsage = db.prepare(`
      SELECT t.name, COUNT(et.entry_id) as usage
      FROM tags t
      LEFT JOIN entry_tags et ON t.id = et.tag_id
      GROUP BY t.id, t.name
      ORDER BY usage DESC
    `).all();

    // Display results
    log('\n=========================================', 'bright');
    log('Seed Complete!', 'green');
    log('=========================================\n', 'bright');

    log('Database Statistics:', 'bright');
    log(`  Entries: ${entryCount}`, 'green');
    log(`  Tags: ${tagCount}`, 'green');
    log(`  Themes: ${themeCount}`, 'green');
    log(`  Entry-Tag Links: ${entryTagCount}`, 'green');

    log('\nDate Range:', 'bright');
    log(`  First Entry: ${firstDate}`, 'blue');
    log(`  Last Entry: ${lastDate}`, 'blue');
    log(`  Span: ${Math.ceil((dateRange.last_entry - dateRange.first_entry) / (1000 * 60 * 60 * 24))} days`, 'blue');

    log('\nSentiment Distribution:', 'bright');
    log(`  Positive (>1.0): ${sentimentStats.positive}`, 'green');
    log(`  Neutral (-1.0 to 1.0): ${sentimentStats.neutral}`, 'yellow');
    log(`  Negative (<-1.0): ${sentimentStats.negative}`, 'red');
    log(`  Average: ${sentimentStats.avg_sentiment}`, 'blue');
    log(`  Range: ${sentimentStats.min_sentiment} to ${sentimentStats.max_sentiment}`, 'blue');

    log('\nTheme Distribution:', 'bright');
    themeDistribution.forEach(theme => {
      log(`  ${theme.theme_name}: ${theme.count}`, 'blue');
    });

    log('\nTag Usage:', 'bright');
    tagUsage.forEach(tag => {
      log(`  ${tag.name}: ${tag.usage} entries`, 'blue');
    });

    log('\n=========================================', 'bright');
    log('Ready for Demo!', 'green');
    log('=========================================\n', 'bright');

    log('Next steps:', 'bright');
    log('  1. Open the app (should already be running)', 'yellow');
    log('  2. Navigate to entries to see the timeline', 'yellow');
    log('  3. Try semantic search: "work stress" or "exercise and mental health"', 'yellow');
    log('  4. Check insights dashboard for theme/sentiment visualizations', 'yellow');
    log('  5. Browse tags page to see all categorized entries\n', 'yellow');

  } catch (error) {
    log('\nError seeding database:', 'red');
    log(error.message, 'red');
    log(error.stack, 'red');
    db.close();
    process.exit(1);
  }

  db.close();
  log('Database closed.\n', 'blue');
}

main();
