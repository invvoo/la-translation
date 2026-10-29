import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
    .from('translation_translator_invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'approved') return NextResponse.json({ error: 'Invoice not in approved state' }, { status: 409 })

  await service.from('translation_translator_invoices').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', invoiceId)

  return NextResponse.json({ ok: true })
}
