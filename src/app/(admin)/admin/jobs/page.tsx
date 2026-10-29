import { createClient } from '@/lib/supabase/server'
import { JOB_TYPES, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { JobActionsDropdown } from '@/components/admin/job-actions-dropdown'
import { HandlerBadge } from '@/components/admin/handler-badge'
import { getHandlerColor } from '@/lib/handler-colors'
import { JobSearchInput } from '@/components/admin/job-search-input'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{ type?: string; status?: string; q?: string; mine?: string }>
}

interface NextStep {
  label: string
  href: string
  style: string
}

function getNextStep(job: any): NextStep | null {
  const id = job.id
  const s = job.status
  const isTranslation = job.job_type === 'translation'

  if (s === 'draft') return { label: 'Send Quote →', href: `/admin/translation_jobs/${id}/quote`, style: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' }
  if (s === 'quote_sent') return { label: 'Resend Quote →', href: `/admin/translation_jobs/${id}/quote`, style: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' }
  if (s === 'quote_accepted') return { label: 'Awaiting payment', href: `/admin/translation_jobs/${id}`, style: 'text-gray-500 bg-gray-50 border-gray-200' }
  if ((s === 'paid' || s === 'ai_failed') && isTranslation) return { label: 'Assign →', href: `/admin/translation_jobs/${id}/assign`, style: 'text-[#1a1a2e] bg-blue-50 border-blue-200 hover:bg-blue-100 font-semibold' }
  if (s === 'ai_review_pending') return { label: 'Assign Reviewer →', href: `/admin/translation_jobs/${id}/assign`, style: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' }
  if (s === 'in_progress' && job.translated_doc_path) return { label: 'Review Submission →', href: `/admin/translation_jobs/${id}/review`, style: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 font-semibold' }
  if (s === 'assigned' && job.translated_doc_path) return { label: 'Review Submission →', href: `/admin/translation_jobs/${id}/review`, style: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 font-semibold' }
  if (s === 'confirmed') return { label: 'Assign →', href: `/admin/translation_jobs/${id}/assign`, style: 'text-[#1a1a2e] bg-blue-50 border-blue-200 hover:bg-blue-100 font-semibold' }
  if (s === 'delivered' || s === 'complete') return { label: 'View →', href: `/admin/translation_jobs/${id}`, style: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' }
  return null
}

export default async function JobsPage({ searchParams }: Props) {
  const { type, status, q, mine } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isArchived = status === 'archived'
  const isMine = mine === '1'

  let query = (supabase as any)
    .from('translation_jobs')
    .select('id, job_type, status, created_at, source_lang, target_lang, word_count, quote_amount, quote_adjusted_amount, invoice_number, handled_by, translated_doc_path, translation_clients(contact_name, email), handler:translation_employees!jobs_handled_by_fkey(id, full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (type) query = query.eq('job_type', type as 'translation' | 'interpretation' | 'equipment_rental' | 'notary')

  if (isMine && user) {
    query = query.eq('handled_by', user.id)
  } else if (isArchived) {
    query = query.in('status', ['complete', 'cancelled'])
  } else if (status) {
    query = query.eq('status', status)
  } else {
    query = query.not('status', 'in', '(complete,cancelled)')
  }

  const { data: translation_jobs } = await query

  const filtered = q
    ? (translation_jobs ?? []).filter((j: any) =>
        j.translation_clients?.contact_name?.toLowerCase().includes(q.toLowerCase()) ||
        j.translation_clients?.email?.toLowerCase().includes(q.toLowerCase()) ||
        j.invoice_number?.toLowerCase().includes(q.toLowerCase())
      )
    : (translation_jobs ?? [])

  const filters = [
    { label: 'Active', href: '/admin/translation_jobs', key: 'active' },
    { label: 'Mine', href: '/admin/translation_jobs?mine=1', key: 'mine' },
    { label: 'Translation', href: '/admin/translation_jobs?type=translation', key: 'translation' },
    { label: 'Interpretation', href: '/admin/translation_jobs?type=interpretation', key: 'interpretation' },
    { label: 'Equipment Rental', href: '/admin/translation_jobs?type=equipment_rental', key: 'equipment_rental' },
    { label: 'Notary', href: '/admin/translation_jobs?type=notary', key: 'notary' },
    { label: 'Transcription', href: '/admin/translation_jobs?type=transcription', key: 'transcription' },
    { label: 'Archived', href: '/admin/translation_jobs?status=archived', key: 'archived' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Jobs</h1>
        <div className="flex items-center gap-3">
          <Suspense>
            <JobSearchInput />
          </Suspense>
          <Link href="/admin/translation_jobs/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => {
          const isActive =
            f.key === 'archived' ? isArchived :
            f.key === 'mine' ? isMine :
            f.key === 'active' ? (!type && !status && !isMine) :
            type === f.key
          return (
            <Link
              key={f.href}
              href={f.href}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                isActive
                  ? f.key === 'archived'
                    ? 'bg-gray-600 text-white border-gray-600'
                    : f.key === 'mine'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Languages</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Next Step</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Handler</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No translation_jobs found</td>
              </tr>
            )}
            {filtered.map((job: any) => {
              const handler = job.handler as { id: string; full_name: string } | null
              const handlerColor = handler ? getHandlerColor(handler.id) : null
              const nextStep = getNextStep(job)
              return (
                <tr
                  key={job.id}
                  className={cn('hover:bg-gray-50 transition-colors group border-l-2', handlerColor ? handlerColor.row : 'border-l-transparent')}
                >
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex flex-col px-4 py-3">
                      <span className="font-medium text-gray-900">{job.translation_clients?.contact_name ?? '—'}</span>
                      <span className="text-xs text-gray-400">{job.translation_clients?.email}</span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center px-4 py-3 h-full text-gray-600">
                      {JOB_TYPES[job.job_type as keyof typeof JOB_TYPES]}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center px-4 py-3 h-full text-gray-600">
                      {job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center px-4 py-3 h-full">
                      <Badge className={cn('text-xs', STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-700')}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {nextStep ? (
                      <Link href={nextStep.href}
                        className={cn('inline-flex items-center text-xs px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors', nextStep.style)}>
                        {nextStep.label}
                      </Link>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {handler ? (
                      <HandlerBadge id={handler.id} name={handler.full_name} size="sm" />
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center justify-end px-4 py-3 h-full text-gray-600">
                      {job.quote_adjusted_amount || job.quote_amount
                        ? formatCurrency(Number(job.quote_adjusted_amount ?? job.quote_amount))
                        : '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center justify-end px-4 py-3 h-full text-gray-400">
                      {formatDate(job.created_at)}
                    </Link>
                  </td>
                  <td className="px-2 py-1 w-10">
                    <JobActionsDropdown jobId={job.id} status={job.status} jobType={job.job_type} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
