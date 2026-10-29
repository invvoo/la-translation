'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Clock, XCircle, UserCheck } from 'lucide-react'

interface Bid {
  id: string
  status: 'pending' | 'interested' | 'declined' | 'assigned'
  rate_notes: string | null
  responded_at: string | null
  translation_translators: { id: string; full_name: string; email: string }
}

interface Props {
  jobId: string
  bids: Bid[]
  assignedTranslatorId?: string | null
}

const STATUS_UI = {
  pending:    { label: 'Awaiting Response', icon: Clock,        className: 'text-gray-500 bg-gray-100' },
  interested: { label: 'Available',         icon: CheckCircle2, className: 'text-green-700 bg-green-100' },
  declined:   { label: 'Not Available',     icon: XCircle,      className: 'text-red-600 bg-red-100' },
  assigned:   { label: 'Assigned',          icon: UserCheck,    className: 'text-blue-700 bg-blue-100' },
}

function AssignFromBidButton({ jobId, translatorId, translatorName }: { jobId: string; translatorId: string; translatorName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function assign() {
    if (!confirm(`Assign ${translatorName} to this job?`)) return
    setLoading(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translatorId }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Assignment failed.')
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={assign} disabled={loading} className="bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserCheck className="h-3.5 w-3.5 mr-1" /> Assign</>}
    </Button>
  )
}

export function TranslatorBidsPanel({ jobId, bids, assignedTranslatorId }: Props) {
  if (bids.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Translator Responses
        </h2>
        <p className="text-sm text-gray-400">No inquiries sent yet. Use &quot;Send Translator Inquiry&quot; above to contact translation_translators.</p>
      </div>
    )
  }

  const sorted = [...bids].sort((a, b) => {
    const order = { interested: 0, pending: 1, declined: 2, assigned: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <UserCheck className="h-4 w-4" /> Translator Responses
        <span className="text-xs font-normal text-gray-500 ml-1">
          {bids.filter((b) => b.status === 'interested').length} available · {bids.filter((b) => b.status === 'pending').length} pending
        </span>
      </h2>
      <div className="divide-y divide-gray-100">
        {sorted.map((bid) => {
          const ui = STATUS_UI[bid.status] ?? STATUS_UI.pending
          const Icon = ui.icon
          const isAssigned = bid.translation_translators?.id === assignedTranslatorId
          return (
            <div key={bid.id} className={`py-3 flex items-center gap-3 ${isAssigned ? 'bg-blue-50 -mx-5 px-5 rounded' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                  {bid.translation_translators?.full_name}
                  {isAssigned && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Assigned</span>}
                </p>
                <p className="text-xs text-gray-400">{bid.translation_translators?.email}</p>
                {bid.rate_notes && (
                  <p className="text-xs text-gray-600 mt-0.5 italic">&quot;{bid.rate_notes}&quot;</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ui.className}`}>
                  <Icon className="h-3 w-3" />
                  {ui.label}
                </span>
                {bid.status === 'interested' && !assignedTranslatorId && (
                  <AssignFromBidButton jobId={jobId} translatorId={bid.translation_translators.id} translatorName={bid.translation_translators.full_name} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
