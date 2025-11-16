export interface ThemeClassification {
  theme: string
  confidence: number
}

const PREDEFINED_THEMES = [
  'Personal Growth',
  'Relationships',
  'Work & Career',
  'Health & Fitness',
  'Mental Health',
  'Travel & Adventure',
  'Creativity',
  'Learning',
  'Gratitude',
  'Challenges & Struggles'
]

const CONFIDENCE_THRESHOLD = 0.3

type ZeroShotClassificationPipeline = any

class ThemesService {
  private classifier: ZeroShotClassificationPipeline | null = null
  private isInitializing = false
  private initializationPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.classifier) {
      return
    }

    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise
    }

    this.isInitializing = true
    this.initializationPromise = this._initialize()
    return this.initializationPromise
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('[ThemesService] Configuring WebAssembly backend')
      process.env.TRANSFORMERS_BACKEND = 'onnxruntime-web'

      console.log('[ThemesService] Loading @xenova/transformers module')
      const transformers = await import('@xenova/transformers')

      console.log('[ThemesService] Initializing bart-large-mnli model (WASM backend)...')
      const startTime = Date.now()

      this.classifier = await transformers.pipeline(
        'zero-shot-classification',
        'Xenova/bart-large-mnli'
      )

      const elapsed = Date.now() - startTime
      console.log(`[ThemesService] Model initialized in ${elapsed}ms (WebAssembly)`)
      this.isInitializing = false
    } catch (error) {
      this.isInitializing = false
      this.initializationPromise = null
      console.error('[ThemesService] Failed to initialize model:', error)
      throw error
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  async generateThemes(content: string): Promise<ThemeClassification[]> {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content: must be a non-empty string')
    }

    await this.initialize()

    if (!this.classifier) {
      throw new Error('Theme classifier not initialized')
    }

    const plainText = this.stripHtml(content)

    if (plainText.length < 20) {
      return []
    }

    const truncatedText = plainText.slice(0, 512)

    try {
      const startTime = Date.now()

      const result = await this.classifier(truncatedText, PREDEFINED_THEMES, {
        multi_label: true
      })

      const elapsed = Date.now() - startTime
      console.log(`[ThemesService] Theme generation completed in ${elapsed}ms`)

      const themes: ThemeClassification[] = []

      if (result && result.labels && result.scores) {
        for (let i = 0; i < result.labels.length; i++) {
          const confidence = result.scores[i]

          if (confidence >= CONFIDENCE_THRESHOLD) {
            themes.push({
              theme: result.labels[i],
              confidence: Math.round(confidence * 100) / 100
            })
          }
        }
      }

      return themes.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('[ThemesService] Error generating themes:', error)
      throw error
    }
  }

  getStatus(): { initialized: boolean; isInitializing: boolean } {
    return {
      initialized: this.classifier !== null,
      isInitializing: this.isInitializing
    }
  }
}

export const themesService = new ThemesService()
