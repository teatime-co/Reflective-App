import Sentiment from 'sentiment'

const sentiment = new Sentiment()

export interface SentimentResult {
  score: number
  comparative: number
  tokens: string[]
  positive: string[]
  negative: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function analyzeSentiment(content: string): SentimentResult {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content: must be a non-empty string')
  }

  const plainText = stripHtml(content)

  if (plainText.length === 0) {
    return {
      score: 0,
      comparative: 0,
      tokens: [],
      positive: [],
      negative: []
    }
  }

  const analysis = sentiment.analyze(plainText)

  return {
    score: analysis.score,
    comparative: analysis.comparative,
    tokens: analysis.tokens,
    positive: analysis.positive,
    negative: analysis.negative
  }
}
