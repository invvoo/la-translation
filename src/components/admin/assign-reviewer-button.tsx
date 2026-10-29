'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, UserCheck, X } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
}

interface Props {
  jobId: string
  translation_employees: Employee[]
  currentReviewerId?: string | null
  currentReviewerName?: string | null
}

export function AssignReviewerButton({ jobId, translation_employees, currentReviewerId, currentReviewerName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function assign(reviewerId: string | null) {
    setLoading(true)
    setOpen(false)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/assign-reviewer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Failed to assign reviewer.')
    }
  }

  if (currentReviewerId && currentReviewerName) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800">{currentReviewerName}</span>
        <button
          onClick={() => assign(null)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Remove reviewer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="text-xs h-7 px-2"
      >
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
          : <UserCheck className="h-3 w-3 mr-1" />}
        Assign Reviewer
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px] py-1">
          {translation_employees.map((e) => (
            <button
              key={e.id}
              onClick={() => assign(e.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              {e.full_name}
            </button>
          ))}
          {translation_employees.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No translation_employees found.</p>
          )}
        </div>
      )}
    </div>
  )
}
