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
const OLLAMA_URL = 'http://localhost:11434/api/generate'
const MODEL_NAME = 'llama3.2'

class ThemesService {
  private isInitializing = false

  async initialize(): Promise<void> {
    return Promise.resolve()
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  async generateThemes(content: string): Promise<ThemeClassification[]> {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content: must be a non-empty string')
    }

    const plainText = this.stripHtml(content)

    if (plainText.length < 20) {
      return []
    }

    const truncatedText = plainText.slice(0, 1000)

    try {
      const startTime = Date.now()

      const prompt = `You are a journal entry analyzer. Analyze the following journal entry and classify it into one or more of these themes:

${PREDEFINED_THEMES.join(', ')}

For each relevant theme, provide a confidence score between 0 and 1. Only include themes with confidence > 0.3.

Return your response as a JSON array in this exact format:
[{"theme": "Theme Name", "confidence": 0.85}, {"theme": "Another Theme", "confidence": 0.65}]

Journal Entry:
${truncatedText}

JSON Response:`

      console.log('[ThemesService] Calling Ollama API...')

      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: prompt,
          stream: false,
          format: 'json'
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const elapsed = Date.now() - startTime

      console.log(`[ThemesService] Ollama response received in ${elapsed}ms`)

      if (!data.response) {
        throw new Error('No response from Ollama')
      }

      let parsedResponse: any
      try {
        parsedResponse = JSON.parse(data.response)
      } catch (parseError) {
        console.error('[ThemesService] Failed to parse Ollama JSON response:', data.response)
        const jsonMatch = data.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Could not extract valid JSON from response')
        }
      }

      if (!Array.isArray(parsedResponse)) {
        if (parsedResponse && typeof parsedResponse === 'object' &&
            parsedResponse.theme && typeof parsedResponse.confidence === 'number') {
          console.log('[ThemesService] Single object response, wrapping in array')
          parsedResponse = [parsedResponse]
        } else {
          console.error('[ThemesService] Response is not an array or valid object:', parsedResponse)
          return []
        }
      }

      const themes: ThemeClassification[] = []

      for (const item of parsedResponse) {
        if (item.theme && typeof item.confidence === 'number') {
          const themeName = PREDEFINED_THEMES.find(t =>
            t.toLowerCase() === item.theme.toLowerCase()
          )

          if (themeName && item.confidence >= CONFIDENCE_THRESHOLD) {
            themes.push({
              theme: themeName,
              confidence: Math.round(item.confidence * 100) / 100
            })
          }
        }
      }

      console.log(`[ThemesService] Generated ${themes.length} themes`)
      return themes.sort((a, b) => b.confidence - a.confidence)

    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch failed')) {
        console.error('[ThemesService] Could not connect to Ollama. Is Ollama running?')
        throw new Error('Could not connect to Ollama. Please ensure Ollama is running on http://localhost:11434')
      }
      console.error('[ThemesService] Error generating themes:', error)
      throw error
    }
  }

  getStatus(): { initialized: boolean; isInitializing: boolean } {
    return {
      initialized: true,
      isInitializing: this.isInitializing
    }
  }
}

export const themesService = new ThemesService()
