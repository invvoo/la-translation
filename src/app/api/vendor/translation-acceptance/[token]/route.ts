import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { token } = await params
  const service = createServiceClient()

  const { data: job, error: jobError } = await (service as any)
    .from('translation_jobs')
    .select('id, status, source_lang, target_lang, word_count, deadline_at, invoice_number, vendor_confirmed_rate, vendor_accepted_at, assigned_translator_id, translation_translators:assigned_translator_id(full_name, email, per_word_rate)')
    .eq('translator_acceptance_token', token)
    .single()

  if (jobError) console.error('[translation-acceptance GET]', jobError)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ job })
}

export async function POST(req: NextRequest, { params }: Props) {
  const { token } = await params
  const body = await req.json()
  const parsed = z.object({
    rate: z.coerce.number().positive(),
    notes: z.string().max(500).optional(),
  }).safeParse(body)

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()

  const { data: job, error: jobError } = await (service as any)
    .from('translation_jobs')
    .select('id, status, vendor_accepted_at')
    .eq('translator_acceptance_token', token)
    .single()

  if (jobError) console.error('[translation-acceptance POST]', jobError)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.vendor_accepted_at) return NextResponse.json({ error: 'already_accepted' }, { status: 409 })

  await (service as any).from('translation_jobs').update({
    vendor_confirmed_rate: parsed.data.rate,
    vendor_accepted_at: new Date().toISOString(),
  }).eq('translator_acceptance_token', token)

  return NextResponse.json({ ok: true, rate: parsed.data.rate })
}
