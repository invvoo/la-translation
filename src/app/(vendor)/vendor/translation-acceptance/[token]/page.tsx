'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LogoImage } from '@/components/logo-image'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle, FileText, Clock, Languages } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface JobData {
  id: string
  status: string
  source_lang: string | null
  target_lang: string | null
  word_count: number | null
  deadline_at: string | null
  invoice_number: string | null
  vendor_confirmed_rate: number | null
  vendor_accepted_at: string | null
  translation_translators: { full_name: string; email: string; per_word_rate: number | null } | null
}

type PageState = 'loading' | 'ready' | 'submitting' | 'done' | 'already_accepted' | 'error'

export default function TranslationAcceptancePage() {
  const { token } = useParams<{ token: string }>()
  const [job, setJob] = useState<JobData | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmedRate, setConfirmedRate] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/vendor/translation-acceptance/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.job) {
          setJob(data.job)
          if (data.job.vendor_accepted_at) {
            setPageState('already_accepted')
            setConfirmedRate(data.job.vendor_confirmed_rate)
          } else {
            // Pre-fill with existing confirmed rate, or translator's base per-word rate × word count
            const translator = data.job.translation_translators
            const baseRate = data.job.vendor_confirmed_rate
              ?? (translator?.per_word_rate != null && data.job.word_count
                ? +(translator.per_word_rate * data.job.word_count).toFixed(2)
                : translator?.per_word_rate ?? null)
            if (baseRate != null) setRate(String(baseRate))
            setPageState('ready')
          }
        } else {
          setPageState('error')
        }
      })
      .catch(() => setPageState('error'))
  }, [token])

  async function submit() {
    const amount = parseFloat(rate)
    if (isNaN(amount) || amount <= 0) return
    setPageState('submitting')
    const res = await fetch(`/api/vendor/translation-acceptance/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: amount, notes: notes || undefined }),
    })
    const data = await res.json()
    if (res.status === 409 && data.error === 'already_accepted') {
      setPageState('already_accepted')
    } else if (res.ok) {
      setConfirmedRate(amount)
      setPageState('done')
    } else {
      setPageState('error')
    }
  }

  const translator = job?.translation_translators
  const deadline = job?.deadline_at ? new Date(job.deadline_at) : null

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-500 text-sm">This link may have expired or is invalid. Contact us at (213) 385-7781.</p>
        </div>
      </div>
    )
  }

  if (pageState === 'already_accepted' || pageState === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Job Accepted</h1>
          <p className="text-gray-500 text-sm mb-4">
            {pageState === 'done' ? `Thank you, ${translator?.full_name}. Your acceptance has been recorded.` : 'You have already accepted this job.'}
          </p>
          {(confirmedRate ?? job?.vendor_confirmed_rate) != null && (
            <p className="text-sm font-medium text-gray-700 mb-4">
              Confirmed rate: <span className="text-green-700">{formatCurrency(confirmedRate ?? job!.vendor_confirmed_rate!)}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">Your invoice will be pre-filled with this amount when you submit after completing the work.</p>
          <Link href="/vendor/translation_jobs">
            <Button className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e]">Go to Vendor Portal</Button>
          </Link>
          <p className="text-sm text-gray-400 mt-4">Questions? Call <a href="tel:2133857781" className="text-blue-600">(213) 385-7781</a></p>
        </div>
      </div>
    )
  }

  const langLabel = job?.source_lang && job?.target_lang ? `${job.source_lang} → ${job.target_lang}` : 'Translation'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoImage className="h-10 w-auto mx-auto mb-3" />
          </Link>
          <p className="text-gray-500 text-sm">L.A. Translation &amp; Interpretation</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-xl font-bold text-[#1a1a2e] mb-1">Accept Translation Job</h1>
          <p className="text-gray-500 text-sm mb-5">
            Hi {translator?.full_name}, please review the details and confirm your rate before starting work.
            Your confirmed rate will be locked in as your invoice amount.
          </p>

          {/* Job details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6 text-sm">
            <div className="flex items-start gap-2.5">
              <Languages className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Language Pair</p>
                <p className="font-semibold">{langLabel}</p>
              </div>
            </div>
            {job?.word_count && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Word Count</p>
                  <p className="font-medium">{job.word_count.toLocaleString()} words</p>
                  {translator?.per_word_rate != null && (
                    <p className="text-xs text-gray-400">Base rate: ${Number(translator.per_word_rate).toFixed(4)}/word</p>
                  )}
                </div>
              </div>
            )}
            {job?.invoice_number && (
              <div className="flex items-start gap-2.5">
                <div className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Reference</p>
                  <p className="font-mono text-sm">{job.invoice_number}</p>
                </div>
              </div>
            )}
            {deadline && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Deadline</p>
                  <p className="font-semibold text-amber-700">
                    {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rate confirmation */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Rate for This Job (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min="0.01" step="0.01" required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]"
                  placeholder="e.g. 80.00"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Pre-filled from your base rate × word count. You may adjust before confirming.
                This amount will be your invoice — it cannot be changed after acceptance.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] resize-none"
                placeholder="Any questions or special requirements…"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              By clicking Accept, you are confirming your availability and agreeing to complete this translation at the rate above.
              This rate will be used as your invoice amount.
            </div>

            <Button
              onClick={submit}
              disabled={pageState === 'submitting' || !rate}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {pageState === 'submitting'
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming…</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" /> Accept Job &amp; Confirm Rate</>}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions? Call <a href="tel:2133857781" className="text-[#1a1a2e] underline">(213) 385-7781</a> or email{' '}
          <a href="mailto:info@latranslation.com" className="text-[#1a1a2e] underline">info@latranslation.com</a>
        </p>
      </div>
    </div>
  )
}
