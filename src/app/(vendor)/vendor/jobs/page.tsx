'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { LogOut, ChevronRight, FileText, AlertCircle, Clock, Clock3, Sparkles, X, Upload, Send, CreditCard, CheckCircle2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const TUTORIAL_KEY = 'vendor_tutorial_v1_seen'

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to your Vendor Portal',
    body: "This is where you'll see every job assigned to you. Click any job card to open it and get started.",
    visual: (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
        <div className="bg-white rounded-lg border border-blue-200 p-3 flex items-center justify-between">
          <div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Assigned</span>
            <p className="font-medium text-gray-900 mt-1">Spanish → English</p>
            <p className="text-xs text-gray-400">1,240 words · Due Jan 15</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between opacity-50">
          <div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Complete</span>
            <p className="font-medium text-gray-900 mt-1">French → English</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    ),
  },
  {
    title: 'Download your documents',
    body: "Inside a job you'll find the original document (and an AI draft if it's a translation). Download them to start working.",
    visual: (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white text-sm">
          <FileText className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">contract_original.pdf</p>
            <p className="text-xs text-gray-400">Source file to translate</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">↓ Download</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 bg-purple-50 text-sm">
          <FileText className="h-5 w-5 text-purple-400" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">AI Draft</p>
            <p className="text-xs text-gray-400">AI-generated first draft — review and refine</p>
          </div>
          <span className="text-xs text-purple-600 font-medium">↓ Download</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Submit your completed work',
    body: 'When you\'re done, upload your finished file with one click. Your coordinator reviews it before it goes to the client.',
    visual: (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-white">
          <Upload className="h-7 w-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Click to upload completed translation</p>
          <p className="text-xs text-gray-400 mt-0.5">.docx · .pdf · .txt</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Translation submitted — coordinator will review shortly.
        </div>
      </div>
    ),
  },
  {
    title: 'Submit your invoice & get paid',
    body: 'Enter your amount and hit Submit — that\'s it. Payment is processed within 30 days of approval, direct to your bank.',
    visual: (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <span className="text-gray-400 text-sm mr-1">$</span>
            <span className="text-sm font-mono font-semibold text-gray-900">99.20</span>
            <span className="text-xs text-gray-400 ml-auto">1,240 × $0.08</span>
          </div>
          <div className="bg-[#1a1a2e] text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Send className="h-3.5 w-3.5" /> Submit Invoice
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Payment status</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Approved</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-green-500 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
            <CreditCard className="h-3.5 w-3.5" /> Direct deposit · net 30 days
          </div>
        </div>
      </div>
    ),
  },
]

function TutorialModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const total = TUTORIAL_STEPS.length
  const current = TUTORIAL_STEPS[step]
  const isLast = step === total - 1

  function finish() {
    if (typeof window !== 'undefined') localStorage.setItem(TUTORIAL_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#1a1a2e] transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Step {step + 1} of {total}</p>
              <h2 className="text-lg font-bold text-[#1a1a2e]">{current.title}</h2>
            </div>
            <button onClick={finish} className="text-gray-400 hover:text-gray-600 shrink-0 ml-4">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{current.body}</p>

          <div className="mb-6">{current.visual}</div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0"
            >
              ← Back
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-[#1a1a2e]' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
            {isLast ? (
              <button
                onClick={finish}
                className="text-sm font-semibold text-white bg-[#1a1a2e] px-5 py-2 rounded-lg hover:bg-[#2a2a4e] transition-colors"
              >
                Got it!
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="text-sm font-semibold text-[#1a1a2e] hover:underline"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  complete: 'bg-gray-100 text-gray-500',
  ai_review_pending: 'bg-purple-100 text-purple-700',
}

interface Job {
  id: string; job_type: string; status: string; source_lang: string | null
  target_lang: string | null; word_count: number | null; invoice_number: string | null
  deadline_at: string | null; assigned_at: string | null; created_at: string
  translation_clients: { contact_name: string } | null
}

export default function VendorJobsPage() {
  const router = useRouter()
  const [translation_jobs, setJobs] = useState<Job[]>([])
  const [translatorName, setTranslatorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(TUTORIAL_KEY)) {
      setShowTutorial(true)
    }
  }, [])

  useEffect(() => {
    fetch('/api/vendor/translation_jobs')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) {
          if (d.error === 'no_account') {
            router.replace('/vendor/signup')
            return
          }
          setErrorCode(d.error ?? null)
          setError(d.message ?? 'Failed to load')
          return
        }
        setJobs(d.translation_jobs ?? [])
        setTranslatorName(d.translator?.full_name ?? '')
      })
      .finally(() => setLoading(false))
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/vendor/login')
    router.refresh()
  }

  const active = translation_jobs.filter((j) => !['delivered', 'complete'].includes(j.status))
  const past = translation_jobs.filter((j) => ['delivered', 'complete'].includes(j.status))

  return (
    <div className="min-h-screen bg-gray-50">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-[#1a1a2e] text-sm">Vendor Portal</p>
            {translatorName && <p className="text-xs text-gray-500">{translatorName}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/vendor/profile" className="flex items-center gap-1 text-xs text-gray-600 font-medium hover:text-gray-900">
              My Profile
            </Link>
            <Link href="/vendor/benefits" className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
              <Sparkles className="h-3 w-3" /> Benefits
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && errorCode === 'pending_approval' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4 mb-6">
            <Clock3 className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Application Pending Review</p>
              <p className="text-sm text-amber-700">
                Your vendor application has been received and is being reviewed by our team.
                We will contact you once your account is approved.
              </p>
            </div>
          </div>
        )}
        {error && errorCode === 'no_account' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-start gap-4 mb-6">
            <AlertCircle className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">No vendor account found</p>
              <p className="text-sm text-gray-600 mb-3">
                There is no vendor profile linked to this email address.
                If you&apos;d like to work with us, please submit an application.
              </p>
              <Link href="/vendor/signup" className="text-sm font-medium text-[#1a1a2e] underline">
                Apply to join our network →
              </Link>
            </div>
          </div>
        )}
        {error && errorCode !== 'pending_approval' && errorCode !== 'no_account' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!error && (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-[#1a1a2e]">Assigned Jobs</h1>
            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1a1a2e] transition-colors"
            >
              <Sparkles className="h-3 w-3" /> How it works
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-xl border p-6 animate-pulse h-24" />)}
          </div>
        )}

        {!loading && translation_jobs.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No translation_jobs assigned yet.</p>
          </div>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active</h2>
            <div className="space-y-3">
              {active.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed</h2>
            <div className="space-y-3">
              {past.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const langLabel = job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : null
  const deadline = job.deadline_at ? new Date(job.deadline_at) : null
  const isOverdue = deadline && deadline < new Date() && !['delivered', 'complete'].includes(job.status)

  return (
    <Link href={`/vendor/translation_jobs/${job.id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500')}>
              {job.status.replace('_', ' ')}
            </span>
            {job.invoice_number && <span className="text-xs text-gray-400 font-mono">{job.invoice_number}</span>}
          </div>
          {langLabel && <p className="text-sm font-medium text-gray-900">{langLabel}</p>}
          {job.word_count && <p className="text-xs text-gray-500 mt-0.5">{job.word_count.toLocaleString()} words</p>}
        </div>
        <div className="flex items-center gap-2">
          {deadline && (
            <div className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-red-600' : 'text-gray-400')}>
              <Clock className="h-3 w-3" />
              {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>
    </Link>
  )
}
