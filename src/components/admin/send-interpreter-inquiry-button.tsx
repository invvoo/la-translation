'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, CheckCircle2, ChevronDown, ChevronUp, MapPin, AlertTriangle } from 'lucide-react'
import { haversineKm } from '@/lib/geo/geocode'

// Certifications required by job → cert IDs that satisfy it
const CERT_MAP: Record<string, string[]> = {
  court:   ['court', 'doj'],
  medical: ['cchi', 'nb'],
}

interface Interpreter {
  id: string
  full_name: string
  email: string
  translation_language_pairs: string[]
  certifications: string[]
  vendor_type: string
  lat: number | null
  lng: number | null
  city: string | null
  state: string | null
  // computed
  langMatch?: boolean
  certMatch?: boolean
  distanceKm?: number | null
  fullyEligible?: boolean
}

interface Props {
  jobId: string
  sourceLang?: string | null
  targetLang?: string | null
  locationType?: string | null
  locationDetails?: string | null
  certRequired?: string | null
}

const MAX_DISTANCE_KM = 80 // ~50 miles

export function SendInterpreterInquiryButton({
  jobId, sourceLang, targetLang, locationType, locationDetails, certRequired,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [interpreters, setInterpreters] = useState<Interpreter[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentNames, setSentNames] = useState<string[]>([])
  const [jobCoords, setJobCoords] = useState<{ lat: number; lng: number } | null | 'loading'>('loading')

  const isInPerson = locationType === 'in_person'

  useEffect(() => {
    if (!open) return

    // Geocode job location if in-person
    if (isInPerson && locationDetails) {
      setJobCoords('loading')
      fetch(`/api/geo/geocode?q=${encodeURIComponent(locationDetails)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => setJobCoords(d?.lat ? d : null))
        .catch(() => setJobCoords(null))
    } else {
      setJobCoords(null)
    }

    if (interpreters.length > 0) return
    setFetching(true)
    fetch('/api/admin/translation_translators')
      .then((r) => r.json())
      .then((data) => {
        const list: Interpreter[] = (data.translation_translators ?? []).filter(
          (t: any) => ['interpreter', 'both'].includes(t.vendor_type ?? '')
        )
        setInterpreters(list)
      })
      .finally(() => setFetching(false))
  }, [open, isInPerson, locationDetails, interpreters.length])

  // Recompute matching whenever interpreters or jobCoords change
  const enriched: Interpreter[] = interpreters.map((t) => {
    const langs: string[] = (t.translation_language_pairs ?? []).map((l: string) => l.toLowerCase().trim())
    // Both source AND target must appear in the interpreter's language list
    const langMatch = sourceLang && targetLang
      ? langs.some((l) => l === sourceLang.toLowerCase() || l.includes(sourceLang.toLowerCase())) &&
        langs.some((l) => l === targetLang.toLowerCase() || l.includes(targetLang.toLowerCase()))
      : true

    const requiredCerts = certRequired && certRequired !== 'none' ? CERT_MAP[certRequired] ?? [] : []
    const certMatch = requiredCerts.length === 0
      || requiredCerts.some((c) => (t.certifications ?? []).includes(c))

    let distanceKm: number | null | undefined = undefined
    if (isInPerson) {
      if (jobCoords && jobCoords !== 'loading' && t.lat != null && t.lng != null) {
        distanceKm = haversineKm(jobCoords.lat, jobCoords.lng, t.lat, t.lng)
      } else {
        distanceKm = null // unknown — don't auto-exclude
      }
    }

    const withinDistance = !isInPerson || distanceKm == null || distanceKm <= MAX_DISTANCE_KM
    const fullyEligible = langMatch && certMatch && withinDistance

    return { ...t, langMatch, certMatch, distanceKm, fullyEligible }
  }).sort((a, b) => {
    if (b.fullyEligible !== a.fullyEligible) return (b.fullyEligible ? 1 : 0) - (a.fullyEligible ? 1 : 0)
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
    return 0
  })

  // Auto-select eligible interpreters when list resolves
  useEffect(() => {
    if (enriched.length === 0) return
    setSelected(new Set(enriched.filter((t) => t.fullyEligible).map((t) => t.id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpreters, jobCoords])

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
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/interpreter-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interpreterIds: Array.from(selected) }),
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

  const eligibleCount = enriched.filter((t) => t.fullyEligible).length
  const stillLoading = fetching || (isInPerson && !!locationDetails && jobCoords === 'loading')

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm" variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="border-green-200 text-green-700 hover:bg-green-50"
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" />
        Send Interpreter Inquiry
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
      </Button>

      {open && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm w-full max-w-sm">
          <p className="text-xs text-gray-500 mb-2">
            Auto-selected when interpreter matches language pair
            {certRequired && certRequired !== 'none' ? ', required certification,' : ''}
            {isInPerson ? ` and is within ${MAX_DISTANCE_KM} km (~${Math.round(MAX_DISTANCE_KM / 1.609)} mi) of the job` : ''}.
            You can add or remove anyone.
          </p>

          {isInPerson && !locationDetails && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" /> No job address set — distance filtering unavailable.
            </p>
          )}

          {stillLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 my-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {fetching ? 'Loading interpreters…' : 'Resolving job location…'}
            </div>
          )}

          {!stillLoading && enriched.length === 0 && (
            <p className="text-xs text-gray-400">No active interpreters found.</p>
          )}

          {!stillLoading && enriched.length > 0 && (
            <p className="text-xs text-green-700 font-medium mb-2">
              {eligibleCount} eligible · {enriched.length} total
            </p>
          )}

          <div className="space-y-1 max-h-64 overflow-y-auto mb-3">
            {enriched.map((t) => {
              const issues: string[] = []
              if (!t.langMatch) issues.push('language mismatch')
              if (!t.certMatch) issues.push('missing cert')
              if (isInPerson && t.distanceKm != null && t.distanceKm > MAX_DISTANCE_KM)
                issues.push(`${Math.round(t.distanceKm / 1.609)} mi away`)

              return (
                <label key={t.id} className="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-1">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="rounded mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate font-medium">{t.full_name}</span>
                      {t.fullyEligible && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">Match</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {isInPerson && t.distanceKm != null && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${t.distanceKm > MAX_DISTANCE_KM ? 'text-red-500' : 'text-gray-400'}`}>
                          <MapPin className="h-2.5 w-2.5" />{Math.round(t.distanceKm / 1.609)} mi
                        </span>
                      )}
                      {isInPerson && t.distanceKm == null && (t.city || t.state) && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{[t.city, t.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {issues.length > 0 && (
                        <span className="text-[10px] text-amber-600">{issues.join(' · ')}</span>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={send} disabled={loading || selected.size === 0} className="flex-1">
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Sending…</>
                : `Send to ${selected.size} interpreter${selected.size !== 1 ? 's' : ''}`}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
