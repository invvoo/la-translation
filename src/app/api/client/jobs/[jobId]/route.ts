import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: client } = await service.from('translation_clients').select('id').eq('email', user.email).maybeSingle()
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: job } = await service
    .from('translation_jobs')
    .select([
      'id, job_type, status, source_lang, target_lang, word_count',
      'quote_amount, quote_adjusted_amount, quote_per_word_rate, quote_multiplier, quote_is_pivot',
      'quote_rush_days, quote_rush_fee_percent, quote_rush_amount',
      'certification_type, mailing_option, mailing_amount, mailing_fedex_overnight',
      'invoice_number, created_at, scheduled_at, delivered_at',
      'estimated_turnaround_days, requested_delivery_date',
      'document_name, delivery_token, missing_pricing_warning',
    ].join(', '))
    .eq('id', jobId)
    .eq('client_id', client.id)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch discount separately so it works regardless of whether types are regenerated
  const { data: discountRow } = await service
    .from('translation_jobs')
    .select('discount_amount, discount_label')
    .eq('id', jobId)
    .single() as any

  return NextResponse.json({
    job: {
      ...(job as any),
      discount_amount: discountRow?.discount_amount ?? null,
      discount_label: discountRow?.discount_label ?? null,
    },
  })
}
