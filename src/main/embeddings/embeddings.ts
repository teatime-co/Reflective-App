import type { EmbeddingGenerationResult } from '../../types/embeddings';

type Pipeline = any;

class EmbeddingsService {
  private model: Pipeline | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.isLoading && this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log(`[Embeddings] Configuring WebAssembly backend`);
        process.env.TRANSFORMERS_BACKEND = 'onnxruntime-web';

        console.log(`[Embeddings] Loading @xenova/transformers module`);
        const transformers = await import('@xenova/transformers');

        console.log(`[Embeddings] Loading model: ${this.modelName} (WASM backend)`);
        const startTime = Date.now();

        this.model = await transformers.pipeline('feature-extraction', this.modelName);

        const loadTime = Date.now() - startTime;
        console.log(`[Embeddings] Model loaded in ${loadTime}ms (WebAssembly)`);
      } catch (error) {
        console.error('[Embeddings] Failed to load model:', error);
        this.isLoading = false;
        this.loadPromise = null;
        throw error;
      }
      this.isLoading = false;
    })();

    return this.loadPromise;
  }

  async generateEmbedding(text: string): Promise<EmbeddingGenerationResult> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Embedding model not initialized');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const startTime = Date.now();

    const output = await this.model(text, { pooling: 'mean', normalize: true });
    const embedding = new Float32Array(output.data);

    const processingTimeMs = Date.now() - startTime;

    return {
      embedding,
      dimensions: embedding.length,
      processingTimeMs
    };
  }

  embeddingToBuffer(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer);
  }

  bufferToEmbedding(buffer: Buffer): Float32Array {
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / Float32Array.BYTES_PER_ELEMENT);
  }

  isReady(): boolean {
    return this.model !== null;
  }
}

export const embeddingsService = new EmbeddingsService();
