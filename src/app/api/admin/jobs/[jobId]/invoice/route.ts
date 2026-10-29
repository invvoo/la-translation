import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

interface Props {
  params: Promise<{ jobId: string }>
}

// POST — record and approve translator invoice
export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { translatorId, amount, invoiceNumber, notes } = z.object({
    translatorId: z.string().uuid(),
    amount: z.number().positive(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
  }).parse(body)

  const service = createServiceClient()
  const payoutDueAt = addDays(new Date(), 30)

  const { data, error } = await service
    .from('translation_translator_invoices')
    .insert({
      job_id: jobId,
      translator_id: translatorId,
      amount,
      invoice_number: invoiceNumber ?? null,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      payout_due_at: payoutDueAt.toISOString(),
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to record invoice' }, { status: 500 })

  return NextResponse.json({ id: data.id, payoutDueAt: payoutDueAt.toISOString() })
}
