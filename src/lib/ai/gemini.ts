// src/lib/ai/gemini.ts — Google Gemini API client

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// Supported languages for translation
export const TRANSLATION_LANGUAGES = ['en', 'de', 'es', 'fr', 'zh', 'ar', 'ru'] as const
export type TranslationLanguage = typeof TRANSLATION_LANGUAGES[number]

export const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 English',
  de: '🇩🇪 Deutsch',
  es: '🇪🇸 Español',
  fr: '🇫🇷 Français',
  zh: '🇨🇳 中文',
  ar: '🇸🇦 العربية',
  ru: '🇷🇺 Русский',
}

export interface GeminiCallOptions {
  model?: string
  fallbackModel?: string
  temperature?: number
  maxOutputTokens?: number
  thinkingBudget?: number  // 0 = disable thinking (saves tokens for output)
}

/**
 * Calls the Gemini API with automatic fallback to a secondary model.
 * Returns the raw text response from the model.
 */
export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const {
    model = 'gemini-2.5-flash',
    fallbackModel = 'gemini-2.5-flash-lite',
    temperature = 0.1,
    maxOutputTokens = 4096,
    thinkingBudget,
  } = options

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured')

  async function tryModel(modelName: string): Promise<string> {
    const url = `${GEMINI_BASE_URL}/${modelName}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(thinkingBudget !== undefined && { thinkingConfig: { thinkingBudget } }),
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gemini [${modelName}] ${response.status}: ${errorBody}`)
    }

    const data = await response.json()
    // Log full structure once for debugging
    console.log(`[Gemini ${modelName}] full response:`, JSON.stringify(data).substring(0, 2000))
    // gemini-2.5+ returns thinking tokens as separate parts with {thought: true}
    // concatenate only the actual text parts (skip thought parts)
    const parts: any[] = data?.candidates?.[0]?.content?.parts || []
    const text = parts
      .filter((p: any) => !p.thought && typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('')
    if (!text) throw new Error(`Gemini [${modelName}]: empty response`)
    return text
  }

  // Try primary model first, fallback on error
  try {
    const text = await tryModel(model)
    return { text, modelUsed: model }
  } catch (primaryError) {
    console.warn(`[Gemini] Primary model ${model} failed, trying ${fallbackModel}:`, primaryError)
    try {
      const text = await tryModel(fallbackModel)
      return { text, modelUsed: fallbackModel }
    } catch (fallbackError) {
      throw new Error(
        `Both Gemini models failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
      )
    }
  }
}

/**
 * Calls Gemini TTS and returns WAV audio as a Buffer.
 * PCM (24kHz, 16-bit, mono) is wrapped in a WAV header inline — no dependencies.
 */
export async function callGeminiTTS(
  text: string,
  options: { model?: string; voiceName?: string } = {}
): Promise<{ wavBuffer: Buffer; modelUsed: string }> {
  const {
    model = 'gemini-2.5-flash-preview-tts',
    voiceName = 'Kore',
  } = options

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured')

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: text.substring(0, 5000) }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini TTS [${model}] ${response.status}: ${err}`)
  }

  const data = await response.json()
  const part = data?.candidates?.[0]?.content?.parts?.[0]
  const base64 = part?.inlineData?.data
  if (!base64) throw new Error(`Gemini TTS [${model}]: no audio data in response`)

  const wavBuffer = pcmBase64ToWav(base64)
  return { wavBuffer, modelUsed: model }
}

/** Convert base64-encoded raw PCM (24kHz, 16-bit, mono) to WAV Buffer */
function pcmBase64ToWav(base64: string, sampleRate = 24000): Buffer {
  const pcm = Buffer.from(base64, 'base64')
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)          // subchunk1 size
  header.writeUInt16LE(1, 20)           // PCM format
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)

  return Buffer.concat([header, pcm])
}

/**
 * Extracts a JSON object from Gemini response text.
 * Handles cases where the model wraps JSON in markdown code blocks.
 */
export function extractJSON<T>(text: string): T {
  // Strip markdown code blocks if present
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  // Find first { ... } or [ ... ] block
  const jsonMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!jsonMatch) {
    throw new Error(`No JSON found in response: ${text.substring(0, 200)}`)
  }

  return JSON.parse(jsonMatch[0]) as T
}
