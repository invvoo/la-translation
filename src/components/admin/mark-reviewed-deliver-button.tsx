'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Send } from 'lucide-react'

interface Props {
  jobId: string
  label?: string
}

export function MarkReviewedDeliverButton({ jobId, label = 'Mark Reviewed & Send to Client' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('This will mark the document as reviewed and send a delivery email to the client. Continue?')) return
    setLoading(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/mark-reviewed-deliver`, { method: 'POST' })
    if (res.ok) {
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handle}
      disabled={loading}
      className="bg-green-700 hover:bg-green-800 text-white"
    >
      {loading
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Sending…</>
        : <><Send className="h-3.5 w-3.5 mr-1.5" /> {label}</>}
    </Button>
  )
}
