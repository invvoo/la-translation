'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StickyNote, Loader2, Check } from 'lucide-react'

interface Props {
  jobId: string
  initialNotes: string | null
}

export function AdminNotesPanel({ jobId, initialNotes }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/admin/translation_jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: notes }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    startTransition(() => router.refresh())
  }

  const dirty = notes !== (initialNotes ?? '')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
      <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <StickyNote className="h-4 w-4" /> Internal Notes
      </h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add internal notes visible only to staff…"
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] placeholder:text-gray-300"
      />
      <div className="flex justify-end mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={save}
          disabled={saving || !dirty}
          className={saved ? 'border-green-300 text-green-700' : ''}
        >
          {saving
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving…</>
            : saved
            ? <><Check className="h-3.5 w-3.5 mr-1" /> Saved</>
            : 'Save Notes'}
        </Button>
      </div>
    </div>
  )
}
