import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type DetectionResult = {
  language: string   // English name, e.g. "Spanish", "Japanese"
  confidence: number // 0–1
}

export async function detectLanguage(text: string): Promise<DetectionResult> {
  const trimmed = text.trim()

  if (!trimmed || trimmed.length < 10) {
    return { language: 'Unknown', confidence: 0 }
  }

  const excerpt = trimmed.slice(0, 800)

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: `Detect the language of the following text. Use these exact names for Chinese variants: "Chinese (Simplified)" for Mandarin/Simplified, "Chinese (Traditional)" for Traditional Chinese, "Cantonese" for Cantonese. For Persian/Farsi use "Persian (Farsi)". Respond with ONLY a JSON object: {"language": "English", "confidence": 0.99}\n\nText:\n${excerpt}`,
        },
      ],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return { language: 'Unknown', confidence: 0 }
    }

    const raw = block.text
    const match = raw.match(/\{[^}]+\}/)
    if (!match) {
      return { language: 'Unknown', confidence: 0 }
    }

    const parsed = JSON.parse(match[0]) as { language?: unknown; confidence?: unknown }
    const rawLang = typeof parsed.language === 'string' && parsed.language ? parsed.language : 'Unknown'
    const language = normalizeLanguageName(rawLang)
    const rawConf = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    const confidence = Math.min(1, Math.max(0, rawConf))

    return { language, confidence }
  } catch {
    return { language: 'Unknown', confidence: 0 }
  }
}

export type VisionDetectionResult = DetectionResult & { wordCount: number }

const VISION_SUPPORTED: Record<string, 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

/**
 * Uses Claude's document/vision capability to detect the language AND count words
 * in a single API call. Intended for scanned PDFs and images where text extraction
 * fails or returns too little content.
 */
export async function detectLanguageAndWordsViaClaude(buffer: Buffer, filename: string): Promise<VisionDetectionResult> {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  const mediaType = VISION_SUPPORTED[ext]

  if (!mediaType) {
    return { language: 'Unknown', confidence: 0, wordCount: 0 }
  }

  const MAX_BYTES = 32 * 1024 * 1024
  if (buffer.byteLength > MAX_BYTES) {
    console.log(`[detect-language] file too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB) — skipping Claude vision`)
    return { language: 'Unknown', confidence: 0, wordCount: 0 }
  }

  const base64 = buffer.toString('base64')
  const content: Anthropic.MessageParam['content'] = mediaType === 'application/pdf'
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
        { type: 'text', text: 'Analyze this document. Detect the language of the main text content, then count the total number of words.\n\nRespond with ONLY a JSON object like this (no other text):\n{"language": "Spanish", "confidence": 0.98, "wordCount": 342}\n\nFor Chinese: use "Chinese (Simplified)" for simplified/Mandarin, "Chinese (Traditional)" for traditional, "Cantonese" for Cantonese. For Persian use "Persian (Farsi)".' },
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Analyze this image. Detect the language of the main text content, then count the total number of words visible.\n\nRespond with ONLY a JSON object like this (no other text):\n{"language": "Spanish", "confidence": 0.98, "wordCount": 342}\n\nFor Chinese: use "Chinese (Simplified)" for simplified/Mandarin, "Chinese (Traditional)" for traditional, "Cantonese" for Cantonese. For Persian use "Persian (Farsi)".' },
      ]

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 64,
    messages: [{ role: 'user', content }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return { language: 'Unknown', confidence: 0, wordCount: 0 }

  const match = block.text.match(/\{[^}]+\}/)
  if (!match) return { language: 'Unknown', confidence: 0, wordCount: 0 }

  try {
    const parsed = JSON.parse(match[0]) as { language?: unknown; confidence?: unknown; wordCount?: unknown }
    const rawLang = typeof parsed.language === 'string' && parsed.language ? parsed.language : 'Unknown'
    const language = normalizeLanguageName(rawLang)
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0
    const wordCount = typeof parsed.wordCount === 'number' && !isNaN(parsed.wordCount) ? Math.max(0, Math.round(parsed.wordCount)) : 0
    return { language, confidence, wordCount }
  } catch {
    return { language: 'Unknown', confidence: 0, wordCount: 0 }
  }
}

// Maps common AI-returned names to the canonical names used in our translation_language_pairs table.
const LANG_ALIASES: Record<string, string> = {
  'chinese': 'Chinese (Simplified)',
  'chinese simplified': 'Chinese (Simplified)',
  'mandarin': 'Chinese (Simplified)',
  'mandarin chinese': 'Chinese (Simplified)',
  'simplified chinese': 'Chinese (Simplified)',
  'chinese traditional': 'Chinese (Traditional)',
  'traditional chinese': 'Chinese (Traditional)',
  'cantonese chinese': 'Cantonese',
  'farsi': 'Persian (Farsi)',
  'persian': 'Persian (Farsi)',
  'dari persian': 'Dari',
  'tagalog/filipino': 'Tagalog',
  'filipino': 'Tagalog',
  'malay/indonesian': 'Malay',
  'bahasa indonesia': 'Indonesian',
  'bahasa melayu': 'Malay',
  'haitian creole': 'Haitian Creole',
  'haitian-creole': 'Haitian Creole',
  'creole': 'Haitian Creole',
  'brazilian portuguese': 'Portuguese (Brazilian)',
  'latin american spanish': 'Spanish (Latin American)',
  'castilian': 'Spanish',
  'burmese/myanmar': 'Burmese',
  'myanmar': 'Burmese',
  'khmer/cambodian': 'Khmer',
  'cambodian': 'Khmer',
  'kurdish': 'Kurdish (Kurmanji)',
  'pashto/dari': 'Pashto',
  'flemish': 'Flemish',
}

function normalizeLanguageName(name: string): string {
  const lower = name.toLowerCase().trim()
  return LANG_ALIASES[lower] ?? name
}
