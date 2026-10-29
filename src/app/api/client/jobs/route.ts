import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: client } = await service
    .from('translation_clients')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!client) return NextResponse.json({ translation_jobs: [] })

  const { data: clientJobs } = await (service as any)
    .from('translation_jobs')
    .select('id, job_type, status, source_lang, target_lang, word_count, quote_amount, quote_adjusted_amount, quote_rush_days, invoice_number, created_at, scheduled_at, delivered_at, estimated_turnaround_days, requested_delivery_date, document_name, delivery_token')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  if (!clientJobs?.length) return NextResponse.json({ translation_jobs: [], clientId: client.id })

  // Fetch discount amounts separately (column added in migration 0015)
  const ids = (clientJobs as any[]).map((j: any) => j.id as string)
  const { data: discounts } = await service
    .from('translation_jobs')
    .select('id, discount_amount')
    .in('id', ids) as any

  const discountMap: Record<string, number> = {}
  for (const d of discounts ?? []) {
    if ((d as any).discount_amount != null) discountMap[(d as any).id] = Number((d as any).discount_amount)
  }

  const translation_jobs = (clientJobs as any[]).map((j: any) => {
    const base = Number(j.quote_adjusted_amount ?? j.quote_amount ?? 0)
    const discount = discountMap[j.id] ?? 0
    return { ...j, discount_amount: discount > 0 ? discount : null, display_amount: Math.max(0, base - discount) }
  })

  return NextResponse.json({ translation_jobs, clientId: client.id })
}
