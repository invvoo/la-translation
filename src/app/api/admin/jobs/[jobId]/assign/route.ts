import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { autoClaimJob } from '@/lib/admin/auto-claim'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { TranslatorAssignedEmail } from '@/lib/email/templates/translator-assigned'
import { InterpreterAssignedEmail } from '@/lib/email/templates/interpreter-assigned'
import { render as renderAsync } from '@react-email/components'
import crypto from 'crypto'

interface Props {
  params: Promise<{ jobId: string }>
}

/** Generate a PO number: PO-YYYYMMDD-NNNN where NNNN is zero-padded day sequence */
async function generatePoNumber(service: ReturnType<typeof createServiceClient>): Promise<string> {
  const today = new Date()
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '')

  // Count translation_jobs with PO numbers that start with today's prefix to get sequence
  const prefix = `PO-${datePart}-`
  const { count } = await service
    .from('translation_jobs')
    .select('id', { count: 'exact', head: true })
    .like('po_number', `${prefix}%`)

  const seq = ((count ?? 0) + 1).toString().padStart(4, '0')
  return `${prefix}${seq}`
}

/** Build an iCalendar (.ics) string for the assignment */
function buildIcs(params: {
  poNumber: string
  summary: string
  description: string
  location?: string
  startAt: Date
  endAt: Date
}): string {
  function fmt(d: Date) {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  const uid = `${params.poNumber}@latranslation.com`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LA Translation//Assignment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(params.startAt)}`,
    `DTEND:${fmt(params.endAt)}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
    params.location ? `LOCATION:${params.location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { translatorId, deadlineAt } = z.object({
    translatorId: z.string().uuid(),
    deadlineAt: z.string().datetime({ offset: true }).optional(),
  }).parse(body)

  const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-proto')?.split(',')[0].trim() + '://' + req.headers.get('host')
  const baseUrl = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const service = createServiceClient()
  const { data: job } = await (service as any)
    .from('translation_jobs')
    .select('status, job_type, invoice_number, word_count, source_lang, target_lang, document_path, ai_draft_path, scheduled_at, duration_minutes, location_type, location_details, interpreter_notes, interpretation_mode, interpretation_cert_required, translation_clients(email, contact_name)')
    .eq('id', jobId)
    .single()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: translator } = await service
    .from('translation_translators')
    .select('id, full_name, email')
    .eq('id', translatorId)
    .single()
  if (!translator) return NextResponse.json({ error: 'Translator not found' }, { status: 404 })

  // Generate PO number for all assignments
  const poNumber = await generatePoNumber(service)

  // For interpretation: pull confirmed rate from an accepted bid if one exists
  let vendorConfirmedRate: number | null = null
  if ((job as any).job_type === 'interpretation') {
    const { data: bid } = await (service as any)
      .from('translation_interpreter_bids')
      .select('rate')
      .eq('job_id', jobId)
      .eq('translator_id', translatorId)
      .in('status', ['interested', 'pending'])
      .maybeSingle()
    if (bid?.rate != null) vendorConfirmedRate = Number(bid.rate)
    // Mark bid as assigned
    await (service as any).from('translation_interpreter_bids').update({ status: 'assigned', updated_at: new Date().toISOString() }).eq('job_id', jobId).eq('translator_id', translatorId)
  }

  // For translation: generate acceptance token so translator confirms their rate
  let translatorAcceptanceToken: string | null = null
  if ((job as any).job_type !== 'interpretation') {
    translatorAcceptanceToken = crypto.randomBytes(32).toString('hex')
  }

  const { error: jobUpdateError } = await (service as any).from('translation_jobs').update({
    assigned_translator_id: translatorId,
    assigned_at: new Date().toISOString(),
    deadline_at: deadlineAt ?? null,
    status: 'assigned',
    po_number: poNumber,
    ...(vendorConfirmedRate != null ? { vendor_confirmed_rate: vendorConfirmedRate } : {}),
    ...(translatorAcceptanceToken ? { translator_acceptance_token: translatorAcceptanceToken } : {}),
  }).eq('id', jobId)

  if (jobUpdateError) {
    console.error('[assign] Job update failed:', jobUpdateError)
    return NextResponse.json({ error: `Job update failed: ${jobUpdateError.message ?? JSON.stringify(jobUpdateError)}` }, { status: 500 })
  }

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'assigned',
    changed_by: user.id,
    note: `Assigned to ${translator.full_name} · PO: ${poNumber}`,
  })

  await autoClaimJob(service, jobId, user.id)

  const isInterpretation = (job as any).job_type === 'interpretation'
  const client = (job as any).translation_clients as { email: string; contact_name: string } | null
  const langLabel = (job as any).source_lang && (job as any).target_lang
    ? `${(job as any).source_lang} → ${(job as any).target_lang}`
    : 'Interpreting'

  try {
    if (isInterpretation) {
      // ── Interpreter assignment email with iCal ──────────────────────────

      const scheduledAt: Date | null = (job as any).scheduled_at ? new Date((job as any).scheduled_at) : null
      const durationMin: number = (job as any).duration_minutes ?? 60

      const scheduledAtFormatted = scheduledAt
        ? scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' })
        : 'To be confirmed'

      const endAt = scheduledAt ? new Date(scheduledAt.getTime() + durationMin * 60000) : null
      const estimatedEndFormatted = endAt
        ? endAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' })
        : undefined

      const html = await renderAsync(InterpreterAssignedEmail({
        interpreterName: translator.full_name,
        clientName: client?.contact_name ?? 'Client',
        poNumber,
        scheduledAt: scheduledAtFormatted,
        estimatedEndTime: estimatedEndFormatted,
        durationMinutes: durationMin,
        sourceLang: (job as any).source_lang ?? '',
        targetLang: (job as any).target_lang ?? '',
        locationType: (job as any).location_type ?? 'in_person',
        locationDetails: (job as any).location_details ?? undefined,
        interpretationMode: (job as any).interpretation_mode ?? 'consecutive',
        certRequired: (job as any).interpretation_cert_required ?? 'none',
        adminEmail: 'info@latranslation.com',
        adminPhone: '(213) 385-7781',
        specialInstructions: (job as any).interpreter_notes ?? undefined,
        jobPortalUrl: `${baseUrl}/vendor/translation_jobs/${jobId}`,
      }))

      // Build iCal attachment
      let icsContent: string | null = null
      if (scheduledAt && endAt) {
        icsContent = buildIcs({
          poNumber,
          summary: `Interpretation — ${langLabel}`,
          description: `Client: ${client?.contact_name ?? 'TBD'}\nPO: ${poNumber}\nMode: ${(job as any).interpretation_mode ?? 'consecutive'}\nPortal: ${baseUrl}/vendor/translation_jobs/${jobId}`,
          location: (job as any).location_details ?? undefined,
          startAt: scheduledAt,
          endAt,
        })
      }

      const emailPayload: Parameters<ReturnType<typeof getResend>['emails']['send']>[0] = {
        from: FROM_EMAIL,
        to: translator.email,
        subject: `Interpretation Assignment — ${langLabel} · ${poNumber}`,
        html,
        ...(icsContent ? {
          attachments: [{
            filename: `assignment-${poNumber}.ics`,
            content: Buffer.from(icsContent).toString('base64'),
          }],
        } : {}),
      }

      const { data: emailData, error: emailError } = await getResend().emails.send(emailPayload)

      await service.from('translation_email_log').insert({
        job_id: jobId,
        email_type: 'interpreter_assigned',
        recipient: translator.email,
        subject: `Interpretation Assignment — ${langLabel} · ${poNumber}`,
        resend_id: emailData?.id ?? null,
        status: emailError ? 'failed' : 'sent',
        error_message: emailError ? String(emailError) : null,
      } as any)

    } else {
      // ── Standard translator assignment email ────────────────────────────

      const html = await renderAsync(TranslatorAssignedEmail({
        translatorName: translator.full_name,
        sourceLang: (job as any).source_lang ?? undefined,
        targetLang: (job as any).target_lang ?? undefined,
        wordCount: (job as any).word_count ?? undefined,
        deadlineAt: deadlineAt,
        invoiceNumber: (job as any).invoice_number ?? poNumber,
        jobPortalUrl: `${baseUrl}/vendor/translation_jobs/${jobId}`,
        originalDocUrl: `${baseUrl}/api/admin/translation_jobs/${jobId}/document`,
        aiDraftUrl: (job as any).ai_draft_path ? `${baseUrl}/api/admin/translation_jobs/${jobId}/document?type=draft` : undefined,
        acceptanceUrl: translatorAcceptanceToken ? `${baseUrl}/vendor/translation-acceptance/${translatorAcceptanceToken}` : undefined,
      }))

      const { data: emailData, error: emailError } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: translator.email,
        subject: `New Job Assigned — ${langLabel}${(job as any).invoice_number ? ` (${(job as any).invoice_number})` : ` · ${poNumber}`}`,
        html,
      })

      await service.from('translation_email_log').insert({
        job_id: jobId,
        email_type: 'translator_assigned',
        recipient: translator.email,
        subject: `New Job Assigned — ${langLabel}`,
        resend_id: emailData?.id ?? null,
        status: emailError ? 'failed' : 'sent',
        error_message: emailError ? String(emailError) : null,
      } as any)
    }
  } catch (err) {
    console.error('[assign] Email failed (non-fatal):', err)
  }

  return NextResponse.json({ ok: true, poNumber })
}
