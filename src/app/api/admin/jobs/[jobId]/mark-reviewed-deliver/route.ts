import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/tokens'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { DeliveryReadyEmail } from '@/lib/email/templates/delivery-ready'
import { render as renderAsync } from '@react-email/components'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: job } = await (service as any)
    .from('translation_jobs')
    .select('id, status, job_type, source_lang, target_lang, invoice_number, document_name, translated_doc_path, ai_draft_path, document_path, translation_clients(contact_name, email)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Determine which document to deliver: vendor submission > AI draft > original
  const docPath: string | null = job.translated_doc_path ?? job.ai_draft_path ?? job.document_path ?? null
  if (!docPath) return NextResponse.json({ error: 'No document available to deliver' }, { status: 400 })

  const now = new Date().toISOString()
  const deliveryToken = await signToken({ jobId, type: 'delivery' }, '30d')

  const { error: updateError } = await (service as any).from('translation_jobs').update({
    translated_doc_path: docPath,
    reviewed_at: now,
    reviewer_id: user.id,
    delivered_at: now,
    delivery_token: deliveryToken,
    status: 'complete',
  }).eq('id', jobId)

  if (updateError) {
    console.error('[mark-reviewed-deliver]', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'complete',
    changed_by: user.id,
    note: 'Marked reviewed by admin and delivered to client',
  })

  const client = job.translation_clients as any
  if (client?.email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    try {
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
        subject: `Your Translation is Ready${job.invoice_number ? ` — ${job.invoice_number}` : ''}`,
        html,
      })

      await service.from('translation_email_log').insert({
        job_id: jobId,
        email_type: 'delivery',
        recipient: client.email,
        subject: `Your Translation is Ready`,
        resend_id: emailData?.id ?? null,
        status: emailError ? 'failed' : 'sent',
      } as any)

      await (service as any).from('translation_jobs').update({ delivery_email_sent_at: now }).eq('id', jobId)
    } catch (err) {
      console.error('[mark-reviewed-deliver] email failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ ok: true })
}
