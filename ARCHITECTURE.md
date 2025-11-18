# Reflective Web - Technical Architecture

Technical overview of implementation, data flows, and system design.

## System Overview

- **Type**: Electron desktop application
- **Language**: TypeScript (and some Python)
- **Architecture**: Multi-process (main, preload, renderer)
- **Database**: SQLite (better-sqlite3)
- **State**: Zustand stores

## Multi-Process Architecture

**Main Process** (src/main/):  Node.js runtime handling database operations, encryption, ML inference, sync worker, and IPC handlers.

**Preload Bridge** (src/preload/): Secure IPC bridge with context isolation. Exposes `window.electronAPI` with type-safe methods.

**Renderer Process** (src/renderer/): React UI running in Chromium. Client-side routing, Zustand state management, TipTap editor.

## Application Layers

**Presentation** (src/renderer/): 8 route pages, shadcn/ui components, 9 Zustand stores

**Business Logic** (src/main/): 9 IPC handler modules, sync service, ML operations, Python subprocess manager

**Data** (src/main/database/): SQLite with 7 tables (entries, tags, entry_tags, themes, sync_queue, conflicts, streaks)

**Security** (src/main/crypto/): AES-256-GCM encryption (aesEncryption.ts), CKKS homomorphic encryption (heEncryption.ts)

**External Services**: Python FastAPI (embeddings), Ollama (themes), FastAPI backend (sync)

## Database Schema

7 tables with foreign key constraints:

- **entries**: Journal content, metadata, encryption fields (encrypted_content, iv, auth_tag)
- **tags**: Tag definitions with color and usage tracking
- **entry_tags**: Many-to-many junction table
- **themes**: AI-generated themes with confidence scores
- **sync_queue**: Pending sync operations with retry tracking
- **conflicts**: Conflicting versions from multi-device sync
- **streaks**: Writing streak periods

Database location: `~/Library/Application Support/reflective/database.db`
Schema versioning: `PRAGMA user_version` (v6)

## Data Flows

### Entry Creation
User types → 3s debounce → IPC to main → SQLite insert → sentiment analysis → enqueue sync → schedule embedding → update Zustand store → UI re-render

### Semantic Search
Query input → IPC to main → Python service generates embedding → cosine similarity against all entries → return top k → display results

### Theme Generation
Click "Generate" → IPC to main → fetch content → POST to Ollama (llama3.2) → parse JSON themes → filter confidence >0.3 → insert to DB → display badges

### Sync Operation
30s worker interval → dequeue operations → fetch key from keychain → encrypt with AES-256-GCM → POST to backend → handle response (200: synced, 409: conflict, 5xx: retry with exponential backoff)

### Conflict Resolution
Backend 409 → store both versions → notify renderer → user views diff → select strategy (keep local/remote/merge) → resolve → resume sync

## IPC System

9 namespaces registered in src/main/index.ts: `db`, `embeddings`, `ml`, `crypto`, `sync`, `auth`, `conflicts`, `settings`, `streaks`

Preload bridge exposes type-safe API via contextBridge. Renderer calls via `window.electronAPI.namespace.method()`.

## Encryption

**AES-256-GCM** (src/main/crypto/aesEncryption.ts): 32-byte key from OS keychain, 12-byte IV per operation, authentication tags for tamper detection

**CKKS** (src/main/crypto/heEncryption.ts): Homomorphic encryption for word count, sentiment, theme metrics. Server computes on ciphertexts, client decrypts results.

Key management: Generated on first run, stored via keytar in macOS Keychain, never logged or transmitted.

## Sync System

**Retry Logic** (src/main/sync/syncService.ts): Exponential backoff [1s, 2s, 4s], max 3 retries, persistent queue survives crashes

**Backend API**: Auth (/register, /login), Sync (/backup, /backups), Conflicts (/conflicts, /resolve), Encryption (/context)

All requests use JWT in Authorization header.

## AI/ML Pipeline

**Embeddings**: Python FastAPI service with sentence-transformers (All-MiniLM-L6-v2, 384 dimensions). Batch endpoint for performance.

**Vector Search** (src/main/embeddings/vectorSearch.ts): Brute-force cosine similarity, in-memory index

**Themes** (src/main/ml/themes-ollama.ts): Ollama API integration, 10 predefined themes, confidence filtering

**Sentiment** (src/main/ml/sentiment.ts): AFINN-based scoring, normalized to [-1, 1]

## Technology Stack

**Frontend**: React 18.3.1, React Router 6.30.1, Zustand 5.0.8, TipTap 2.27.1, shadcn/ui, Tailwind CSS

**Main Process**: Electron 33.4.11, better-sqlite3 11.10.0, keytar 7.9.0, node-seal 4.0.0, sentiment 5.0.2, compromise 14.14.4

**Build**: Vite 5.4.21, electron-vite 2.3.0, TypeScript 5.9.3, electron-builder 25.1.8

**External**: Python 3.x + FastAPI (embeddings), Ollama (themes), FastAPI backend (sync)

## Performance

- Embedding: ~500ms/entry
- Theme: 1-3s/entry
- Sentiment: <10ms/entry
- Search: <100ms (brute-force, <10k entries)

**Optimizations**: LRU cache (50 entries, 5min TTL), debouncing (3s auto-save, 300ms search), virtual scrolling, batch embeddings (10/call), synchronous SQLite

**Build**: Main ~1.5 MB, Renderer ~1.1 MB, CSS ~46 KB

## Directory Structure

```
src/
├── main/
│   ├── crypto/          # AES, CKKS
│   ├── database/        # SQLite, migrations, schema
│   ├── embeddings/      # Vector search
│   ├── ipc/             # 9 handler modules
│   ├── ml/              # Themes, sentiment, keywords
│   ├── services/        # Python subprocess
│   ├── sync/            # Sync worker, tier transitions
│   └── index.ts         # Entry point
├── preload/
│   └── index.ts         # Context bridge
├── renderer/
│   ├── api/             # Backend clients
│   ├── components/      # UI components
│   ├── lib/             # Query cache
│   ├── pages/           # 8 routes
│   ├── stores/          # 9 Zustand stores
│   ├── utils/           # Helpers
│   └── App.tsx
└── types/               # Shared types

python-service/
└── embedding_server.py  # FastAPI + sentence-transformers

scripts/
├── dev-reset.sh
├── seed-demo-data.js
└── seed-demo-data-authed.js
```

## Key Files

**Main**: src/main/index.ts (init), src/main/sync/syncService.ts (sync), src/main/crypto/aesEncryption.ts (encryption)

**Renderer**: src/renderer/stores/useEntriesStore.ts (entry state, 542 lines), src/renderer/pages/EntryEditor.tsx (editor)

**Config**: electron-vite.config.ts, package.json, src/main/database/schema.sql
