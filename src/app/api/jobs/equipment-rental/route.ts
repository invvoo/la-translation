import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyAdminNewInquiry } from '@/lib/email/notify-admin'

const rentalItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string(),
  qty: z.number().int().min(1),
  ratePerDay: z.number(),
})

const schema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  rentalStartDate: z.string().date(),
  rentalEndDate: z.string().date(),
  items: z.array(rentalItemSchema).min(1),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { clientName, clientEmail, clientPhone, clientCompany, items, rentalStartDate, rentalEndDate, notes } = parsed.data
  const supabase = createServiceClient()

  // Calculate quote based on days × rates
  const start = new Date(rentalStartDate)
  const end = new Date(rentalEndDate)
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const totalAmount = items.reduce((sum, item) => sum + item.qty * item.ratePerDay * days, 0)

  const { data: client, error: clientError } = await supabase
    .from('translation_clients')
    .upsert({ contact_name: clientName, email: clientEmail, phone: clientPhone ?? null, company_name: clientCompany ?? null }, { onConflict: 'email' })
    .select('id')
    .single()

  if (clientError || !client) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })

  const { data: job, error: jobError } = await supabase
    .from('translation_jobs')
    .insert({
      job_type: 'equipment_rental',
      status: 'draft',
      client_id: client.id,
      rental_start_date: rentalStartDate,
      rental_end_date: rentalEndDate,
      rental_items: items,
      quote_amount: Math.round(totalAmount * 100) / 100,
      employee_notes: notes ?? null,
    })
    .select('id')
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })

  await supabase.from('translation_job_status_history').insert({ job_id: job.id, new_status: 'draft' })

  notifyAdminNewInquiry({
    jobType: 'equipment_rental',
    jobId: job.id,
    clientName,
    clientEmail,
    clientPhone,
    rentalStartDate,
    rentalEndDate,
    rentalItems: items,
    estimatedAmount: Math.round(totalAmount * 100) / 100,
  }).catch((err) => console.error('[equipment-rental] Admin notify error:', err))

  return NextResponse.json({ jobId: job.id, estimatedQuote: totalAmount })
}
