import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/tokens'
import { autoClaimJob } from '@/lib/admin/auto-claim'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { QuoteReadyEmail } from '@/lib/email/templates/quote-ready'
import { render as renderAsync } from '@react-email/components'
import { addDays, format } from 'date-fns'

interface Props {
  params: Promise<{ jobId: string }>
}

// PATCH — adjust quote amount
export async function PATCH(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({
    adjustedAmount: z.number().positive(),
    note: z.string().optional(),
    wordCount: z.number().int().min(0).optional(),
    perWordRate: z.number().positive().optional(),
    discountAmount: z.number().min(0).optional(),
    discountLabel: z.string().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { adjustedAmount, note, wordCount, perWordRate, discountAmount, discountLabel } = parsed.data

  const service = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    quote_adjusted_amount: adjustedAmount,
    employee_notes: note ?? null,
    ...(wordCount != null && wordCount > 0 ? { word_count: wordCount } : {}),
    ...(perWordRate != null ? { quote_per_word_rate: perWordRate } : {}),
    ...(discountAmount != null ? { discount_amount: discountAmount } : {}),
    ...(discountLabel != null ? { discount_label: discountLabel } : {}),
  }

  let { error } = await service.from('translation_jobs').update(updatePayload as any).eq('id', jobId)

  // If discount columns don't exist yet (migration 0015 pending), retry without them
  if (error?.message?.includes('discount_')) {
    const { discount_amount: _da, discount_label: _dl, ...withoutDiscount } = updatePayload
    ;({ error } = await service.from('translation_jobs').update(withoutDiscount as any).eq('id', jobId))
  }

  if (error) {
    console.error('[quote/patch]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await autoClaimJob(service, jobId, user.id)

  return NextResponse.json({ ok: true })
}

// POST — send quote to client
export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-proto')?.split(',')[0].trim() + '://' + req.headers.get('host')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const service = createServiceClient()
    const { data: job } = await (service as any)
      .from('translation_jobs')
      .select('id, job_type, status, source_lang, target_lang, quote_amount, quote_adjusted_amount, discount_amount, discount_label, translation_clients(contact_name, email)')
      .eq('id', jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const expiryDays = 7
    const expiresAt = addDays(new Date(), expiryDays)
    const token = await signToken({ jobId, type: 'quote' }, `${expiryDays}d`)
    const amount = Number(job.quote_adjusted_amount ?? job.quote_amount)
    const client = job.translation_clients as any

    await service.from('translation_jobs').update({
      status: 'quote_sent',
      quote_token: token,
      quote_token_expires_at: expiresAt.toISOString(),
      quote_finalized_at: new Date().toISOString(),
    }).eq('id', jobId)

    await service.from('translation_job_status_history').insert({
      job_id: jobId,
      old_status: job.status,
      new_status: 'quote_sent',
      changed_by: user.id,
    })

    const baseUrl = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
    const discountAmt = (job as any).discount_amount != null ? Number((job as any).discount_amount) : undefined
    const html = await renderAsync(QuoteReadyEmail({
      clientName: client.contact_name,
      jobType: job.job_type,
      sourceLang: job.source_lang ?? undefined,
      targetLang: job.target_lang ?? undefined,
      quoteAmount: amount,
      discountAmount: discountAmt && discountAmt > 0 ? discountAmt : undefined,
      discountLabel: (job as any).discount_label ?? undefined,
      quoteUrl: `${baseUrl}/quote/${token}`,
      expiresAt: format(expiresAt, 'MMMM d, yyyy'),
    }))

    const subject = `Your Quote from LA Translation — $${amount.toFixed(2)}`
    const { data: emailData, error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: client.email,
      subject,
      html,
    })

    if (emailError) {
      console.error('[quote/send] Resend error:', emailError)
    }

    await service.from('translation_email_log').insert({
      job_id: jobId,
      email_type: 'quote_sent',
      recipient: client.email,
      subject,
      resend_id: emailData?.id ?? null,
      status: emailError ? 'failed' : 'sent',
      error_message: emailError ? String(emailError) : null,
    })

    if (emailError) {
      return NextResponse.json({ error: 'Quote saved but email failed to send. Check Vercel logs.' }, { status: 500 })
    }

    await autoClaimJob(service, jobId, user.id)

    return NextResponse.json({ ok: true, token })
  } catch (err) {
    console.error('[quote/send] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
