import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { extractWordCountWithFallback } from '@/lib/pdf/word-counter'
import { calculateQuote, calcTurnaroundDays, calculateRushFee } from '@/lib/quote/calculator'
import { resolveTranslationRate, resolveCertMinimum } from '@/lib/quote/pricing'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { AutoQuoteEstimateEmail } from '@/lib/email/templates/auto-quote-estimate'
import { render } from '@react-email/components'
import { notifyAdminNewInquiry } from '@/lib/email/notify-admin'

const CERT_SPECIALTY: Record<string, string> = {
  none: 'General',
  general: 'Certified (USCIS)',
  court: 'Court Certified',
}

const CERT_LABEL: Record<string, string> = {
  none: 'No certification',
  general: 'General / Company',
  court: 'Court Certified',
}

// JSON schema (new form — pre-uploaded files)
const jsonSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  sourceLang: z.string().min(1).optional(),
  targetLang: z.string().min(1),
  certificationTpe: z.enum(['none', 'general', 'court']).optional(),
  specialtyId: z.string().uuid().optional(),
  detectedSourceLang: z.string().optional(),
  detectedSourceLangConfidence: z.coerce.number().min(0).max(1).optional(),
  requestedDeliveryDays: z.coerce.number().int().min(1).max(30).optional(),
  mailingOption: z.enum(['standard', 'hard_copy']).optional(),
  mailingFedex: z.boolean().optional(),
  // New: array of pre-uploaded Storage paths
  storagePaths: z.array(z.object({ path: z.string().min(1), name: z.string().min(1) })).min(1),
  // Optional pre-computed word count from the detect endpoint (skips re-download)
  preComputedWordCount: z.coerce.number().int().min(0).optional(),
}).refine(
  (d) => d.sourceLang || d.detectedSourceLang,
  { message: 'sourceLang or detectedSourceLang is required' },
)

// FormData schema (admin manual-entry — single file upload through server)
const formDataSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  sourceLang: z.string().min(1).optional(),
  targetLang: z.string().min(1),
  certificationTpe: z.enum(['none', 'general', 'court']).optional(),
  specialtyId: z.string().uuid().optional(),
  detectedSourceLang: z.string().optional(),
  detectedSourceLangConfidence: z.coerce.number().min(0).max(1).optional(),
  requestedDeliveryDays: z.coerce.number().int().min(1).max(30).optional(),
}).refine(
  (d) => d.sourceLang || d.detectedSourceLang,
  { message: 'sourceLang or detectedSourceLang is required' },
)

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  if (isJson) {
    return handleJson(req)
  } else {
    return handleFormData(req)
  }
}

// ── JSON handler (new form with direct uploads) ───────────────────────────────

async function handleJson(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = jsonSchema.safeParse(body)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: 'Validation error', detail }, { status: 422 })
  }

  const {
    clientName, clientEmail, clientPhone, clientCompany,
    targetLang, certificationTpe, specialtyId,
    detectedSourceLang, detectedSourceLangConfidence,
    requestedDeliveryDays, storagePaths,
    preComputedWordCount,
    mailingOption, mailingFedex,
  } = parsed.data

  const effectiveSourceLang = parsed.data.sourceLang || detectedSourceLang!
  const supabase = createServiceClient()

  // If the client already counted words via the detect endpoint, trust it and skip re-download
  let wordCount: number
  if (preComputedWordCount && preComputedWordCount > 0) {
    console.log(`[translation] using pre-computed word count: ${preComputedWordCount}`)
    wordCount = preComputedWordCount
  } else {
  // Download all files from Storage and count words (with timeout per file)
  const wordCounts = await Promise.all(
    storagePaths.map(async ({ path, name }) => {
      try {
        console.log(`[translation] downloading "${name}" from storage: ${path}`)
        const { data, error } = await supabase.storage.from('job-documents').download(path)
        if (error || !data) {
          console.error(`[translation] storage download failed for "${name}":`, error)
          return 0
        }
        const buffer = Buffer.from(await data.arrayBuffer())
        console.log(`[translation] downloaded "${name}" (${(buffer.byteLength / 1024).toFixed(0)} KB)`)
        return await Promise.race<number>([
          extractWordCountWithFallback(buffer, name).catch((e) => {
            console.error(`[translation] extractWordCountWithFallback threw for "${name}":`, e)
            return 0
          }),
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 45000)),
        ])
      } catch (e) {
        console.error(`[translation] word count failed for "${name}":`, e)
        return 0
      }
    })
  )
  wordCount = wordCounts.reduce((a, b) => a + b, 0)
  console.log(`[translation] total word count: ${wordCount}`)
  } // end else (no pre-computed count)

  return buildAndCreateJob({
    supabase, effectiveSourceLang, targetLang,
    certificationTpe, specialtyId,
    detectedSourceLang, detectedSourceLangConfidence,
    requestedDeliveryDays, wordCount,
    primaryPath: storagePaths[0].path,
    primaryName: storagePaths[0].name,
    allPaths: storagePaths,
    clientName, clientEmail, clientPhone, clientCompany,
    mailingOption, mailingFedex,
  })
}

