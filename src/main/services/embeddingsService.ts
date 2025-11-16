import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

class EmbeddingsService {
  private model: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.isInitializing) return;

      this.isInitializing = true;
      try {
        console.log('[EmbeddingsService] Loading model: Xenova/all-MiniLM-L6-v2');
        console.log('[EmbeddingsService] This may take a few minutes on first run (downloading ~450MB)');

        const startTime = Date.now();
        this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        const loadTime = Date.now() - startTime;
        console.log(`[EmbeddingsService] Model loaded successfully in ${(loadTime / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error('[EmbeddingsService] Failed to load model:', error);
        this.model = null;
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    try {
      const output = await this.model(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data as Float32Array);
    } catch (error) {
      console.error('[EmbeddingsService] Error generating embedding:', error);
      throw error;
    }
  }
}

export const embeddingsService = new EmbeddingsService();
