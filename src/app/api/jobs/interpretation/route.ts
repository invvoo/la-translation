import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { render } from '@react-email/components'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateInterpretationQuote } from '@/lib/quote/pricing'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { AutoQuoteEstimateEmail } from '@/lib/email/templates/auto-quote-estimate'
import { notifyAdminNewInquiry } from '@/lib/email/notify-admin'

const schema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(1, 'Phone number is required'),
  clientCompany: z.string().optional(),
  assignmentType: z.string().optional(),
  sourceLang: z.string().min(1),
  targetLang: z.string().min(1),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  durationMinutes: z.coerce.number().int().min(30).optional(),
  locationType: z.enum(['in_person', 'phone', 'video']).optional(),
  locationDetails: z.string().optional(),
  interpreterNotes: z.string().optional(),
  interpretationMode: z.enum(['consecutive', 'simultaneous']).optional(),
  interpretationCertRequired: z.enum(['none', 'court', 'medical']).optional(),
  numInterpreters: z.coerce.number().int().min(1).max(4).optional(),
  simultaneousSurcharge: z.coerce.number().min(0).optional(),
  equipmentRentalNeeded: z.string().optional(),
  equipmentDetails: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const {
    clientName, clientEmail, clientPhone, clientCompany,
    assignmentType,
    interpretationMode, interpretationCertRequired, numInterpreters,
    simultaneousSurcharge, equipmentRentalNeeded, equipmentDetails,
    ...jobData
  } = parsed.data
  const supabase = createServiceClient()

  const { data: client, error: clientError } = await supabase
    .from('translation_clients')
    .upsert({ contact_name: clientName, email: clientEmail, phone: clientPhone ?? null, company_name: clientCompany ?? null }, { onConflict: 'email', ignoreDuplicates: false })
    .select('id')
    .single()

  if (clientError || !client) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })

  // Calculate interpretation quote server-side
  const locationType = jobData.locationType ?? 'in_person'
  const durationMinutes = jobData.durationMinutes ?? 60
  const quote = await calculateInterpretationQuote(locationType, durationMinutes, supabase)

  const { data: job, error: jobError } = await supabase
    .from('translation_jobs')
    .insert({
      job_type: 'interpretation',
      status: 'draft',
      client_id: client.id,
      source_lang: jobData.sourceLang,
      target_lang: jobData.targetLang,
      scheduled_at: jobData.scheduledAt ?? null,
      duration_minutes: durationMinutes,
      location_type: locationType,
      location_details: jobData.locationDetails ?? null,
      interpreter_notes: jobData.interpreterNotes ?? null,
      assignment_type: assignmentType ?? null,
      interpretation_mode: interpretationMode ?? null,
      interpretation_cert_required: interpretationCertRequired ?? null,
      num_interpreters: numInterpreters ?? null,
      simultaneous_surcharge: simultaneousSurcharge ?? null,
      equipment_rental_needed: equipmentRentalNeeded ?? null,
      equipment_details: equipmentDetails ?? null,
      quote_amount: quote.amount,
      quote_interpretation_rate: quote.rate,
      quote_billed_minutes: quote.billedMinutes,
    } as any)
    .select('id')
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })

  await supabase.from('translation_job_status_history').insert({ job_id: job.id, new_status: 'draft' })

  // Send auto-quote email — failure does not fail the job creation
  try {
    const scheduledAtFormatted = jobData.scheduledAt
      ? new Date(jobData.scheduledAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined

    const html = await render(
      AutoQuoteEstimateEmail({
        clientName,
        jobType: 'interpretation',
        sourceLang: jobData.sourceLang,
        targetLang: jobData.targetLang,
        locationType,
        scheduledAt: scheduledAtFormatted,
        durationMinutes,
        estimatedAmount: quote.amount,
        hasMissingPricing: false,
      }),
    )

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: 'Your Interpretation Request — Estimated Quote',
      html,
    })
  } catch {
    // Email failure is non-fatal; job was already created
  }

  notifyAdminNewInquiry({
    jobType: 'interpretation',
    jobId: job.id,
    clientName,
    clientEmail,
    clientPhone,
    sourceLang: jobData.sourceLang,
    targetLang: jobData.targetLang,
    locationType,
    scheduledAt: jobData.scheduledAt
      ? new Date(jobData.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : undefined,
    durationMinutes,
    estimatedAmount: quote.amount,
  }).catch((err) => console.error('[interpretation] Admin notify error:', err))

  return NextResponse.json({ jobId: job.id, estimatedQuote: quote.amount, billedMinutes: quote.billedMinutes })
}
