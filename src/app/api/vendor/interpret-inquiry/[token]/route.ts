import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { token } = await params
  const service = createServiceClient()

  const { data: bid } = await (service as any)
    .from('translation_interpreter_bids')
    .select('id, status, rate, rate_notes, translator_id, job_id, translation_translators(full_name, email, hourly_rate), translation_jobs(source_lang, target_lang, scheduled_at, duration_minutes, location_type, location_details, assignment_type, interpretation_mode, interpretation_cert_required, interpreter_notes)')
    .eq('token', token)
    .single() as any

  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ bid })
}

export async function POST(req: NextRequest, { params }: Props) {
  const { token } = await params
  const body = await req.json()
  const parsed = z.object({
    action: z.enum(['interested', 'declined']),
    rate: z.coerce.number().positive().optional(),
    rateNotes: z.string().max(500).optional(),
  }).safeParse(body)

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { action, rate, rateNotes } = parsed.data
  const service = createServiceClient()

  const { data: bid } = await (service as any)
    .from('translation_interpreter_bids')
    .select('id, status, job_id')
    .eq('token', token)
    .single() as any

  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (bid.status === 'assigned') {
    return NextResponse.json({ error: 'already_assigned' }, { status: 409 })
  }

  await (service as any).from('translation_interpreter_bids').update({
    status: action,
    rate: action === 'interested' ? (rate ?? null) : null,
    rate_notes: action === 'interested' ? (rateNotes ?? null) : null,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any).eq('token', token)

  return NextResponse.json({ ok: true, action })
}
