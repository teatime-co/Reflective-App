export interface ThemeClassification {
  theme: string
  confidence: number
}

export interface SentimentResult {
  score: number
  comparative: number
  tokens: string[]
  positive: string[]
  negative: string[]
}

export interface KeywordResult {
  keywords: string[]
  topics: string[]
  verbs: string[]
}

export interface ThemesServiceStatus {
  initialized: boolean
  isInitializing: boolean
}
