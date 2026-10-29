import { render } from '@react-email/components'
import { getResend, FROM_EMAIL } from './client'
import { NewInquiryEmail, type NewInquiryEmailProps } from './templates/new-inquiry'

const ADMIN_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? ''

const JOB_TYPE_LABELS: Record<string, string> = {
  translation: 'Translation',
  interpretation: 'Interpretation',
  equipment_rental: 'Equipment Rental',
  notary: 'Notary / Apostille',
  transcription: 'Transcription / Subtitling',
}

export async function notifyAdmin({ subject, jobId, message }: { subject: string; jobId?: string; message: string }) {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return
  const adminJobUrl = jobId ? `${ADMIN_URL}/admin/translation_jobs/${jobId}` : ADMIN_URL
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject,
    html: `<p>${message}</p>${jobId ? `<p><a href="${adminJobUrl}">View in admin portal →</a></p>` : ''}`,
  })
}

export async function notifyAdminNewInquiry(props: Omit<NewInquiryEmailProps, 'adminUrl'>) {
  if (!ADMIN_EMAIL) {
    console.error('[notify-admin] ADMIN_NOTIFY_EMAIL env var is not set — skipping admin notification')
    return
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[notify-admin] RESEND_API_KEY env var is not set — skipping admin notification')
    return
  }

  console.log('[notify-admin] Sending to', ADMIN_EMAIL, '| job:', props.jobId)
  const html = await render(NewInquiryEmail({ ...props, adminUrl: ADMIN_URL }))
  const typeLabel = JOB_TYPE_LABELS[props.jobType] ?? props.jobType

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New ${typeLabel} Inquiry — ${props.clientName}`,
    html,
  })

  if (error) {
    console.error('[notify-admin] Resend error:', JSON.stringify(error))
    throw error
  }
  console.log('[notify-admin] Sent to', ADMIN_EMAIL, 'id:', data?.id)
}
