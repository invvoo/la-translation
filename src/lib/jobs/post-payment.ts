import { render as renderAsync } from '@react-email/components'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { AdminJobPaidEmail } from '@/lib/email/templates/admin-job-paid'
import { TranslatorInquiryEmail } from '@/lib/email/templates/translator-inquiry'
import { inngest } from '@/inngest/client'
import type { SupabaseClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'info@latranslation.com'
const ADMIN_PHONE = '(213) 385-7781'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
const MAX_INQUIRY_EMAILS = 8   // cap blast to avoid spam flags

interface JobRow {
  id: string
  job_type: string
  status: string
  source_lang: string | null
  target_lang: string | null
  document_path: string | null
  document_name: string | null
  word_count: number | null
  invoice_number: string | null
  quote_amount: number | null
  quote_adjusted_amount: number | null
  scheduled_at: string | null
  duration_minutes: number | null
  location_type: string | null
  location_details: string | null
  interpretation_mode: string | null
  interpretation_cert_required: string | null
  translation_clients: { contact_name: string; email: string } | null
  translation_specialty_multipliers: { name: string } | null
}

/**
 * Called after any payment (Stripe webhook or manual recording).
 * Handles per-job-type post-payment logic:
 *   - translation   → AI translation → ai_review_pending → admin notified
 *   - interpretation → find + email matching interpreters → admin notified
 *   - notary / equipment_rental → admin notified to schedule / dispatch
 */
export async function triggerPostPaymentActions(
  supabase: SupabaseClient,
  job: JobRow,
  invoiceNumber: string,
) {
  const jobId = job.id
  const client = job.translation_clients
  const amount = Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0)
  const adminNotifyEmail = process.env.ADMIN_NOTIFY_EMAIL ?? ADMIN_EMAIL
  const adminPortalUrl = `${BASE_URL}/admin`
  const assignUrl = `${BASE_URL}/admin/translation_jobs/${jobId}/assign`
  const jobDetailUrl = `${BASE_URL}/admin/translation_jobs/${jobId}`

  // ── Translation ────────────────────────────────────────────────────────────
  if (job.job_type === 'translation') {
    await handleTranslationPostPayment(supabase, job, invoiceNumber, client, adminNotifyEmail)
    return
  }

  // ── Interpretation ─────────────────────────────────────────────────────────
  if (job.job_type === 'interpretation') {
    await handleInterpretationPostPayment(
      supabase, job, invoiceNumber, client, amount,
      adminNotifyEmail, adminPortalUrl, assignUrl,
    )
    return
  }

  // ── Notary / Equipment Rental ──────────────────────────────────────────────
  const nextStepLabel = job.job_type === 'notary'
    ? 'Schedule the notary appointment and contact the client'
    : 'Confirm equipment availability and arrange dispatch'

  try {
    const html = await renderAsync(AdminJobPaidEmail({
      jobType: job.job_type as any,
      jobId,
      invoiceNumber,
      clientName: client?.contact_name ?? 'Client',
      amount,
      adminPortalUrl,
      assignUrl: jobDetailUrl,
      nextStepLabel,
    }))

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: adminNotifyEmail,
      subject: `Payment Received — ${job.job_type === 'notary' ? 'Notary' : 'Equipment Rental'} · ${invoiceNumber}`,
      html,
    })
  } catch (e) {
    console.error('[post-payment] admin notify failed:', e)
  }
}

// ── Translation post-payment ────────────────────────────────────────────────

async function handleTranslationPostPayment(
  supabase: SupabaseClient,
  job: JobRow,
  invoiceNumber: string,
  client: { contact_name: string; email: string } | null,
  adminNotifyEmail: string,
) {
  const jobId = job.id

  if (!job.document_path) {
    // No document yet — just notify admin
    const jobDetailUrl = `${BASE_URL}/admin/translation_jobs/${jobId}`
    try {
      const html = await renderAsync(AdminJobPaidEmail({
        jobType: 'translation',
        jobId,
        invoiceNumber,
        clientName: client?.contact_name ?? 'Client',
        amount: Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0),
        sourceLang: job.source_lang ?? undefined,
        targetLang: job.target_lang ?? undefined,
        adminPortalUrl: `${BASE_URL}/admin`,
        assignUrl: jobDetailUrl,
        nextStepLabel: 'Upload the source document so AI translation can begin',
      }))
      await getResend().emails.send({
        from: FROM_EMAIL, to: adminNotifyEmail,
        subject: `Translation Payment Received (No Document Yet) — ${invoiceNumber}`,
        html,
      })
    } catch (e) { console.error('[post-payment] admin notify failed:', e) }
    return
  }

  // Queue AI translation via Inngest (runs outside the webhook lifecycle)
  await supabase.from('translation_jobs').update({ status: 'ai_translating', ai_translation_started_at: new Date().toISOString() }).eq('id', jobId)
  await supabase.from('translation_job_status_history').insert({ job_id: jobId, old_status: 'paid', new_status: 'ai_translating', note: 'AI translation queued' })

  try {
    await inngest.send({ name: 'translation/run', data: { jobId, triggeredBy: 'payment' } })
  } catch (e) {
    console.error('[post-payment] Failed to queue Inngest job:', e)
  }

  // Notify admin that translation is running (draft-ready email comes from Inngest on completion)
  try {
    const html = await renderAsync(AdminJobPaidEmail({
      jobType: 'translation',
      jobId,
      invoiceNumber,
      clientName: client?.contact_name ?? 'Client',
      amount: Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0),
      sourceLang: job.source_lang ?? undefined,
      targetLang: job.target_lang ?? undefined,
      adminPortalUrl: `${BASE_URL}/admin`,
      assignUrl: `${BASE_URL}/admin/translation_jobs/${jobId}`,
      nextStepLabel: 'AI translation is running — you will receive another email when the draft is ready',
    }))
    await getResend().emails.send({
      from: FROM_EMAIL, to: adminNotifyEmail,
      subject: `Translation Paid — AI Translation Running · ${invoiceNumber}`,
      html,
    })
  } catch (e) { console.error('[post-payment] admin notify failed:', e) }
}

