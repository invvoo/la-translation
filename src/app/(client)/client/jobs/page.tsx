'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { JobProgressBar } from '@/components/job-progress-bar'
import { formatCurrency } from '@/lib/utils'
import { LogOut, ChevronRight, FileText, Headphones, Package, Stamp, AlertCircle } from 'lucide-react'
import { LogoImage } from '@/components/logo-image'

const JOB_TYPE_ICONS: Record<string, React.ReactNode> = {
  translation: <FileText className="h-4 w-4" />,
  interpretation: <Headphones className="h-4 w-4" />,
  equipment_rental: <Package className="h-4 w-4" />,
  notary: <Stamp className="h-4 w-4" />,
}

const JOB_TYPE_LABELS: Record<string, string> = {
  translation: 'Translation',
  interpretation: 'Interpretation',
  equipment_rental: 'Equipment Rental',
  notary: 'Notary / Apostille',
}

interface Job {
  id: string; job_type: string; status: string; source_lang: string | null
  target_lang: string | null; word_count: number | null; quote_amount: number | null
  quote_adjusted_amount: number | null; discount_amount: number | null
  display_amount: number; invoice_number: string | null
  created_at: string; scheduled_at: string | null; delivered_at: string | null
}

export default function ClientJobsPage() {
  const router = useRouter()
  const [translation_jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
    fetch('/api/client/translation_jobs')
      .then((r) => r.json())
      .then((d) => setJobs(d.translation_jobs ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/client/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoImage className="h-7 w-auto" />
            <span className="font-bold text-[#1a1a2e] text-sm">L.A. Translation</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{userEmail}</span>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-[#1a1a2e] mb-6">My Orders</h1>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && translation_jobs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No orders found for this account.</p>
            <p className="text-gray-400 text-xs mt-1">
              If you recently submitted a request, it may be under a different email address.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/translation" className="text-sm text-[#1a1a2e] underline">Request a translation</Link>
              <Link href="/interpretation" className="text-sm text-[#1a1a2e] underline">Request an interpreter</Link>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {translation_jobs.map((job) => {
            const amount = job.display_amount ?? Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0)
            const label = JOB_TYPE_LABELS[job.job_type] ?? job.job_type
            const langLabel = job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : null
            const date = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            return (
              <Link key={job.id} href={`/client/translation_jobs/${job.id}`}
                className={`block rounded-xl border p-6 hover:shadow-sm transition-all group ${job.status === 'quote_sent' ? 'bg-blue-50 border-blue-200 hover:border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{JOB_TYPE_ICONS[job.job_type]}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{label}</p>
                      {langLabel && <p className="text-xs text-gray-500">{langLabel}</p>}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {job.status === 'quote_sent' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" /> Action Required
                      </span>
                    )}
                    {amount > 0 && <span className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(amount)}</span>}
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>

                <JobProgressBar jobType={job.job_type} status={job.status} />

                <p className="text-xs text-gray-400 mt-4">
                  Submitted {date}
                  {job.invoice_number && <> · {job.invoice_number}</>}
                </p>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
