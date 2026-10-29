import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { triggerPostPaymentActions } from '@/lib/translation_jobs/post-payment'

const schema = z.object({
  method: z.enum(['cash', 'check', 'zelle', 'venmo', 'wire', 'other']),
  note: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
})

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 })
  const { method, note, amount } = parsed.data

  const service = createServiceClient()

  const { data: job } = await (service as any)
    .from('translation_jobs')
    .select('id, status, job_type, invoice_number, source_lang, target_lang, document_path, document_name, word_count, quote_amount, quote_adjusted_amount, scheduled_at, duration_minutes, location_type, location_details, interpretation_mode, interpretation_cert_required, translation_specialty_multipliers:specialty_id(name), translation_clients(contact_name, email)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow manual payment if job is in quote_accepted or draft/confirmed (hasn't been paid yet)
  const payableStatuses = ['draft', 'quote_sent', 'quote_accepted', 'confirmed']
  if (!payableStatuses.includes(job.status)) {
    return NextResponse.json({ error: `Cannot record payment on a job with status "${job.status}"` }, { status: 409 })
  }

  // Generate invoice number if not already set
  let invoiceNumber = job.invoice_number
  if (!invoiceNumber) {
    const { data } = await service.rpc('generate_invoice_number')
    invoiceNumber = data as string
  }

  const methodLabel: Record<string, string> = {
    cash: 'Cash', check: 'Check', zelle: 'Zelle',
    venmo: 'Venmo', wire: 'Wire Transfer', other: 'Other',
  }

  // Advance to 'paid' (for interpretation/notary) or next appropriate status
  const nextStatus = job.job_type === 'translation' ? 'paid' : 'paid'

  await service.from('translation_jobs').update({
    status: nextStatus,
    invoice_number: invoiceNumber,
    invoice_issued_at: new Date().toISOString(),
    payment_collected_at: new Date().toISOString(),
    payment_method: `manual:${method}`,
    // If admin specifies the actual amount received, record it as the adjusted amount
    ...(amount != null ? { quote_adjusted_amount: amount } : {}),
  } as any).eq('id', jobId)

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: nextStatus,
    changed_by: user.id,
    note: `Manual payment recorded — ${methodLabel[method]}${note ? ` · ${note}` : ''} · ${invoiceNumber}`,
  })

  // Trigger post-payment actions (AI translation, interpreter outreach, admin notify)
  await triggerPostPaymentActions(service, { ...job, status: nextStatus, invoice_number: invoiceNumber }, invoiceNumber)

  return NextResponse.json({ ok: true, invoiceNumber, nextStatus })
}
