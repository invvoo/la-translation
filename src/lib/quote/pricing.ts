import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type PricingResult = {
  perWordRate: number | null
  isPivot: boolean
  warning: string | null
}

export type InterpretationQuoteResult = {
  rate: number         // base rate used (per 3-hours or per-minute)
  billedMinutes: number
  amount: number
  warning: string | null
}

type ServiceClient = SupabaseClient<Database>

/**
 * Resolve per-word rate for a language pair, with English pivot fallback.
 */
export async function resolveTranslationRate(
  sourceLang: string,
  targetLang: string,
  supabase: ServiceClient,
): Promise<PricingResult> {
  // 1. Try direct pair
  const { data: direct } = await supabase
    .from('translation_language_pairs')
    .select('per_word_rate')
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .eq('is_active', true)
    .maybeSingle()

  if (direct) {
    return { perWordRate: Number(direct.per_word_rate), isPivot: false, warning: null }
  }

  // 2. If neither lang is English, try pivot through English
  if (sourceLang !== 'English' && targetLang !== 'English') {
    const [{ data: srcToEn }, { data: enToTgt }] = await Promise.all([
      supabase
        .from('translation_language_pairs')
        .select('per_word_rate')
        .eq('source_lang', sourceLang)
        .eq('target_lang', 'English')
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('translation_language_pairs')
        .select('per_word_rate')
        .eq('source_lang', 'English')
        .eq('target_lang', targetLang)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    if (srcToEn && enToTgt) {
      const perWordRate = Number(srcToEn.per_word_rate) + Number(enToTgt.per_word_rate)
      return { perWordRate, isPivot: true, warning: null }
    }

    // Build missing list
    const missing: string[] = []
    if (!srcToEn) missing.push(`${sourceLang} → English`)
    if (!enToTgt) missing.push(`English → ${targetLang}`)
    const warning = `No pricing found for: ${missing.join(', ')}`
    return { perWordRate: null, isPivot: false, warning }
  }

  // 3. Direct pair not found and pivot doesn't apply (one side is English)
  const warning = `No pricing found for: ${sourceLang} → ${targetLang}`
  return { perWordRate: null, isPivot: false, warning }
}

/**
 * Resolve the applicable court certification minimum for a given language pair.
 * Japanese and Hebrew use a premium minimum; all other languages use the standard court minimum.
 * settingsMap should include translation_minimum_court, translation_minimum_court_premium,
 * translation_minimum_certified, translation_minimum_standard, and translation_court_premium_langs.
 */
export function resolveCertMinimum(
  certificationTpe: string,
  sourceLang: string,
  targetLang: string,
  settingsMap: Record<string, number | string>,
): number {
  if (certificationTpe === 'general') return Number(settingsMap['translation_minimum_certified'] ?? 120)
  if (certificationTpe !== 'court') return Number(settingsMap['translation_minimum_standard'] ?? 95)

  const premiumLangsRaw = String(settingsMap['translation_court_premium_langs'] ?? 'Japanese,Hebrew')
  const premiumLangs = premiumLangsRaw.split(',').map((l) => l.trim().toLowerCase())
  const isPremium =
    premiumLangs.includes(sourceLang.toLowerCase()) ||
    premiumLangs.includes(targetLang.toLowerCase())

  return isPremium
    ? Number(settingsMap['translation_minimum_court_premium'] ?? 450)
    : Number(settingsMap['translation_minimum_court'] ?? 275)
}

/**
 * Calculate an interpretation quote.
 * locationType: 'in_person' | 'phone' | 'video'
 */
export async function calculateInterpretationQuote(
  locationType: string,
  requestedMinutes: number,
  supabase: ServiceClient,
): Promise<InterpretationQuoteResult> {
  const { data: settings } = await supabase
    .from('translation_system_settings')
    .select('key, value')
    .in('key', [
      'interpretation_rate_standard',
      'interpretation_rate_court',
      'interpretation_phone_rate',
      'interpretation_phone_minimum_minutes',
    ])

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, Number(s.value)]),
  )

  if (locationType === 'phone') {
    const phoneRate = settingsMap['interpretation_phone_rate'] ?? 3
    const phoneMinimum = settingsMap['interpretation_phone_minimum_minutes'] ?? 60
    const billedMinutes = Math.max(requestedMinutes, phoneMinimum)
    const amount = Math.ceil(billedMinutes * phoneRate * 100) / 100
    return { rate: phoneRate, billedMinutes, amount, warning: null }
  }

  // in_person or video — 3-hour (180 min) minimum, rate is per 180 min
  const rate = settingsMap['interpretation_rate_standard'] ?? 450
  const billedMinutes = Math.max(requestedMinutes, 180)
  const amount = Math.ceil((rate * billedMinutes) / 180 * 100) / 100
  return { rate, billedMinutes, amount, warning: null }
}
