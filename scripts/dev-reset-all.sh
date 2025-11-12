#!/bin/bash

# Reflective Web Client - Complete Dev Reset Script
# Automates the full reset workflow: stop app, reset DB, start app, seed data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Reflective Complete Dev Reset${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Database path
DB_PATH="$HOME/Library/Application Support/reflective-web/reflective/database.db"
DB_DIR="$HOME/Library/Application Support/reflective-web/reflective"

echo -e "${YELLOW}This will:${NC}"
echo "  1. Stop any running Electron instances"
echo "  2. Back up and remove existing database"
echo "  3. Start the app to initialize schema"
echo "  4. Load demo seed data"
echo "  5. Display statistics"
echo ""
read -p "Continue? [Y/n]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

# Step 1: Stop Electron
echo -e "${BLUE}Step 1: Stopping Electron...${NC}"
pkill -f "Electron.*reflective" || true
sleep 1
echo -e "${GREEN}Done${NC}"
echo ""

# Step 2: Backup and remove database
echo -e "${BLUE}Step 2: Resetting database...${NC}"
mkdir -p "$DB_DIR"

if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="$DB_DIR/database.backup.$(date +%Y%m%d_%H%M%S).db"
    cp "$DB_PATH" "$BACKUP_PATH"
    echo -e "${GREEN}Backed up to: $BACKUP_PATH${NC}"
    rm "$DB_PATH"
    echo -e "${GREEN}Database removed${NC}"
else
    echo -e "${YELLOW}No existing database found${NC}"
fi
echo ""

# Step 3: Optional - Clear settings
echo -e "${BLUE}Step 3: Clear settings?${NC}"
read -p "Clear app settings? [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SETTINGS_PATH="$HOME/Library/Application Support/reflective-web/config.json"
    if [ -f "$SETTINGS_PATH" ]; then
        rm "$SETTINGS_PATH"
        echo -e "${GREEN}Settings cleared${NC}"
    fi
else
    echo -e "${YELLOW}Keeping settings${NC}"
fi
echo ""

# Step 4: Instructions to start app
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database Reset Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps to load demo data:${NC}"
echo ""
echo "  1. Start the app in this terminal:"
echo -e "     ${BLUE}cd $PROJECT_DIR && npm run dev${NC}"
echo ""
echo "  2. Wait for Vite dev server to start (watch for 'ready in X ms')"
echo ""
echo "  3. Wait for Electron window to open (5-10 seconds)"
echo ""
echo "  4. In a NEW terminal, load seed data:"
echo -e "     ${BLUE}node $SCRIPT_DIR/seed-demo-data.js${NC}"
echo ""
echo "  5. Refresh the Electron window to see demo data"
echo ""
echo -e "${YELLOW}Or use the manual workflow (recommended):${NC}"
echo -e "  ${BLUE}./scripts/dev-reset.sh${NC}   (reset only)"
echo -e "  ${BLUE}npm run dev${NC}              (start app, wait for it to load)"
echo -e "  ${BLUE}node scripts/seed-demo-data.js${NC}   (in another terminal)"
echo ""
