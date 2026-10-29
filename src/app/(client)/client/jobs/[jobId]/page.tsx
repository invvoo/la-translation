'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { JobProgressBar } from '@/components/job-progress-bar'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Download, Loader2, CheckCircle, CreditCard, Clock, AlertCircle, Package, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface JobDetail {
  id: string
  job_type: string
  status: string
  source_lang: string | null
  target_lang: string | null
  word_count: number | null
  quote_amount: number | null
  quote_adjusted_amount: number | null
  quote_per_word_rate: number | null
  quote_multiplier: number | null
  quote_is_pivot: boolean | null
  quote_rush_days: number | null
  quote_rush_fee_percent: number | null
  quote_rush_amount: number | null
  certification_type: string | null
  mailing_option: string | null
  mailing_amount: number | null
  mailing_fedex_overnight: boolean
  invoice_number: string | null
  created_at: string
  scheduled_at: string | null
  delivered_at: string | null
  estimated_turnaround_days: number | null
  requested_delivery_date: string | null
  document_name: string | null
  delivery_token: string | null
  missing_pricing_warning: string | null
  discount_amount: number | null
  discount_label: string | null
}

const CERT_LABELS: Record<string, string> = {
  none: 'Standard',
  general: 'Certified (USCIS)',
  court: 'Court-Certified',
}

const MAILING_LABELS: Record<string, string> = {
  standard: 'Standard Mail (USPS)',
  hard_copy: 'Hard Copy + Certification & Notary',
}

