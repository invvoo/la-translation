'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Upload } from 'lucide-react'
import Link from 'next/link'

interface Props {
  jobId: string
}

export function ReviewDeliverPanel({ jobId }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendToClient() {
    if (!confirm('Send this translation to the client? This will email them a secure download link.')) return
    setSending(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/deliver-vendor`, { method: 'POST' })
    if (res.ok) {
      setSent(true)
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Failed to send. Please try again.')
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <p className="text-sm text-green-800 font-medium">Sent to client. Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-2 text-sm">Ready to send?</h2>
      <p className="text-sm text-gray-500 mb-5">
        Open the vendor submission above to verify it is complete and accurate. Once you&apos;re satisfied, send it to the client.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={sendToClient}
          disabled={sending}
          className="bg-green-700 hover:bg-green-800"
        >
          {sending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
            : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Approved — Send to Client</>}
        </Button>
        <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-1.5" /> Upload Different File Instead
          </Button>
        </Link>
      </div>
    </div>
  )
}
