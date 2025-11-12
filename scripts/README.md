# Reflective Scripts

Utility scripts for development and demo preparation.

## Dev Reset Workflow

Three scripts are provided to reset your development environment with demo data:

### Option 1: All-in-One Reset (Recommended)

**Script:** `dev-reset-all.sh`

Fully automated workflow that handles everything:
1. Stops running Electron app
2. Backs up and removes database
3. Starts app to initialize schema
4. Loads demo seed data
5. Displays statistics

**Usage:**
```bash
cd reflective-web
./scripts/dev-reset-all.sh
```

This is the easiest option for a complete reset and demo preparation.

### Option 2: Manual Two-Step Reset

**Step 1:** Run the reset script
```bash
./scripts/dev-reset.sh
```

This will:
- Stop Electron
- Back up database
- Remove database
- Optionally clear settings and keychain

**Step 2:** Start app and seed data
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait ~5 seconds for schema init)
node scripts/seed-demo-data.js
```

This gives you more control over the process.

### Option 3: Seed Data Only

If you only want to refresh the data without resetting everything:

```bash
node scripts/seed-demo-data.js
```

This will clear and reload entries, tags, and themes (keeps other tables intact).

## Demo Seed Data

### Dataset Overview

**File:** `seed-data-demo.sql`

**Contents:**
- 35 diverse journal entries spanning 60 days (Sept 10 - Nov 9)
- 10 pre-defined tags with colors
- 70 pre-generated themes with confidence scores
- 85+ entry-tag mappings (2-3 tags per entry)

### Sentiment Distribution

- **Positive entries (12)**: Achievements, gratitude, relationships, personal growth
  - Sentiment scores: +2.4 to +3.5
  - Examples: Fitness milestones, career wins, family time

- **Neutral/Mixed entries (14)**: Work challenges, learning, routines, health management
  - Sentiment scores: -0.2 to +0.6
  - Examples: Project planning, goal-setting, navigating conflicts

- **Negative entries (9)**: Mental health struggles, anxiety, work stress, relationship tensions
  - Sentiment scores: -2.5 to -1.5
  - Examples: Health anxiety, career frustration, social isolation

### Tags Included

All tags have color codes and realistic usage counts:

| Tag | Color | Usage | Purpose |
|-----|-------|-------|---------|
| Mental Health | Purple | 12 | Anxiety, therapy, mental wellness |
| Fitness | Green | 10 | Exercise, running, gym |
| Work | Blue | 11 | Career, projects, deadlines |
| Relationships | Pink | 9 | Friends, family, romantic |
| Gratitude | Orange | 6 | Appreciation, thankfulness |
| Learning | Indigo | 7 | Skill development, education |
| Family | Red | 8 | Family interactions |
| Health | Teal | 6 | Medical, wellness |
| Creativity | Purple | 5 | Cooking, hobbies, art |
| Goals | Orange | 7 | Planning, ambitions |

### Themes Coverage

All 10 AI-generated themes are represented:

- **Personal Growth** (15 entries): Self-improvement, learning, discipline
- **Mental Health** (12 entries): Anxiety, therapy, meditation, struggles
- **Work & Career** (11 entries): Projects, promotions, career challenges
- **Relationships** (9 entries): Connections, conflicts, family dynamics
- **Health & Fitness** (9 entries): Exercise, medical checkups, routines
- **Challenges & Struggles** (8 entries): Difficulties, setbacks, stress
- **Learning** (4 entries): Skill-building, education, growth
- **Gratitude** (3 entries): Appreciation, thankfulness
- **Creativity** (3 entries): Hobbies, cooking, creative expression
- **Travel & Adventure** (1 entry): Weekend getaway

### Semantic Search Test Cases

The dataset is designed to test semantic search with these queries:

1. **"dealing with work stress"**
   - Should match: Entries 13, 27, 28, 31, 35
   - Demonstrates: Work-related anxiety and pressure

2. **"exercise and mental health"**
   - Should match: Entries 2, 7, 11, 32
   - Demonstrates: Fitness-wellness connection

3. **"spending time with family"**
   - Should match: Entries 3, 18, 34
   - Demonstrates: Family relationships

4. **"feeling anxious and overwhelmed"**
   - Should match: Entries 27, 29, 33, 35
   - Demonstrates: Mental health struggles

5. **"learning new skills"**
   - Should match: Entries 4, 9, 20
   - Demonstrates: Personal development

6. **"grateful for what I have"**
   - Should match: Entries 5, 8, 10, 12
   - Demonstrates: Gratitude and appreciation

## Demo Walkthrough Script

After running the dev reset, follow this sequence to demonstrate all features:

### 1. Entries Page (Timeline View)

- Shows all 35 entries in chronological order
- Displays date, word count, and tags for each
- Demonstrates card interactions (hover effects)
- Click any entry to open editor

### 2. Entry Editor

Open entry-5 (promotion celebration) to show:
- Rich text formatting (headings, bold, lists)
- Tag badges with colors
- Pre-generated themes with confidence percentages
- Sentiment indicator (green badge showing positive sentiment)
- Auto-save indicator
- Word count updates

### 3. Semantic Search

Navigate to Search page and try:
- **Query 1:** "work stress and deadlines"
  - Should return entries 13, 27, 28 with similarity scores
- **Query 2:** "mental health and therapy"
  - Should return entries 1, 27, 29, 33
- Shows search results with entry previews
- Click result to navigate to entry
- Demonstrates vector-based semantic matching

### 4. Tags Page

Browse tag management:
- 10 colored tags with usage counts
- Filter entries by tag
- Click tag to see all related entries
- Shows tag statistics

### 5. Insights Dashboard

Demonstrate analytics:
- **Theme Distribution Chart**: Bar chart showing all 10 themes
- **Sentiment Trend**: Line chart showing mood over 60 days
  - Mix of positive, neutral, negative entries
  - Visual trend line
- **Keywords Cloud**: Top extracted keywords with frequency
- **Writing Statistics**:
  - Total entries: 35
  - Total words: ~1,500
  - Date range: Sept 10 - Nov 9 (60 days)

### 6. Conflict Resolution (Optional)

To demonstrate conflicts:
1. Change privacy tier to FULL_SYNC in Settings
2. Register/login with backend
3. Modify an entry in two "devices" (simulate with manual backend changes)
4. Trigger sync to create 409 conflict
5. Navigate to Conflicts page
6. Show side-by-side diff view
7. Demonstrate resolution options

## Scripts Reference

### seed-data-demo.sql

Raw SQL file with INSERT statements. Contains:
- DELETE statements to clear existing data
- Tag definitions with IDs and colors
- 35 entry INSERT statements with HTML content
- Entry-tag relationship mappings
- Theme classifications with confidence scores

**Used by:** `seed-demo-data.js`

### dev-reset.sh

Bash script for manual reset workflow. Features:
- Stops running Electron instances
- Creates timestamped database backups
- Removes database file
- Optionally clears electron-store settings
- Optionally clears OS keychain encryption keys
- Provides instructions for next steps

**Usage:** `./scripts/dev-reset.sh`

### seed-demo-data.js

Node.js script that loads demo data. Features:
- Validates database exists and schema is initialized
- Executes seed SQL file using better-sqlite3
- Calculates and displays statistics:
  - Entry, tag, theme counts
  - Sentiment distribution
  - Date range analysis
  - Theme distribution breakdown
  - Tag usage counts
- Provides demo walkthrough suggestions

**Usage:** `node scripts/seed-demo-data.js`

**Requirements:**
- App must have run at least once (to initialize schema)
- Database must exist at: `~/Library/Application Support/reflective/database.db`

### dev-reset-all.sh

All-in-one automation script. Features:
- Combines dev-reset.sh and seed-demo-data.js
- Starts app automatically
- Waits for schema initialization
- Loads seed data
- Keeps app running
- Displays recommended demo walkthrough

**Usage:** `./scripts/dev-reset-all.sh`

## Troubleshooting

### "Database not found" error

**Cause:** App has not initialized the schema yet

**Solution:**
1. Start the app: `npm run dev`
2. Wait 5-10 seconds for Electron to initialize
3. Check database exists: `ls ~/Library/Application\ Support/reflective/`
4. Run seed script again

### "Permission denied" errors on scripts

**Cause:** Scripts not executable

**Solution:**
```bash
chmod +x scripts/*.sh
```

### Seed data already exists

**Cause:** Running seed script multiple times

**Effect:** Data is cleared and reloaded (safe to run multiple times)

**Note:** The seed script includes DELETE statements, so it's idempotent

### App won't start after reset

**Cause:** Possibly conflicting Electron processes

**Solution:**
```bash
pkill -f "Electron.*reflective"
npm run dev
```

### Keychain access denied

**Cause:** macOS security settings

**Solution:**
- Allow keychain access in System Preferences
- Or skip keychain clearing step in reset script

## Database Locations

- **macOS**: `~/Library/Application Support/reflective/database.db`
- **Backups**: `~/Library/Application Support/reflective/database.backup.TIMESTAMP.db`
- **Settings**: `~/Library/Application Support/reflective/config.json`

## Future Improvements

Potential enhancements for demo preparation:

1. **Pre-generate embeddings**: Run embedding generation during seed to speed up first search
2. **Add conflict seed data**: Pre-populate conflicts table for instant conflict demo
3. **Mock sync queue**: Pre-populate sync_queue with pending operations
4. **Custom seed profiles**: Multiple seed files for different demo scenarios
5. **Video recording mode**: Seed data optimized for screen recording (shorter entries, clearer themes)

## Questions?

See main project README at `/reflective-web/README.md` for architecture details.

For backend integration setup, see `/reflective-server/README.md`.