// ── FormData handler (admin manual-entry, single file through server) ─────────

async function handleFormData(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('document') as File | null
  if (!file) return NextResponse.json({ error: 'Document is required' }, { status: 400 })

  const parsed = formDataSchema.safeParse({
    clientName: formData.get('clientName'),
    clientEmail: formData.get('clientEmail'),
    clientPhone: formData.get('clientPhone') || undefined,
    clientCompany: formData.get('clientCompany') || undefined,
    sourceLang: formData.get('sourceLang') || undefined,
    targetLang: formData.get('targetLang'),
    certificationTpe: formData.get('certificationTpe') || undefined,
    specialtyId: formData.get('specialtyId') || undefined,
    detectedSourceLang: formData.get('detectedSourceLang') || undefined,
    detectedSourceLangConfidence: formData.get('detectedSourceLangConfidence') || undefined,
    requestedDeliveryDays: formData.get('requestedDeliveryDays') || undefined,
  })
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: 'Validation error', detail }, { status: 422 })
  }

  const {
    clientName, clientEmail, clientPhone, clientCompany,
    targetLang, certificationTpe, specialtyId,
    detectedSourceLang, detectedSourceLangConfidence,
    requestedDeliveryDays,
  } = parsed.data

  const effectiveSourceLang = parsed.data.sourceLang || detectedSourceLang!
  const supabase = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const wordCountOrNull = await Promise.race<number | null>([
    extractWordCountWithFallback(buffer, file.name).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 45000)),
  ])
  const wordCount = wordCountOrNull ?? 0

  // Upload document
  const jobId = crypto.randomUUID()
  const storagePath = `documents/raw/${jobId}/${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('job-documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[translation] Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }

  return buildAndCreateJob({
    supabase, effectiveSourceLang, targetLang,
    certificationTpe, specialtyId,
    detectedSourceLang, detectedSourceLangConfidence,
    requestedDeliveryDays, wordCount,
    primaryPath: storagePath,
    primaryName: file.name,
    allPaths: [{ path: storagePath, name: file.name }],
    clientName, clientEmail, clientPhone, clientCompany,
    preAssignedJobId: jobId,
  })
}

// ── Shared job creation logic ─────────────────────────────────────────────────

async function buildAndCreateJob(params: {
  supabase: ReturnType<typeof createServiceClient>
  effectiveSourceLang: string
  targetLang: string
  certificationTpe?: string
  specialtyId?: string
  detectedSourceLang?: string
  detectedSourceLangConfidence?: number
  requestedDeliveryDays?: number
  wordCount: number
  primaryPath: string
  primaryName: string
  allPaths: { path: string; name: string }[]
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientCompany?: string
  mailingOption?: string
  mailingFedex?: boolean
  preAssignedJobId?: string
}) {
  const {
    supabase, effectiveSourceLang, targetLang,
    certificationTpe, specialtyId,
    detectedSourceLang, detectedSourceLangConfidence,
    requestedDeliveryDays, wordCount,
    primaryPath, primaryName, allPaths,
    clientName, clientEmail, clientPhone, clientCompany,
    mailingOption, mailingFedex,
    preAssignedJobId,
  } = params

  const MAILING_PRICES = { standard: 10, hard_copy_company: 25, hard_copy_court: 45, fedex: 69 }
  let mailingAmount = 0
  if (mailingOption === 'standard') mailingAmount = MAILING_PRICES.standard
  else if (mailingOption === 'hard_copy') {
    const certKey = certificationTpe ?? 'general'
    mailingAmount = certKey === 'court' ? MAILING_PRICES.hard_copy_court : MAILING_PRICES.hard_copy_company
  }
  if (mailingFedex && mailingOption) mailingAmount += MAILING_PRICES.fedex

  const [specialtyRow, settingsResult] = await Promise.all([
    resolveSpecialty(supabase, certificationTpe, specialtyId),
    supabase.from('translation_system_settings').select('key, value').in('key', [
      'translation_minimum_standard','translation_minimum_certified',
      'translation_minimum_court','translation_minimum_court_premium',
      'translation_court_premium_langs',
    ]),
  ])

  const settingsMap = Object.fromEntries((settingsResult.data ?? []).map((s) => [s.key, Number(s.value)]))
  const pricing = await resolveTranslationRate(effectiveSourceLang, targetLang, supabase)

  const certForMinimum = certificationTpe
    ?? (specialtyRow.name === 'Certified (USCIS)' ? 'general' : specialtyRow.name === 'Court Certified' ? 'court' : 'none')
  const minimum = resolveCertMinimum(certForMinimum, effectiveSourceLang, targetLang, settingsMap)

  const certKey = certForMinimum as 'court' | 'general' | 'none'
  const standardDays = wordCount > 0 ? calcTurnaroundDays(wordCount, certKey) : null

  let rushDays = 0, rushFeePercent = 0, rushAmount = 0
  if (requestedDeliveryDays !== undefined && standardDays !== null && requestedDeliveryDays < standardDays) {
    const rush = calculateRushFee(0, standardDays - requestedDeliveryDays)
    rushDays = rush.rushDays
    rushFeePercent = rush.rushFeePercent
  }

  let quoteAmount: number | null = null
  if (wordCount > 0 && pricing.perWordRate !== null && specialtyRow.multiplier !== null) {
    const q = calculateQuote(wordCount, pricing.perWordRate, specialtyRow.multiplier, specialtyRow.name ?? '', minimum)
    if (rushDays > 0) {
      const rush = calculateRushFee(q.finalAmount, rushDays)
      rushAmount = rush.rushAmount
      quoteAmount = rush.totalAmount
    } else {
      quoteAmount = q.finalAmount
    }
    if (mailingAmount > 0 && quoteAmount !== null) quoteAmount += mailingAmount
  }

  // Upsert client
  const { data: client, error: clientError } = await supabase
    .from('translation_clients')
    .upsert(
      { contact_name: clientName, email: clientEmail, phone: clientPhone ?? null, company_name: clientCompany ?? null },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()
  if (clientError || !client) return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })

  const jobId = preAssignedJobId ?? crypto.randomUUID()

  const jobPayload = {
    id: jobId,
    job_type: 'translation',
    status: 'draft',
    client_id: client.id,
    source_lang: effectiveSourceLang,
    target_lang: targetLang,
    specialty_id: specialtyRow.id ?? null,
    word_count: wordCount,
    document_path: primaryPath,
    document_name: primaryName,
    quote_per_word_rate: pricing.perWordRate ?? null,
    quote_multiplier: specialtyRow.multiplier ?? null,
    quote_amount: quoteAmount,
    quote_rush_days: rushDays,
    quote_rush_fee_percent: rushFeePercent,
    quote_rush_amount: rushAmount || null,
    estimated_turnaround_days: standardDays,
    requested_delivery_date: requestedDeliveryDays && standardDays
      ? new Date(Date.now() + requestedDeliveryDays * 86400000).toISOString().slice(0, 10)
      : null,
    detected_source_lang: detectedSourceLang ?? null,
    detected_source_lang_confidence: detectedSourceLangConfidence ?? null,
    certification_type: certificationTpe ?? null,
    missing_pricing_warning: pricing.warning ?? null,
    quote_is_pivot: pricing.isPivot,
    mailing_option: mailingOption ?? null,
    mailing_fedex_overnight: mailingFedex ?? false,
    mailing_amount: mailingAmount > 0 ? mailingAmount : null,
  }

  let { data: job, error: jobError } = await supabase
    .from('translation_jobs')
    .insert({ ...jobPayload, document_paths: allPaths.length > 1 ? allPaths : null } as any)
    .select('id')
    .single()

  // If new columns don't exist yet (migrations pending), retry with only known columns
  if (jobError?.message?.includes('document_paths') || jobError?.message?.includes('mailing_')) {
    const stripped = { ...jobPayload } as any
    delete stripped.mailing_option
    delete stripped.mailing_fedex_overnight
    delete stripped.mailing_amount
    ;({ data: job, error: jobError } = await supabase
      .from('translation_jobs')
      .insert({ ...stripped, document_paths: null } as any)
      .select('id')
      .single())
    // If document_paths also missing, strip that too
    if (jobError?.message?.includes('document_paths')) {
      ;({ data: job, error: jobError } = await supabase
        .from('translation_jobs')
        .insert(stripped as any)
        .select('id')
        .single())
    }
  }

  if (jobError || !job) {
    console.error('[translation] Job insert error:', jobError)
    return NextResponse.json({ error: 'Failed to create job', detail: jobError?.message ?? null }, { status: 500 })
  }

  await supabase.from('translation_job_status_history').insert({ job_id: job.id, new_status: 'draft' })

  sendAutoQuoteEmail({
    clientName, clientEmail, sourceLang: effectiveSourceLang, targetLang,
    certificationTpe: certificationTpe ?? 'none',
    wordCount, estimatedAmount: quoteAmount ?? 0,
    // Show "needs review" if: no pricing for this language pair, OR word count couldn't be extracted
    hasMissingPricing: pricing.warning !== null || wordCount === 0,
    unreadableDocument: wordCount === 0,
  }).catch((err) => console.error('[translation] Auto-quote email error:', err))

  notifyAdminNewInquiry({
    jobType: 'translation', jobId: job.id, clientName, clientEmail,
    sourceLang: effectiveSourceLang, targetLang, wordCount,
    certificationLabel: CERT_LABEL[certificationTpe ?? 'none'],
    estimatedAmount: quoteAmount ?? 0, missingPricing: pricing.warning,
  }).catch((err) => console.error('[translation] Admin notify error:', err))

  return NextResponse.json({ jobId: job.id, wordCount, estimatedQuote: quoteAmount, missingPricing: pricing.warning, isPivot: pricing.isPivot })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveSpecialty(
  supabase: ReturnType<typeof createServiceClient>,
  certificationTpe: string | undefined,
  specialtyId: string | undefined,
): Promise<{ id: string | null; name: string | null; multiplier: number | null }> {
  if (certificationTpe) {
    const { data } = await supabase.from('translation_specialty_multipliers').select('id, name, multiplier')
      .eq('name', CERT_SPECIALTY[certificationTpe]).eq('is_active', true).maybeSingle()
    return { id: data?.id ?? null, name: data?.name ?? null, multiplier: data ? Number(data.multiplier) : null }
  }
  if (specialtyId) {
    const { data } = await supabase.from('translation_specialty_multipliers').select('id, name, multiplier').eq('id', specialtyId).single()
    return { id: data?.id ?? null, name: data?.name ?? null, multiplier: data ? Number(data.multiplier) : null }
  }
  return { id: null, name: null, multiplier: 1.0 }
}

async function sendAutoQuoteEmail(params: {
  clientName: string; clientEmail: string; sourceLang: string; targetLang: string
  certificationTpe: string; wordCount: number; estimatedAmount: number; hasMissingPricing: boolean
  unreadableDocument: boolean
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[translation] RESEND_API_KEY not set — skipping client auto-quote email')
    return
  }
  console.log('[translation] Sending client email to', params.clientEmail)
  const html = await render(AutoQuoteEstimateEmail({
    clientName: params.clientName, jobType: 'translation',
    sourceLang: params.sourceLang, targetLang: params.targetLang,
    certificationLabel: CERT_LABEL[params.certificationTpe] ?? 'Standard',
    wordCount: params.wordCount, estimatedAmount: params.estimatedAmount,
    hasMissingPricing: params.hasMissingPricing,
    unreadableDocument: params.unreadableDocument,
  }))
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL, to: params.clientEmail,
    subject: params.hasMissingPricing
      ? 'We Received Your Translation Request — LA Translation'
      : `Translation Estimate: $${params.estimatedAmount.toFixed(2)} — LA Translation`,
    html,
  })
  if (error) {
    console.error('[translation] Resend client email error:', JSON.stringify(error))
    throw error
  }
  console.log('[translation] Client email sent to', params.clientEmail, 'id:', data?.id)
}
