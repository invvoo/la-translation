import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

// Called daily by Vercel Cron or external scheduler
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: dueInvoices } = await supabase
    .from('translator_invoices')
    .select('id, amount, job_id, translators(stripe_connect_id, full_name)')
    .eq('status', 'approved')
    .lte('payout_due_at', new Date().toISOString())

  if (!dueInvoices || dueInvoices.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0
  const errors: string[] = []

  for (const invoice of dueInvoices) {
    const translator = invoice.translators as any
    if (!translator?.stripe_connect_id) {
      errors.push(`Invoice ${invoice.id}: translator has no Stripe Connect account`)
      continue
    }

    try {
      const transfer = await getStripe().transfers.create({
        amount: Math.round(Number(invoice.amount) * 100),
        currency: 'usd',
        destination: translator.stripe_connect_id,
        transfer_group: invoice.job_id,
      })

      await supabase
        .from('translator_invoices')
        .update({ status: 'queued', stripe_transfer_id: transfer.id })
        .eq('id', invoice.id)

      processed++
    } catch (err) {
      errors.push(`Invoice ${invoice.id}: ${String(err)}`)
      await supabase.from('translator_invoices').update({ status: 'failed' }).eq('id', invoice.id)
    }
  }

  return NextResponse.json({ processed, errors })
}