export default function ClientJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const searchParams = useSearchParams()
  const justPaid = searchParams.get('paid') === '1'

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  async function fetchJob(userEmail: string) {
    const res = await fetch(`/api/client/translation_jobs/${jobId}`)
    if (!res.ok) { setUnauthorized(true); setLoading(false); return null }
    const data = await res.json()
    setJob(data.job)
    setLoading(false)
    return data.job as JobDetail
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user?.email) { setUnauthorized(true); setLoading(false); return }
      const email = user.email
      const loaded = await fetchJob(email)

      // When returning from Stripe, poll until the webhook updates the status
      if (justPaid && loaded && ['quote_sent', 'quote_accepted'].includes(loaded.status)) {
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          const refreshed = await fetchJob(email)
          if (!refreshed || !['quote_sent', 'quote_accepted'].includes(refreshed.status) || attempts >= 8) {
            clearInterval(interval)
          }
        }, 2500)
        return () => clearInterval(interval)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  async function handleAcceptQuote() {
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await fetch(`/api/client/translation_jobs/${jobId}/accept`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setAcceptError(data.error ?? 'Something went wrong. Please try again or call (213) 385-7781.')
    } catch {
      setAcceptError('Network error. Please try again or call (213) 385-7781.')
    }
    setAccepting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
    </div>
  )

  if (unauthorized || !job) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Order not found or you don&apos;t have access.</p>
        <Link href="/client/translation_jobs" className="text-[#1a1a2e] underline text-sm">Back to my orders</Link>
      </div>
    </div>
  )

  const baseAmount = Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0)
  const discountAmount = job.discount_amount != null ? Number(job.discount_amount) : 0
  const displayAmount = Math.max(0, baseAmount - discountAmount)
  const langLabel = job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : null
  const reference = job.invoice_number ?? job.id.slice(0, 8).toUpperCase()
  // When returning from Stripe, treat the status as 'paid' for display until the webhook catches up
  const displayStatus = (justPaid && ['quote_sent', 'quote_accepted'].includes(job.status)) ? 'paid' : job.status
  const isQuotePending = job.status === 'quote_sent' && !justPaid
  const isAwaitingPayment = job.status === 'quote_accepted' && !justPaid

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/client/translation_jobs" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-[#1a1a2e]">Order {reference}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Payment confirmed banner */}
        {justPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Payment Confirmed</p>
              <p className="text-sm text-green-700 mt-0.5">
                Thank you — we&apos;ve received your payment and will begin processing your order right away.
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Order Status</h2>
          <JobProgressBar jobType={job.job_type} status={displayStatus} />
        </div>

        {/* Quote acceptance card */}
        {(isQuotePending || isAwaitingPayment) && displayAmount > 0 && (
          <div className={`rounded-xl border p-6 ${isQuotePending ? 'bg-white border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className={`h-5 w-5 ${isQuotePending ? 'text-blue-600' : 'text-amber-600'}`} />
              <h2 className={`font-semibold ${isQuotePending ? 'text-blue-900' : 'text-amber-900'}`}>
                {isQuotePending ? 'Your Quote is Ready' : 'Payment Required to Begin Work'}
              </h2>
            </div>

            {/* Quote breakdown */}
            {job.missing_pricing_warning ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Our team is preparing a custom quote for this language pair. You&apos;ll receive it by email shortly.
              </div>
            ) : (
              <div className="space-y-2 text-sm mb-5">
                {langLabel && (
                  <div className="flex justify-between text-gray-700">
                    <span>Translation ({langLabel})</span>
                    {job.word_count && job.quote_per_word_rate ? (
                      <span>{job.word_count.toLocaleString()} words × {formatCurrency(Number(job.quote_per_word_rate))}</span>
                    ) : null}
                  </div>
                )}
                {job.certification_type && job.certification_type !== 'none' && (
                  <div className="flex justify-between text-gray-500 text-xs pl-3">
                    <span>Certification: {CERT_LABELS[job.certification_type] ?? job.certification_type}</span>
                    {job.quote_multiplier && Number(job.quote_multiplier) !== 1 ? (
                      <span>×{Number(job.quote_multiplier).toFixed(2)} specialty</span>
                    ) : null}
                  </div>
                )}
                {(job.quote_rush_days ?? 0) > 0 && (
                  <div className="flex justify-between text-orange-700 text-xs pl-3">
                    <span>Rush delivery ({job.quote_rush_days}d) · {job.quote_rush_fee_percent}%</span>
                    {job.quote_rush_amount ? <span>+{formatCurrency(Number(job.quote_rush_amount))}</span> : null}
                  </div>
                )}
                {job.mailing_option && (
                  <div className="flex justify-between text-gray-600 text-xs pl-3">
                    <span className="flex items-center gap-1">
                      {job.mailing_option === 'hard_copy' ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                      {MAILING_LABELS[job.mailing_option] ?? job.mailing_option}
                      {job.mailing_fedex_overnight ? ' + FedEx Overnight' : ''}
                    </span>
                    {job.mailing_amount ? <span>+{formatCurrency(Number(job.mailing_amount))}</span> : null}
                  </div>
                )}
                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-gray-700 text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(baseAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 text-sm">
                      <span>{job.discount_label || 'Discount'}</span>
                      <span>−{formatCurrency(discountAmount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-[#1a1a2e] border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(displayAmount)}</span>
                </div>
              </div>
            )}

            {/* Accept / Pay button */}
            {!job.missing_pricing_warning && (
              <>
                <Button
                  className={`w-full ${isQuotePending ? 'bg-[#1a1a2e] hover:bg-[#2a2a4e]' : 'bg-amber-600 hover:bg-amber-700'}`}
                  size="lg"
                  onClick={handleAcceptQuote}
                  disabled={accepting}
                >
                  {accepting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to payment…</>
                    : isQuotePending
                      ? `Accept Quote & Pay ${formatCurrency(displayAmount)}`
                      : `Complete Payment ${formatCurrency(displayAmount)}`
                  }
                </Button>
                {acceptError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {acceptError}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Secure payment via Stripe. You won&apos;t be charged until you complete checkout.
                </p>
              </>
            )}
          </div>
        )}

        {/* In-progress message */}
        {(['paid', 'ai_translating', 'ai_review_pending', 'assigned', 'in_progress'].includes(job.status) || (justPaid && job.status === 'quote_accepted')) && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                {(['paid', 'quote_accepted'].includes(job.status)
                  ? 'Payment Confirmed — Starting Work'
                  : 'Translation In Progress')}
              </p>
              <p className="text-sm text-blue-700 mt-0.5">
                {(['paid', 'quote_accepted'].includes(job.status)
                  ? "Your payment is confirmed and our team is working on your document."
                  : 'Our team is translating your document. We will notify you when it is ready.')}
              </p>
              {job.estimated_turnaround_days && (
                <p className="text-xs text-blue-600 mt-1">
                  Estimated turnaround: {job.estimated_turnaround_days} business day{job.estimated_turnaround_days !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Delivered — download */}
        {(job.status === 'delivered' || job.status === 'complete') && job.delivery_token && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-green-800 text-sm">Your document is ready</p>
              <p className="text-xs text-green-600 mt-0.5">Download your completed translation below</p>
            </div>
            <a
              href={`/delivery/${job.delivery_token}`}
              className="flex items-center gap-1.5 bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-800 transition-colors shrink-0"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Reference</dt><dd className="font-mono text-xs">{reference}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Service</dt><dd className="capitalize">{(job.job_type as string).replace('_', ' ')}</dd></div>
            {langLabel && <div className="flex justify-between"><dt className="text-gray-500">Languages</dt><dd>{langLabel}</dd></div>}
            {job.certification_type && job.certification_type !== 'none' && (
              <div className="flex justify-between"><dt className="text-gray-500">Certification</dt><dd>{CERT_LABELS[job.certification_type] ?? job.certification_type}</dd></div>
            )}
            {job.word_count ? <div className="flex justify-between"><dt className="text-gray-500">Word count</dt><dd>{job.word_count.toLocaleString()} words</dd></div> : null}
            {job.estimated_turnaround_days ? <div className="flex justify-between"><dt className="text-gray-500">Turnaround</dt><dd>{job.estimated_turnaround_days} business days</dd></div> : null}
            {job.requested_delivery_date && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Requested by</dt>
                <dd>{new Date(job.requested_delivery_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
              </div>
            )}
            {job.scheduled_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Scheduled</dt>
                <dd>{new Date(job.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
            )}
            {job.mailing_option && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Delivery</dt>
                <dd>{MAILING_LABELS[job.mailing_option] ?? job.mailing_option}{job.mailing_fedex_overnight ? ' + FedEx Overnight' : ''}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Submitted</dt>
              <dd>{new Date(job.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
            </div>
            {displayAmount > 0 && (
              <div className="flex justify-between border-t border-gray-100 pt-2.5 mt-1">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-bold text-[#1a1a2e]">{formatCurrency(displayAmount)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Help */}
        <div className="text-center text-xs text-gray-400 pt-2 pb-8">
          Questions? Call <a href="tel:2133857781" className="text-[#1a1a2e] font-medium">(213) 385-7781</a> or email{' '}
          <a href="mailto:info@latranslation.com" className="text-[#1a1a2e]">info@latranslation.com</a>
        </div>
      </main>
    </div>
  )
}
