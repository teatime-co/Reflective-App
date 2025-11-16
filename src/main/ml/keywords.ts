import nlp from 'compromise'

export interface KeywordResult {
  keywords: string[]
  topics: string[]
  verbs: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
  'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'is', 'was', 'am', 'are', 'been', 'being', 'had', 'has', 'did',
  'does', 'doing', 'may', 'might', 'must', 'shall', 'should', 'ought'
])

export function extractKeywords(content: string, limit: number = 20): KeywordResult {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content: must be a non-empty string')
  }

  const plainText = stripHtml(content)

  if (plainText.length === 0) {
    return {
      keywords: [],
      topics: [],
      verbs: []
    }
  }

  const doc = nlp(plainText)

  const topics = doc
    .topics()
    .out('array')
    .map((t: string) => t.toLowerCase())
    .filter((t: string) => t.length > 2 && !STOP_WORDS.has(t))

  const verbs = doc
    .verbs()
    .out('array')
    .map((v: string) => v.toLowerCase())
    .filter((v: string) => v.length > 3 && !STOP_WORDS.has(v))

  const nouns = doc
    .nouns()
    .out('array')
    .map((n: string) => n.toLowerCase())
    .filter((n: string) => n.length > 3 && !STOP_WORDS.has(n))

  const frequencyMap = new Map<string, number>()

  const allTerms = [...topics, ...verbs, ...nouns]
  allTerms.forEach(term => {
    frequencyMap.set(term, (frequencyMap.get(term) || 0) + 1)
  })

  const sortedKeywords = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .slice(0, limit)

  return {
    keywords: sortedKeywords,
    topics: [...new Set(topics)].slice(0, 10) as string[],
    verbs: [...new Set(verbs)].slice(0, 10) as string[]
  }
}
