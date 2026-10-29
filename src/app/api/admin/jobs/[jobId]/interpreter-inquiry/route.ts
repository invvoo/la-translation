import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { InterpreterInquiryEmail } from '@/lib/email/templates/interpreter-inquiry'
import { render as renderAsync } from '@react-email/components'
import crypto from 'crypto'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { interpreterIds } = z.object({
    interpreterIds: z.array(z.string().uuid()).min(1),
  }).parse(body)

  const service = createServiceClient()

  const { data: job } = await service
    .from('translation_jobs')
    .select('id, source_lang, target_lang, scheduled_at, duration_minutes, location_type, location_details, assignment_type, interpretation_mode, interpretation_cert_required, interpreter_notes')
    .eq('id', jobId)
    .single() as any

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: interpreters } = await service
    .from('translation_translators')
    .select('id, full_name, email')
    .in('id', interpreterIds)
    .eq('is_active', true)

  if (!interpreters?.length) return NextResponse.json({ error: 'No active interpreters found' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const scheduledAtFormatted = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles',
      })
    : undefined

  const contacted: { id: string; name: string }[] = []

  for (const interpreter of interpreters) {
    // Upsert bid record — if already sent, reuse existing token
    const { data: existingBid } = await (service as any)
      .from('translation_interpreter_bids')
      .select('id, token')
      .eq('job_id', jobId)
      .eq('translator_id', interpreter.id)
      .maybeSingle() as any

    let token: string
    if (existingBid) {
      token = existingBid.token
    } else {
      token = crypto.randomBytes(32).toString('hex')
      await (service as any).from('translation_interpreter_bids').insert({
        job_id: jobId,
        translator_id: interpreter.id,
        token,
        status: 'pending',
      } as any)
    }

    const respondUrl = `${baseUrl}/vendor/interpret-inquiry/${token}`

    try {
      const html = await renderAsync(InterpreterInquiryEmail({
        interpreterName: interpreter.full_name,
        sourceLang: job.source_lang ?? '',
        targetLang: job.target_lang ?? '',
        assignmentType: job.assignment_type ?? undefined,
        scheduledAt: scheduledAtFormatted,
        durationMinutes: job.duration_minutes ?? undefined,
        locationType: job.location_type ?? undefined,
        locationDetails: job.location_details ?? undefined,
        interpretationMode: job.interpretation_mode ?? undefined,
        certRequired: job.interpretation_cert_required ?? undefined,
        adminEmail: 'info@latranslation.com',
        adminPhone: '(213) 385-7781',
        respondUrl,
      }))

      const langLabel = `${job.source_lang ?? ''} → ${job.target_lang ?? ''}`
      const { data: emailData, error: emailError } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: interpreter.email,
        subject: `Interpretation Inquiry — ${langLabel}${scheduledAtFormatted ? ` · ${scheduledAtFormatted}` : ''}`,
        html,
      })

      await service.from('translation_email_log').insert({
        job_id: jobId,
        email_type: 'interpreter_inquiry',
        recipient: interpreter.email,
        subject: `Interpretation Inquiry — ${langLabel}`,
        resend_id: emailData?.id ?? null,
        status: emailError ? 'failed' : 'sent',
      } as any)

      contacted.push({ id: interpreter.id, name: interpreter.full_name })
    } catch (err) {
      console.error('[interpreter-inquiry] Email failed for', interpreter.email, err)
    }
  }

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: null,
    new_status: null,
    changed_by: user.id,
    note: `Interpreter inquiry sent to: ${contacted.map((c) => c.name).join(', ')}`,
  } as any)

  return NextResponse.json({ ok: true, contacted })
}
