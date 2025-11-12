#!/bin/bash

# Reflective Web Client - Dev Reset Script
# Resets database to demo state with pre-populated entries, tags, and themes

set -e

echo "========================================="
echo "Reflective Dev Reset"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database path
DB_PATH="$HOME/Library/Application Support/reflective-web/reflective/database.db"
DB_DIR="$HOME/Library/Application Support/reflective-web/reflective"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Step 1: Stopping any running Electron instances..."
pkill -f "Electron.*reflective" || true
sleep 1
echo -e "${GREEN}Done${NC}"
echo ""

echo "Step 2: Backing up existing database (if exists)..."
if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="$DB_DIR/database.backup.$(date +%Y%m%d_%H%M%S).db"
    cp "$DB_PATH" "$BACKUP_PATH"
    echo -e "${GREEN}Backed up to: $BACKUP_PATH${NC}"
else
    echo -e "${YELLOW}No existing database found${NC}"
fi
echo ""

echo "Step 3: Removing database..."
if [ -f "$DB_PATH" ]; then
    rm "$DB_PATH"
    echo -e "${GREEN}Database removed${NC}"
else
    echo -e "${YELLOW}Database already removed${NC}"
fi
echo ""

echo "Step 4: Ensuring database directory exists..."
mkdir -p "$DB_DIR"
echo -e "${GREEN}Directory ready${NC}"
echo ""

echo "Step 5: Loading demo seed data..."
# The app will auto-initialize the schema on first run
# We need to use sqlite3 to load the seed data directly
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 command not found${NC}"
    echo "Please install SQLite3: brew install sqlite3"
    exit 1
fi

# Create database and run schema initialization
# Note: The schema will be created by the app on first run
# For now, we'll just inform the user
echo -e "${YELLOW}Note: Database schema will be auto-initialized on app startup${NC}"
echo "After starting the app, run: node $SCRIPT_DIR/seed-demo-data.js"
echo ""

echo "Step 6: Optional - Clear electron-store settings..."
read -p "Clear app settings (keeps database)? [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SETTINGS_PATH="$HOME/Library/Application Support/reflective-web/config.json"
    if [ -f "$SETTINGS_PATH" ]; then
        rm "$SETTINGS_PATH"
        echo -e "${GREEN}Settings cleared${NC}"
    else
        echo -e "${YELLOW}No settings file found${NC}"
    fi
else
    echo -e "${YELLOW}Keeping existing settings${NC}"
fi
echo ""

echo "Step 7: Optional - Clear OS keychain encryption keys..."
read -p "Clear encryption keys from keychain? [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Use security command to delete keychain items
    security delete-generic-password -s "reflective" -a "aes-key" 2>/dev/null || echo -e "${YELLOW}AES key not found${NC}"
    security delete-generic-password -s "reflective" -a "he-public-key" 2>/dev/null || echo -e "${YELLOW}HE public key not found${NC}"
    security delete-generic-password -s "reflective" -a "he-private-key" 2>/dev/null || echo -e "${YELLOW}HE private key not found${NC}"
    echo -e "${GREEN}Keychain cleared${NC}"
else
    echo -e "${YELLOW}Keeping existing keys${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}Reset Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Start the app: npm run dev"
echo "  2. Wait for app to initialize database schema"
echo "  3. In another terminal, run: node $SCRIPT_DIR/seed-demo-data.js"
echo ""
echo "Or use the all-in-one approach:"
echo "  ./scripts/dev-reset-all.sh"
echo ""
