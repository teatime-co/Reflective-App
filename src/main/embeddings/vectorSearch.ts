import type { IndexStatus } from '../../types/embeddings';
import { embeddingsService } from './embeddings';

interface IndexEntry {
  entryId: number;
  embedding: Float32Array;
}

class VectorSearchService {
  private vectors: Map<number, Float32Array> = new Map();
  private dimensions = 384;
  private status: IndexStatus = {
    state: 'ready',
    entryCount: 0,
    lastBuilt: null
  };

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async initialize(): Promise<void> {
    console.log('[VectorSearch] Initialized (brute-force mode)');
    this.status.state = 'ready';
  }

  async addEntry(entryId: number, embedding: Float32Array): Promise<void> {
    if (embedding.length !== this.dimensions) {
      throw new Error(`Invalid embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`);
    }

    if (this.vectors.has(entryId)) {
      console.log(`[VectorSearch] Entry ${entryId} already in index, updating`);
    } else {
      this.status.entryCount++;
    }

    this.vectors.set(entryId, embedding);
    console.log(`[VectorSearch] Added entry ${entryId} to index (total: ${this.status.entryCount})`);
  }

  async search(queryEmbedding: Float32Array, k: number = 10): Promise<Array<{ entryId: number; score: number }>> {
    if (this.status.state !== 'ready') {
      throw new Error('Index not ready for search');
    }

    if (this.status.entryCount === 0) {
      return [];
    }

    if (queryEmbedding.length !== this.dimensions) {
      throw new Error(`Invalid query embedding dimensions: expected ${this.dimensions}, got ${queryEmbedding.length}`);
    }

    const similarities: Array<{ entryId: number; score: number }> = [];

    for (const [entryId, embedding] of this.vectors.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      similarities.push({ entryId, score: similarity });
    }

    similarities.sort((a, b) => b.score - a.score);

    const actualK = Math.min(k, similarities.length);
    return similarities.slice(0, actualK);
  }

  async rebuildIndex(entries: Array<{ id: number; embedding: Buffer }>): Promise<void> {
    console.log(`[VectorSearch] Rebuilding index with ${entries.length} entries`);
    this.status.state = 'building';

    this.vectors.clear();
    this.status.entryCount = 0;

    await this.initialize();

    for (const entry of entries) {
      try {
        const embedding = embeddingsService.bufferToEmbedding(entry.embedding);
        await this.addEntry(entry.id, embedding);
      } catch (error) {
        console.error(`[VectorSearch] Failed to add entry ${entry.id}:`, error);
      }
    }

    this.status.state = 'ready';
    this.status.lastBuilt = Date.now();
    console.log(`[VectorSearch] Index rebuilt with ${this.status.entryCount} entries`);
  }

  getStatus(): IndexStatus {
    return { ...this.status };
  }

  clear(): void {
    this.vectors.clear();
    this.status = {
      state: 'ready',
      entryCount: 0,
      lastBuilt: null
    };
  }
}

export const vectorSearchService = new VectorSearchService();
