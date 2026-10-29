'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2 } from 'lucide-react'

interface Props {
  jobId: string
  status: string
  adminName: string
  jobType?: string
}

const FINAL_STATUSES = ['complete', 'cancelled']

export function JobFinalActions({ jobId, status, adminName, jobType }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  if (FINAL_STATUSES.includes(status)) return null

  async function deleteJob() {
    setLoading(true)
    await fetch(`/api/admin/translation_jobs/${jobId}`, { method: 'DELETE' })
    window.location.href = '/admin/translation_jobs'
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
        <p className="text-sm text-red-800 mr-1">Permanently delete this job? This cannot be undone.</p>
        <Button size="sm" onClick={deleteJob} disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, Delete'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setConfirming(true)}
      className="border-red-300 text-red-700 hover:bg-red-50"
    >
      <XCircle className="h-3.5 w-3.5 mr-1" /> Not Proceeding
    </Button>
  )
}
