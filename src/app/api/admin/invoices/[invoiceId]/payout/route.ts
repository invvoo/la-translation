import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

interface Props {
  params: Promise<{ invoiceId: string }>
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { invoiceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: invoice } = await service
    .from('translator_invoices')
    .select('id, amount, status, translators(stripe_connect_id, full_name), job_id')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'approved') return NextResponse.json({ error: 'Invoice not in approved state' }, { status: 409 })

  const translator = invoice.translators as any
  if (!translator?.stripe_connect_id) {
    return NextResponse.json({ error: 'Translator does not have a Stripe Connect account' }, { status: 400 })
  }

  const transfer = await getStripe().transfers.create({
    amount: Math.round(Number(invoice.amount) * 100),
    currency: 'usd',
    destination: translator.stripe_connect_id,
    transfer_group: invoice.job_id,
  })

  await service.from('translator_invoices').update({
    status: 'queued',
    stripe_transfer_id: transfer.id,
  }).eq('id', invoiceId)

  return NextResponse.json({ ok: true, transferId: transfer.id })
}
