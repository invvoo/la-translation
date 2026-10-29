'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogoImage } from '@/components/logo-image'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, AlertCircle, FileText, Languages } from 'lucide-react'

interface BidData {
  id: string
  status: 'pending' | 'interested' | 'declined' | 'assigned'
  rate_notes: string | null
  translation_translators: { full_name: string; email: string }
  translation_jobs: {
    source_lang: string
    target_lang: string
    word_count: number | null
    translation_specialty_multipliers: { name: string } | null
    document_name: string | null
  }
}

type PageState = 'loading' | 'ready' | 'submitting' | 'done_interested' | 'done_declined' | 'already_assigned' | 'error'

export default function TranslationInquiryPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const autoDecline = searchParams.get('decline') === '1'

  const [bid, setBid] = useState<BidData | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [notes, setNotes] = useState('')
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/vendor/translation-inquiry/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bid) {
          setBid(data.bid)
          if (data.bid.status === 'assigned') {
            setPageState('already_assigned')
          } else if (data.bid.status === 'interested') {
            setPageState('done_interested')
          } else if (data.bid.status === 'declined') {
            setPageState('done_declined')
          } else {
            setPageState('ready')
            if (autoDecline) setShowDeclineConfirm(true)
          }
        } else {
          setPageState('error')
        }
      })
      .catch(() => setPageState('error'))
  }, [token, autoDecline])

  async function submit(action: 'interested' | 'declined') {
    setPageState('submitting')
    const res = await fetch(`/api/vendor/translation-inquiry/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: notes || undefined }),
    })
    const data = await res.json()
    if (res.status === 409 && data.error === 'already_assigned') {
      setPageState('already_assigned')
    } else if (res.ok) {
      setPageState(action === 'interested' ? 'done_interested' : 'done_declined')
    } else {
      setPageState('error')
    }
  }

  const job = bid?.translation_jobs

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

  if (pageState === 'already_assigned') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Job Already Assigned</h1>
          <p className="text-gray-500 text-sm">This job has already been assigned to another translator. Thank you for your interest!</p>
          <p className="text-sm text-gray-400 mt-4">Questions? Call <a href="tel:2133857781" className="text-blue-600">(213) 385-7781</a></p>
        </div>
      </div>
    )
  }

  if (pageState === 'done_interested') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Availability Confirmed!</h1>
          <p className="text-gray-500 text-sm mb-4">
            Thank you, {bid?.translation_translators?.full_name}. We have noted your availability and will be in touch shortly if you are selected for this job.
          </p>
          <p className="text-sm text-gray-400 mt-4">Questions? Call <a href="tel:2133857781" className="text-blue-600">(213) 385-7781</a></p>
        </div>
      </div>
    )
  }

  if (pageState === 'done_declined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Response Recorded</h1>
          <p className="text-gray-500 text-sm">Thank you for letting us know. We hope to work with you on a future job!</p>
          <p className="text-sm text-gray-400 mt-4">Questions? Call <a href="tel:2133857781" className="text-blue-600">(213) 385-7781</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoImage className="h-10 w-auto mx-auto mb-3" />
          </Link>
          <p className="text-gray-500 text-sm">L.A. Translation &amp; Interpretation</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
          <h1 className="text-xl font-bold text-[#1a1a2e] mb-1">Translation Job Inquiry</h1>
          <p className="text-gray-500 text-sm mb-5">
            Hi {bid?.translation_translators?.full_name}, please review the job details below and let us know if you&apos;re available.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6 text-sm">
            <div className="flex items-start gap-2.5">
              <Languages className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Language Pair</p>
                <p className="font-semibold">{job?.source_lang} → {job?.target_lang}</p>
              </div>
            </div>
            {job?.word_count && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Word Count</p>
                  <p className="font-semibold">{job.word_count.toLocaleString()} words</p>
                </div>
              </div>
            )}
            {job?.translation_specialty_multipliers?.name && (
              <div className="flex items-start gap-2.5">
                <div className="h-4 w-4 mt-0.5 shrink-0 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">📋</span>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Specialty</p>
                  <p className="font-medium">{job.translation_specialty_multipliers.name}</p>
                </div>
              </div>
            )}
            {job?.document_name && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Document</p>
                  <p className="font-medium">{job.document_name}</p>
                </div>
              </div>
            )}
          </div>

          {!showDeclineConfirm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] resize-none"
                  placeholder="Any questions or additional information…"
                />
              </div>

              <Button
                onClick={() => submit('interested')}
                disabled={pageState === 'submitting'}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {pageState === 'submitting'
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" /> Yes, I&apos;m Available</>}
              </Button>

              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                className="w-full text-sm text-gray-400 hover:text-red-500 transition-colors py-1"
              >
                I&apos;m not available for this job
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                <p className="font-medium">Confirm you are not available?</p>
                <p className="text-xs text-red-600 mt-1">We&apos;ll remove you from consideration for this job.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDeclineConfirm(false)} className="flex-1">
                  Go Back
                </Button>
                <Button
                  onClick={() => submit('declined')}
                  disabled={pageState === 'submitting'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {pageState === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Not Available'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Questions? Call <a href="tel:2133857781" className="text-[#1a1a2e] underline">(213) 385-7781</a> or email{' '}
          <a href="mailto:info@latranslation.com" className="text-[#1a1a2e] underline">info@latranslation.com</a>
        </p>
      </div>
    </div>
  )
}
