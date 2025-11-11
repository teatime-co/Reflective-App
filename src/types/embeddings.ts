export interface EmbeddingVector {
  values: Float32Array;
  dimensions: number;
}

export interface SearchResult {
  entryId: number;
  score: number;
  entry: {
    id: number;
    content: string;
    created_at: number;
    updated_at: number;
    word_count: number;
    sentiment_score: number | null;
  };
  preview: string;
}

export interface IndexStatus {
  state: 'uninitialized' | 'building' | 'ready' | 'error';
  entryCount: number;
  lastBuilt: number | null;
  error?: string;
}

export interface EmbeddingGenerationResult {
  embedding: Float32Array;
  dimensions: number;
  processingTimeMs: number;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
}
