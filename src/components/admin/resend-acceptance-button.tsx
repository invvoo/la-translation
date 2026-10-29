'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Send, CheckCircle2 } from 'lucide-react'

export function ResendAcceptanceButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function resend() {
    setState('loading')
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/resend-acceptance`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setState('done')
    } else if (res.status === 409) {
      setState('done') // already accepted
    } else {
      setErrorMsg(data.error ?? 'Failed to resend.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Acceptance email resent
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="outline" onClick={resend} disabled={state === 'loading'} className="text-xs h-7 px-2">
        {state === 'loading'
          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Sending…</>
          : <><Send className="h-3 w-3 mr-1" /> Resend acceptance link</>}
      </Button>
      {state === 'error' && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  )
}
