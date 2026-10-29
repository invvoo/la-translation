import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

interface Props { params: Promise<{ invoiceId: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { invoiceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { error } = await service
    .from('translation_translator_invoices')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      payout_due_at: addDays(new Date(), 30).toISOString(),
    } as any)
    .eq('id', invoiceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
