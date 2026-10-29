import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/tokens'
import { autoClaimJob } from '@/lib/admin/auto-claim'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { DeliveryReadyEmail } from '@/lib/email/templates/delivery-ready'
import { render as renderAsync } from '@react-email/components'

interface Props {
  params: Promise<{ jobId: string }>
}

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('translatedFile') as File | null
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

  const service = createServiceClient()
  const { data: job } = await service
    .from('translation_jobs')
    .select('id, status, job_type, source_lang, target_lang, invoice_number, translation_clients(contact_name, email)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = `documents/delivered/${jobId}/${file.name}`

  const { error: uploadError } = await service.storage
    .from('job-documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  // Generate a 30-day delivery token
  const deliveryToken = await signToken({ jobId, type: 'delivery' }, '30d')

  await service.from('translation_jobs').update({
    translated_doc_path: storagePath,
    delivered_at: new Date().toISOString(),
    delivery_token: deliveryToken,
    status: 'complete',
  }).eq('id', jobId)

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'complete',
    changed_by: user.id,
  })

  const client = job.translation_clients as any
  if (client?.email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const html = await renderAsync(DeliveryReadyEmail({
      clientName: client.contact_name,
      jobType: job.job_type,
      sourceLang: job.source_lang ?? undefined,
      targetLang: job.target_lang ?? undefined,
      downloadUrl: `${baseUrl}/delivery/${deliveryToken}`,
      invoiceNumber: job.invoice_number ?? '',
    }))

    const { data: emailData, error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: client.email,
      subject: `Your Translation is Ready — ${job.invoice_number}`,
      html,
    })

    await service.from('translation_email_log').insert({
      job_id: jobId,
      email_type: 'delivery',
      recipient: client.email,
      subject: `Your Translation is Ready — ${job.invoice_number}`,
      resend_id: emailData?.id ?? null,
      status: emailError ? 'failed' : 'sent',
    })

    await service.from('translation_jobs').update({ delivery_email_sent_at: new Date().toISOString() }).eq('id', jobId)
  }

  await autoClaimJob(service, jobId, user.id)

  return NextResponse.json({ ok: true })
}
