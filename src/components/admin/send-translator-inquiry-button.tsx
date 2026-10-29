'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

interface Translator {
  id: string
  full_name: string
  email: string
  translation_language_pairs: string[]
  isMatch?: boolean
}

interface Props {
  jobId: string
  sourceLang?: string | null
  targetLang?: string | null
}

export function SendTranslatorInquiryButton({ jobId, sourceLang, targetLang }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [translation_translators, setTranslators] = useState<Translator[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentNames, setSentNames] = useState<string[]>([])

  useEffect(() => {
    if (!open || translation_translators.length > 0) return
    setFetching(true)
    fetch('/api/admin/translation_translators')
      .then((r) => r.json())
      .then((data) => {
        const list: Translator[] = (data.translation_translators ?? []).filter((t: any) => t.is_active !== false)
        // Mark matching translation_translators (handle language pair in either direction)
        const enriched = list.map((t) => {
          const pairs: string[] = t.translation_language_pairs ?? []
          const isMatch = sourceLang && targetLang
            ? pairs.some((p) =>
                p === `${sourceLang}→${targetLang}` ||
                p === `${targetLang}→${sourceLang}` ||
                p.includes(sourceLang) || p.includes(targetLang),
              )
            : false
          return { ...t, isMatch: !!isMatch }
        })
        enriched.sort((a, b) => (b.isMatch ? 1 : 0) - (a.isMatch ? 1 : 0))
        setTranslators(enriched)
        // Pre-select matching translation_translators
        setSelected(new Set(enriched.filter((t) => t.isMatch).map((t) => t.id)))
      })
      .finally(() => setFetching(false))
  }, [open, sourceLang, targetLang, translation_translators.length])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function send() {
    if (selected.size === 0) return
    setLoading(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/translator-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translatorIds: Array.from(selected) }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      setSentNames((data.contacted ?? []).map((c: any) => c.name))
      setSent(true)
      router.refresh()
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Inquiry sent to {sentNames.join(', ')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" />
        Send Translator Inquiry
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
      </Button>

      {open && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm w-full max-w-sm">
          <p className="text-xs text-gray-500 mb-3">
            Select translation_translators to email. They will be asked to confirm availability and rate.
          </p>

          {fetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />}

          {!fetching && translation_translators.length === 0 && (
            <p className="text-xs text-gray-400">No active translation_translators found.</p>
          )}

          <div className="space-y-1.5 max-h-56 overflow-y-auto mb-3">
            {translation_translators.map((t) => (
              <label key={t.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="rounded"
                />
                <span className="flex-1 truncate">{t.full_name}</span>
                {t.isMatch && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium shrink-0">Match</span>
                )}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={send} disabled={loading || selected.size === 0} className="flex-1">
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Sending…</>
                : `Send to ${selected.size} translator${selected.size !== 1 ? 's' : ''}`}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
