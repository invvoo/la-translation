import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email(),
  jobId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
})

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? ''

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? (process.env.NEXT_PUBLIC_APP_URL ?? '')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 })

  const { email, jobId, message } = parsed.data

  if (!ADMIN_EMAIL) return NextResponse.json({ ok: true }) // silently succeed if not configured

  // Optionally look up job context for the admin email
  let jobContext = ''
  if (jobId) {
    const supabase = createServiceClient()
    const { data: job } = await supabase
      .from('translation_jobs')
      .select('id, job_type, source_lang, target_lang, translation_clients(contact_name)')
      .eq('id', jobId)
      .maybeSingle() as unknown as { data: Record<string, any> | null }

    if (job) {
      const label = job.source_lang && job.target_lang
        ? `${job.source_lang} → ${job.target_lang} (${job.job_type})`
        : job.job_type
      const clientName = (job.translation_clients as any)?.contact_name ?? ''
      const adminLink = `${origin}/admin/translation_jobs/${job.id}`
      jobContext = `
        <p><strong>Job:</strong> <a href="${adminLink}">${adminLink}</a></p>
        <p><strong>Service:</strong> ${label}</p>
        <p><strong>Client:</strong> ${clientName}</p>
      `
    }
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a1a2e">New Quote Request</h2>
      <p>A client has requested a new quote via the expired quote page.</p>
      <p><strong>Email:</strong> ${email}</p>
      ${jobContext}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <hr style="border-color:#eee;margin:24px 0"/>
      <p style="color:#888;font-size:13px">L.A. Translation &amp; Interpretation — Admin Notification</p>
    </div>
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `Quote Re-Request — ${email}`,
    html,
  })

  return NextResponse.json({ ok: true })
}
