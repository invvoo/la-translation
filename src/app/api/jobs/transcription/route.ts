import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyAdminNewInquiry } from '@/lib/email/notify-admin'

const schema = z.object({
  // Client info
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  // Media info (path already in Storage from direct upload)
  storagePath: z.string().min(1),
  mediaName: z.string().min(1),
  // Service
  serviceType: z.enum(['transcription', 'subtitles', 'both']),
  sourceLang: z.string().optional(),   // spoken language in media (null = auto-detect)
  targetLang: z.string().optional(),   // subtitle output language if different from source
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const {
    clientName, clientEmail, clientPhone, clientCompany,
    storagePath, mediaName,
    serviceType, sourceLang, targetLang, notes,
  } = parsed.data

  const supabase = createServiceClient()

  // Upsert client
  const { data: client, error: clientError } = await supabase
    .from('translation_clients')
    .upsert(
      { contact_name: clientName, email: clientEmail, phone: clientPhone ?? null, company_name: clientCompany ?? null },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from('translation_jobs')
    .insert({
      job_type: 'transcription',
      status: 'draft',
      client_id: client.id,
      source_lang: sourceLang ?? null,
      target_lang: targetLang ?? null,
      media_path: storagePath,
      media_name: mediaName,
      transcription_service_type: serviceType,
      notes: notes ?? null,
    } as any)
    .select('id')
    .single()

  if (jobError || !job) {
    console.error('[transcription] Job insert error:', jobError)
    return NextResponse.json({ error: 'Failed to create job', detail: jobError?.message ?? null }, { status: 500 })
  }

  await supabase.from('translation_job_status_history').insert({ job_id: job.id, new_status: 'draft' })

  notifyAdminNewInquiry({
    jobType: 'transcription',
    jobId: job.id,
    clientName,
    clientEmail,
    wordCount: undefined,
    estimatedAmount: 0,
    missingPricing: 'Transcription/subtitling — manual quote required',
  }).catch((err) => console.error('[transcription] Admin notify error:', err))

  return NextResponse.json({ jobId: job.id })
}
