#!/bin/bash

# Reflective - Coordinated Frontend + Backend Reset
# Sets up a fully synced demo environment with test@example.com account

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$(cd "$FRONTEND_DIR/../reflective-server" && pwd)"

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Reflective Synced Demo Reset${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}This will:${NC}"
echo "  1. Reset backend (PostgreSQL)"
echo "  2. Create test@example.com account"
echo "  3. Reset frontend (SQLite)"
echo "  4. Load 35 demo entries locally"
echo "  5. Configure auto-login as test@example.com"
echo "  6. Set privacy tier to FULL_SYNC"
echo "  7. Entries will sync to backend on app start"
echo ""
read -p "Continue? [Y/n]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

# Check backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    echo -e "${YELLOW}Expected structure:${NC}"
    echo "  reflective-mono/"
    echo "    ├── reflective-web/"
    echo "    └── reflective-server/"
    exit 1
fi

# Step 1: Reset backend
echo ""
echo -e "${BLUE}Step 1: Resetting backend database...${NC}"
cd "$BACKEND_DIR"

if [ ! -f "dev_reset.py" ]; then
    echo -e "${RED}Error: dev_reset.py not found in backend directory${NC}"
    exit 1
fi

# Run backend reset with auto-confirm
python dev_reset.py --no-confirm

if [ $? -ne 0 ]; then
    echo -e "${RED}Backend reset failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Backend reset complete${NC}"

# Step 2: Stop any running Electron
echo ""
echo -e "${BLUE}Step 2: Stopping Electron app...${NC}"
pkill -f "Electron.*reflective" || true
sleep 1
echo -e "${GREEN}Done${NC}"

# Step 3: Reset frontend database
echo ""
echo -e "${BLUE}Step 3: Resetting frontend database...${NC}"
cd "$FRONTEND_DIR"

DB_PATH="$HOME/Library/Application Support/reflective-web/reflective/database.db"
DB_DIR="$HOME/Library/Application Support/reflective-web/reflective"

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

# Step 4: Start app to initialize schema
echo ""
echo -e "${BLUE}Step 4: Starting app to initialize schema...${NC}"
echo -e "${YELLOW}Electron window will open briefly...${NC}"

npm run dev > /tmp/reflective-init.log 2>&1 &
APP_PID=$!

# Wait for database to be created
echo -ne "${YELLOW}Waiting for schema initialization...${NC}"
for i in {15..1}; do
    if [ -f "$DB_PATH" ]; then
        echo -e " ${GREEN}Done${NC}"
        break
    fi
    echo -ne " ${i}s\r"
    sleep 1
done
echo ""

# Stop the app
kill $APP_PID 2>/dev/null || true
sleep 1

if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}Error: Database was not created!${NC}"
    echo -e "${YELLOW}Check logs: /tmp/reflective-init.log${NC}"
    exit 1
fi

# Step 5: Load seed data with auth
echo ""
echo -e "${BLUE}Step 5: Loading seed data + configuring auth...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node not found in PATH${NC}"
    exit 1
fi

node "$SCRIPT_DIR/seed-demo-data-authed.js"

if [ $? -ne 0 ]; then
    echo -e "${RED}Seed data loading failed!${NC}"
    exit 1
fi

# Step 6: Success
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

echo -e "${BRIGHT}Demo Environment Ready:${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC}"
echo "  - 35 journal entries loaded locally"
echo "  - Logged in as: test@example.com"
echo "  - Privacy tier: FULL_SYNC"
echo "  - Entries will sync on app start"
echo ""
echo -e "${BLUE}Backend:${NC}"
echo "  - PostgreSQL reset and ready"
echo "  - Test account created: test@example.com / testpass123"
echo "  - 0 entries (will receive 35 from frontend)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start the app: ${BLUE}cd $FRONTEND_DIR && npm run dev${NC}"
echo "  2. Watch sync indicator (top-right)"
echo "  3. Entries will upload in ~30 seconds"
echo "  4. Verify backend:"
echo "     ${BLUE}curl http://localhost:8000/api/sync/backups \\${NC}"
echo "       ${BLUE}-H \"Authorization: Bearer <token>\" | jq .${NC}"
echo ""
echo -e "${GREEN}Demo Features Available:${NC}"
echo "  - Timeline view with 35 entries"
echo "  - Semantic search (after embeddings generate)"
echo "  - Insights dashboard (themes, sentiment)"
echo "  - Cross-device sync (make changes, watch them sync)"
echo "  - Conflict resolution (modify same entry in \"two devices\")"
echo "  - Privacy tier management (downgrade to analytics_sync/local_only)"
echo ""