// ── Interpretation post-payment ─────────────────────────────────────────────

async function handleInterpretationPostPayment(
  supabase: SupabaseClient,
  job: JobRow,
  invoiceNumber: string,
  client: { contact_name: string; email: string } | null,
  amount: number,
  adminNotifyEmail: string,
  adminPortalUrl: string,
  assignUrl: string,
) {
  const jobId = job.id
  const sourceLang = job.source_lang ?? ''
  const targetLang = job.target_lang ?? ''
  const mode = job.interpretation_mode ?? 'consecutive'
  const cert = job.interpretation_cert_required ?? 'none'

  // Find matching active interpreters
  let query = (supabase as any)
    .from('translation_translators')
    .select('id, full_name, email, translation_language_pairs, does_consecutive, does_simultaneous, court_certified, medical_certified')
    .eq('is_active', true)

  if (mode === 'simultaneous') query = query.eq('does_simultaneous', true)
  else query = query.eq('does_consecutive', true)
  if (cert === 'court') query = query.eq('court_certified', true)
  if (cert === 'medical') query = query.eq('medical_certified', true)

  const { data: allMatching } = await query
  const candidates: { id: string; full_name: string; email: string }[] = []

  for (const t of (allMatching ?? [])) {
    const pairs: string[] = t.translation_language_pairs ?? []
    // Match if they handle this pair (either direction or via English pivot)
    const directMatch = pairs.some(
      (p: string) => p === `${sourceLang}→${targetLang}` || p === `${targetLang}→${sourceLang}`,
    )
    const langMatch = pairs.some(
      (p: string) => p.includes(sourceLang) || p.includes(targetLang),
    )
    if (directMatch || langMatch) candidates.push(t)
  }

  const matchingCount = candidates.length
  const toContact = candidates.slice(0, MAX_INQUIRY_EMAILS)
  const contacted: { name: string; email: string }[] = []

  const scheduledAtFormatted = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles',
      })
    : undefined

  // Send inquiry emails to each matching interpreter
  for (const interpreter of toContact) {
    try {
      const html = await renderAsync(TranslatorInquiryEmail({
        interpreterName: interpreter.full_name,
        sourceLang,
        targetLang,
        scheduledAt: scheduledAtFormatted,
        durationMinutes: job.duration_minutes ?? undefined,
        locationType: job.location_type ?? undefined,
        locationDetails: job.location_details ?? undefined,
        interpretationMode: mode,
        certRequired: cert !== 'none' ? cert : undefined,
        adminEmail: ADMIN_EMAIL,
        adminPhone: ADMIN_PHONE,
        vendorPortalUrl: `${BASE_URL}/vendor/translation_jobs`,
      }))

      const { data: emailData, error: emailError } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: interpreter.email,
        subject: `Interpreter Availability Inquiry — ${sourceLang} → ${targetLang}${scheduledAtFormatted ? ` · ${scheduledAtFormatted.split(',')[0]}` : ''}`,
        html,
      })

      await supabase.from('translation_email_log').insert({
        job_id: jobId,
        email_type: 'interpreter_inquiry',
        recipient: interpreter.email,
        subject: `Interpreter Availability Inquiry — ${sourceLang} → ${targetLang}`,
        resend_id: emailData?.id ?? null,
        status: emailError ? 'failed' : 'sent',
        error_message: emailError ? String(emailError) : null,
      } as any)

      if (!emailError) contacted.push({ name: interpreter.full_name, email: interpreter.email })
    } catch (e) {
      console.error(`[post-payment] inquiry email failed for ${interpreter.email}:`, e)
    }
  }

  // Write inquiry outreach to status history
  if (contacted.length > 0) {
    await supabase.from('translation_job_status_history').insert({
      job_id: jobId,
      old_status: 'paid',
      new_status: 'paid',
      note: `Availability inquiry sent to ${contacted.length} interpreter${contacted.length !== 1 ? 's' : ''}: ${contacted.map((c) => c.name).join(', ')}`,
    })
  }

  // Notify admin
  try {
    const html = await renderAsync(AdminJobPaidEmail({
      jobType: 'interpretation',
      jobId,
      invoiceNumber,
      clientName: client?.contact_name ?? 'Client',
      amount,
      sourceLang: sourceLang || undefined,
      targetLang: targetLang || undefined,
      scheduledAt: scheduledAtFormatted,
      durationMinutes: job.duration_minutes ?? undefined,
      locationType: job.location_type ?? undefined,
      interpretationMode: mode,
      certRequired: cert !== 'none' ? cert : undefined,
      adminPortalUrl,
      assignUrl,
      contactedTranslators: contacted,
      matchingTranslatorCount: matchingCount,
      nextStepLabel: contacted.length > 0
        ? `${contacted.length} interpreter${contacted.length !== 1 ? 's' : ''} contacted — assign once they confirm availability`
        : 'No matching interpreters found — assign manually',
    }))

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: adminNotifyEmail,
      subject: `Interpretation Paid — ${sourceLang} → ${targetLang} · ${invoiceNumber}`,
      html,
    })
  } catch (e) {
    console.error('[post-payment] admin notify failed:', e)
  }
}
