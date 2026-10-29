'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Star } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Translator {
  id: string
  full_name: string
  email: string
  translation_language_pairs: string[]
  specialties: string[]
  court_certified: boolean
  medical_certified: boolean
  does_consecutive: boolean
  does_simultaneous: boolean
}

interface JobInfo {
  job_type: string
  source_lang: string | null
  target_lang: string | null
  interpretation_mode: string | null
  interpretation_cert_required: string | null
}

function matchScore(t: Translator, job: JobInfo): number {
  if (job.job_type !== 'interpretation') return 0
  const pairs: string[] = t.translation_language_pairs ?? []
  const src = job.source_lang ?? ''
  const tgt = job.target_lang ?? ''
  let score = 0
  if (pairs.some((p) => p === `${src}→${tgt}` || p === `${tgt}→${src}`)) score += 10
  else if (pairs.some((p) => p.includes(src) || p.includes(tgt))) score += 5
  if (job.interpretation_mode === 'simultaneous' && t.does_simultaneous) score += 2
  if (job.interpretation_mode === 'consecutive' && t.does_consecutive) score += 2
  if (job.interpretation_cert_required === 'court' && t.court_certified) score += 3
  if (job.interpretation_cert_required === 'medical' && t.medical_certified) score += 3
  return score
}

export default function AssignPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [job, setJob] = useState<JobInfo | null>(null)
  const [translation_translators, setTranslators] = useState<Translator[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      (supabase as any)
        .from('translation_jobs')
        .select('job_type, source_lang, target_lang, interpretation_mode, interpretation_cert_required')
        .eq('id', jobId)
        .single()
        .then(({ data }: { data: JobInfo | null }) => setJob(data)),
      supabase
        .from('translation_translators')
        .select('id, full_name, email, translation_language_pairs, specialties, court_certified, medical_certified, does_consecutive, does_simultaneous')
        .eq('is_active', true)
        .order('full_name')
        .then(({ data }) => setTranslators((data ?? []) as unknown as Translator[])),
    ])
  }, [jobId])

  const isInterpretation = job?.job_type === 'interpretation'
  const sortedTranslators = job
    ? [...translation_translators].sort((a, b) => matchScore(b, job) - matchScore(a, job))
    : translation_translators

  async function handleAssign() {
    if (!selectedId) return alert('Please select a translator.')
    setSubmitting(true)
    setAssignError(null)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translatorId: selectedId, deadlineAt: deadline || undefined }),
    })
    if (res.ok) {
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setAssignError(typeof data.error === 'string' ? data.error : 'Assignment failed. Check server logs.')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">
          {isInterpretation ? 'Assign Interpreter' : 'Assign Translator'}
        </h1>
        {isInterpretation && job?.source_lang && job?.target_lang && (
          <span className="text-sm text-gray-500 font-mono">{job.source_lang} → {job.target_lang}</span>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Select {isInterpretation ? 'Interpreter' : 'Translator'}</Label>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sortedTranslators.map((t) => {
              const score = job ? matchScore(t, job) : 0
              const isMatch = score >= 5
              return (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === t.id
                      ? 'border-[#1a1a2e] bg-blue-50'
                      : isMatch
                      ? 'border-purple-200 hover:border-purple-300 bg-purple-50/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="translator"
                    value={t.id}
                    checked={selectedId === t.id}
                    onChange={() => setSelectedId(t.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.full_name}</p>
                      {isMatch && isInterpretation && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                          <Star className="h-2.5 w-2.5" /> Match
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{t.email}</p>
                    {t.translation_language_pairs?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.translation_language_pairs.slice(0, 4).join(', ')}{t.translation_language_pairs.length > 4 ? '…' : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.court_certified && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Court</span>}
                      {t.medical_certified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Medical</span>}
                      {t.does_simultaneous && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Simultaneous</span>}
                      {t.does_consecutive && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">Consecutive</span>}
                    </div>
                  </div>
                </label>
              )
            })}
            {translation_translators.length === 0 && (
              <p className="text-sm text-gray-400">
                No active {isInterpretation ? 'interpreters' : 'translation_translators'} found.{' '}
                <Link href="/admin/translation_translators/new" className="text-blue-600 hover:underline">Add one.</Link>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Deadline (optional)</Label>
          <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <Button onClick={handleAssign} disabled={submitting || !selectedId} className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e]">
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Assigning…</>
            : `Assign ${isInterpretation ? 'Interpreter' : 'Translator'}`}
        </Button>
        {assignError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            {assignError}
          </div>
        )}
      </div>
    </div>
  )
}
