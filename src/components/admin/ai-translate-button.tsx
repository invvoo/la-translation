'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

export function AiTranslateButton({ jobId, label = 'Run AI Translation' }: { jobId: string; label?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/ai-translate`, { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? 'AI translation failed'))
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
          : <><Sparkles className="h-4 w-4" /> {label}</>
        }
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
