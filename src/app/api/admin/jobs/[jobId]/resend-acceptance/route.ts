import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { TranslatorAssignedEmail } from '@/lib/email/templates/translator-assigned'
import { render as renderAsync } from '@react-email/components'
import crypto from 'crypto'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: job } = await (service as any)
    .from('translation_jobs')
    .select('id, job_type, status, source_lang, target_lang, word_count, deadline_at, invoice_number, po_number, ai_draft_path, vendor_accepted_at, translation_translators:assigned_translator_id(full_name, email)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.job_type === 'interpretation') return NextResponse.json({ error: 'Not a translation job' }, { status: 400 })
  if (job.vendor_accepted_at) return NextResponse.json({ error: 'already_accepted' }, { status: 409 })

  const translator = job.translation_translators as { full_name: string; email: string } | null
  if (!translator) return NextResponse.json({ error: 'No translator assigned' }, { status: 400 })

  const newToken = crypto.randomBytes(32).toString('hex')

  const { error: updateError } = await (service as any)
    .from('translation_jobs')
    .update({ translator_acceptance_token: newToken })
    .eq('id', jobId)

  if (updateError) {
    console.error('[resend-acceptance] Update failed:', updateError)
    return NextResponse.json({ error: 'Failed to generate token — ensure migration 0020 is applied.' }, { status: 500 })
  }

  const origin = _req.headers.get('origin') ?? (_req.headers.get('x-forwarded-proto')?.split(',')[0].trim() + '://' + _req.headers.get('host'))
  const baseUrl = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const acceptanceUrl = `${baseUrl}/vendor/translation-acceptance/${newToken}`

  const langLabel = job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : 'Translation'

  try {
    const html = await renderAsync(TranslatorAssignedEmail({
      translatorName: translator.full_name,
      sourceLang: job.source_lang ?? undefined,
      targetLang: job.target_lang ?? undefined,
      wordCount: job.word_count ?? undefined,
      deadlineAt: job.deadline_at ?? undefined,
      invoiceNumber: job.invoice_number ?? job.po_number ?? undefined,
      jobPortalUrl: `${baseUrl}/vendor/translation_jobs/${jobId}`,
      originalDocUrl: `${baseUrl}/api/admin/translation_jobs/${jobId}/document`,
      aiDraftUrl: job.ai_draft_path ? `${baseUrl}/api/admin/translation_jobs/${jobId}/document?type=draft` : undefined,
      acceptanceUrl,
    }))

    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: translator.email,
      subject: `Action Required: Accept Translation Job — ${langLabel}`,
      html,
    })

    await service.from('translation_email_log').insert({
      job_id: jobId,
      email_type: 'translator_assigned',
      recipient: translator.email,
      subject: `Action Required: Accept Translation Job — ${langLabel}`,
      resend_id: null,
      status: emailError ? 'failed' : 'sent',
      error_message: emailError ? String(emailError) : null,
    } as any)
  } catch (err) {
    console.error('[resend-acceptance] Email failed (non-fatal):', err)
  }

  return NextResponse.json({ ok: true, acceptanceUrl })
}
