import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateQuote, CERTIFIED_SPECIALTY_NAME } from '@/lib/quote/calculator'

const schema = z.object({
  wordCount: z.coerce.number().int().min(1),
  languagePairId: z.string().uuid(),
  specialtyId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { wordCount, languagePairId, specialtyId } = parsed.data
  const supabase = createServiceClient()

  const [{ data: langPair }, { data: specialty }, { data: settings }] = await Promise.all([
    supabase.from('translation_language_pairs').select('per_word_rate').eq('id', languagePairId).single(),
    supabase.from('translation_specialty_multipliers').select('name, multiplier').eq('id', specialtyId).single(),
    supabase.from('translation_system_settings').select('key, value').in('key', ['translation_minimum_standard', 'translation_minimum_certified']),
  ])

  if (!langPair || !specialty) {
    return NextResponse.json({ error: 'Invalid language pair or specialty' }, { status: 400 })
  }

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, Number(s.value)]))
  const isCertified = specialty.name === CERTIFIED_SPECIALTY_NAME
  const minimum = isCertified
    ? (settingsMap['translation_minimum_certified'] ?? 250)
    : (settingsMap['translation_minimum_standard'] ?? 95)

  const breakdown = calculateQuote(wordCount, Number(langPair.per_word_rate), Number(specialty.multiplier), specialty.name, minimum)
  return NextResponse.json(breakdown)
}
