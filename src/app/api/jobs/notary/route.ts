import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyAdminNewInquiry } from '@/lib/email/notify-admin'

const schema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  notaryServiceType: z.enum(['notary', 'apostille', 'both']),
  deliveryMethod: z.enum(['in_person', 'mail', 'mobile_notary']),
  notaryAddress: z.string().optional(),
  notarySignatureCount: z.coerce.number().int().min(1).optional(),
  documentDescription: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (d) => d.deliveryMethod !== 'mobile_notary' || !!d.notaryAddress,
  { message: 'Address is required for mobile notary', path: ['notaryAddress'] }
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { clientName, clientEmail, clientPhone, clientCompany, notaryServiceType, deliveryMethod, notaryAddress, notarySignatureCount, documentDescription, notes } = parsed.data
  const supabase = createServiceClient()

  const { data: client, error: clientError } = await supabase
    .from('translation_clients')
    .upsert({ contact_name: clientName, email: clientEmail, phone: clientPhone ?? null, company_name: clientCompany ?? null }, { onConflict: 'email' })
    .select('id')
    .single()

  if (clientError || !client) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })

  const { data: job, error: jobError } = await supabase
    .from('translation_jobs')
    .insert({
      job_type: 'notary',
      status: 'draft',
      client_id: client.id,
      notary_service_type: notaryServiceType,
      delivery_method: deliveryMethod,
      notary_address: notaryAddress ?? null,
      notary_signature_count: notarySignatureCount ?? 1,
      employee_notes: [documentDescription, notes].filter(Boolean).join('\n') || null,
    } as any)
    .select('id')
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })

  await supabase.from('translation_job_status_history').insert({ job_id: job.id, new_status: 'draft' })

  notifyAdminNewInquiry({
    jobType: 'notary',
    jobId: job.id,
    clientName,
    clientEmail,
    clientPhone,
    notaryServiceType,
    deliveryMethod: deliveryMethod === 'mobile_notary' ? `mobile_notary (${notaryAddress})` : deliveryMethod,
  }).catch((err) => console.error('[notary] Admin notify error:', err))

  return NextResponse.json({ jobId: job.id })
}
