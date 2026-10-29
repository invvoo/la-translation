import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({
    amount: z.number().positive(),
    note: z.string().max(500).optional(),
    overtimeRequested: z.boolean().optional(),
    overtimeNotes: z.string().max(500).optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()

  const { data: translator } = await service
    .from('translation_translators')
    .select('id')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()
  if (!translator) return NextResponse.json({ error: 'No active vendor account' }, { status: 403 })

  const { data: job } = await (service as any)
    .from('translation_jobs')
    .select('id, status, job_type, vendor_confirmed_rate')
    .eq('id', jobId)
    .eq('assigned_translator_id', translator.id)
    .single()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Validate amount against confirmed rate
  const confirmedRate: number | null = job.vendor_confirmed_rate != null ? Number(job.vendor_confirmed_rate) : null
  const isInterpreter = job.job_type === 'interpretation'

  if (confirmedRate != null) {
    if (!isInterpreter) {
      // Translators must invoice exactly the confirmed rate
      if (Math.abs(parsed.data.amount - confirmedRate) > 0.01) {
        return NextResponse.json({
          error: `Invoice amount must match your confirmed rate of $${confirmedRate.toFixed(2)}`,
        }, { status: 422 })
      }
    } else if (parsed.data.amount > confirmedRate + 0.01 && !parsed.data.overtimeRequested) {
      // Interpreters requesting more than confirmed rate must flag overtime
      return NextResponse.json({
        error: 'Amount exceeds your confirmed rate. Check "Request overtime" to submit a higher amount.',
      }, { status: 422 })
    }
  }

  // Check no invoice already submitted
  const { data: existing } = await service
    .from('translation_translator_invoices')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'An invoice has already been submitted for this job' }, { status: 409 })

  // Record overtime flag on the job if interpreter is requesting it
  if (isInterpreter && parsed.data.overtimeRequested) {
    await (service as any).from('translation_jobs').update({
      vendor_overtime_requested: true,
      vendor_overtime_notes: parsed.data.overtimeNotes ?? null,
    }).eq('id', jobId)
  }

  const { error } = await service.from('translation_translator_invoices').insert({
    job_id: jobId,
    translator_id: translator.id,
    amount: parsed.data.amount,
    status: 'submitted',
    notes: parsed.data.note ?? null,
  } as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
