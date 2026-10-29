import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { JOB_TYPES, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { JobActionsDropdown } from '@/components/admin/job-actions-dropdown'
import { HandlerBadge } from '@/components/admin/handler-badge'
import { AlertTriangle, Sparkles, UserPlus, Send } from 'lucide-react'

async function getDashboardData(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: activeJobs },
    { data: recentJobs },
    { data: pendingQuotes },
    { data: pendingPayouts },
    { data: monthRevenue },
    { data: needsAttentionJobs },
  ] = await Promise.all([
    supabase.from('translation_jobs').select('id', { count: 'exact' }).not('status', 'in', '(complete,cancelled)'),
    (supabase as any).from('translation_jobs')
      .select('id, job_type, status, created_at, translation_clients(contact_name, email), quote_amount, quote_adjusted_amount, invoice_number, handler:translation_employees!jobs_handled_by_fkey(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('translation_jobs').select('id', { count: 'exact' }).eq('status', 'draft'),
    supabase.from('translation_translator_invoices').select('id', { count: 'exact' }).eq('status', 'approved').lte('payout_due_at', now.toISOString()),
    supabase.from('translation_jobs').select('quote_adjusted_amount, quote_amount').not('payment_collected_at', 'is', null).gte('payment_collected_at', startOfMonth),
    // Jobs that need immediate admin action
    (supabase as any).from('translation_jobs')
      .select('id, job_type, status, translation_clients(contact_name), translated_doc_path')
      .in('status', ['draft', 'paid', 'ai_review_pending', 'ai_failed', 'in_progress'])
      .not('status', 'in', '(complete,cancelled)')
      .order('created_at', { ascending: true })
      .limit(20),
  ])

  const revenue = (monthRevenue ?? []).reduce((sum, j) => {
    return sum + (Number(j.quote_adjusted_amount ?? j.quote_amount) || 0)
  }, 0)

  // Filter in_progress only those with a vendor submission waiting
  const attentionJobs = (needsAttentionJobs ?? []).filter((j: any) => {
    if (j.status === 'in_progress') return !!j.translated_doc_path
    return true
  })

  return {
    activeJobs: activeJobs?.length ?? 0,
    recentJobs: recentJobs ?? [],
    pendingQuotes: pendingQuotes?.length ?? 0,
    pendingPayouts: pendingPayouts?.length ?? 0,
    monthRevenue: revenue,
    attentionJobs,
  }
}

const ATTENTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; href: (id: string) => string }> = {
  draft: {
    label: 'Needs Quote',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Send className="h-3 w-3" />,
    href: (id) => `/admin/translation_jobs/${id}/quote`,
  },
  paid: {
    label: 'Assign Translator',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <UserPlus className="h-3 w-3" />,
    href: (id) => `/admin/translation_jobs/${id}/assign`,
  },
  ai_review_pending: {
    label: 'AI Draft Ready',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Sparkles className="h-3 w-3" />,
    href: (id) => `/admin/translation_jobs/${id}/assign`,
  },
  ai_failed: {
    label: 'AI Failed',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertTriangle className="h-3 w-3" />,
    href: (id) => `/admin/translation_jobs/${id}`,
  },
  in_progress: {
    label: 'Review Submission',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <AlertTriangle className="h-3 w-3" />,
    href: (id) => `/admin/translation_jobs/${id}/review`,
  },
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { activeJobs, recentJobs, pendingQuotes, pendingPayouts, monthRevenue, attentionJobs } = await getDashboardData(supabase)

  const stats = [
    { label: 'Active Jobs', value: activeJobs, href: '/admin/translation_jobs' },
    { label: 'Pending Quotes', value: pendingQuotes, href: '/admin/translation_jobs?status=draft' },
    { label: 'Revenue This Month', value: formatCurrency(monthRevenue), href: '/admin/translation_jobs' },
    { label: 'Payouts Due', value: pendingPayouts, href: '/admin/invoices' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Needs Attention */}
      {attentionJobs.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 mb-6">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900">Needs Attention ({attentionJobs.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {attentionJobs.map((job: any) => {
              const cfg = ATTENTION_CONFIG[job.status]
              if (!cfg) return null
              return (
                <Link key={job.id} href={cfg.href(job.id)}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{(job.translation_clients as any)?.contact_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{JOB_TYPES[job.job_type as keyof typeof JOB_TYPES]}</p>
                  </div>
                  <span className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border', cfg.color)}>
                    {cfg.icon} {cfg.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
          <Link href="/admin/translation_jobs" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentJobs.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-400 text-sm">No translation_jobs yet</p>
          )}
          {recentJobs.map((job: any) => {
            const handler = job.handler as { id: string; full_name: string } | null
            return (
              <div key={job.id} className="flex items-center hover:bg-gray-50 transition-colors group">
                <Link href={`/admin/translation_jobs/${job.id}`} className="flex items-center gap-4 px-6 py-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(job.translation_clients as any)?.contact_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">{JOB_TYPES[job.job_type as keyof typeof JOB_TYPES]}</p>
                  </div>
                  {handler && <HandlerBadge id={handler.id} name={handler.full_name} size="sm" />}
                  <Badge className={cn('text-xs', STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-700')}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </Badge>
                  <span className="text-sm text-gray-500 w-20 text-right shrink-0">
                    {job.quote_adjusted_amount || job.quote_amount
                      ? formatCurrency(Number(job.quote_adjusted_amount ?? job.quote_amount))
                      : '—'}
                  </span>
                </Link>
                <div className="px-3">
                  <JobActionsDropdown jobId={job.id} status={job.status} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
