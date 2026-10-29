'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

type Source = 'vendor' | 'ai_draft' | 'upload'

export default function DeliverPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasVendorSubmission, setHasVendorSubmission] = useState(false)
  const [hasAiDraft, setHasAiDraft] = useState(false)
  const [source, setSource] = useState<Source>('upload')

  useEffect(() => {
    fetch(`/api/admin/translation_jobs/${jobId}/vendor-submission-check`)
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json()
          setHasVendorSubmission(!!d.hasSubmission)
          setHasAiDraft(!!d.hasAiDraft)
          if (d.hasSubmission) setSource('vendor')
          else if (d.hasAiDraft) setSource('ai_draft')
        }
      })
      .catch(() => {})
  }, [jobId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    if (source === 'vendor') {
      const res = await fetch(`/api/admin/translation_jobs/${jobId}/deliver-vendor`, { method: 'POST' })
      if (res.ok) {
        router.push(`/admin/translation_jobs/${jobId}`)
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Failed. Please try again.')
        setSubmitting(false)
      }
      return
    }

    if (source === 'ai_draft') {
      const res = await fetch(`/api/admin/translation_jobs/${jobId}/mark-reviewed-deliver`, { method: 'POST' })
      if (res.ok) {
        router.push(`/admin/translation_jobs/${jobId}`)
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Failed. Please try again.')
        setSubmitting(false)
      }
      return
    }

    // source === 'upload'
    if (!file) { setSubmitting(false); return }
    const formData = new FormData()
    formData.append('translatedFile', file)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/deliver`, { method: 'POST', body: formData })
    if (res.ok) {
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      alert('Upload failed. Please try again.')
      setSubmitting(false)
    }
  }

  const hasPrebuilt = hasVendorSubmission || hasAiDraft

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Deliver to Client</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-5">
          Choose which file to send. The client will receive a secure 30-day download link.
        </p>

        {/* Source selector */}
        <div className="mb-5 space-y-2">
          <Label className="text-sm font-medium text-gray-700">Document to deliver</Label>
          <div className="space-y-2">
            {hasVendorSubmission && (
              <button
                type="button"
                onClick={() => setSource('vendor')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${source === 'vendor' ? 'border-[#1a1a2e] bg-[#1a1a2e]/5 text-[#1a1a2e]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <CheckCircle className={`h-4 w-4 shrink-0 ${source === 'vendor' ? 'text-green-600' : 'text-gray-300'}`} />
                <div className="flex-1">
                  <p>Translator submission</p>
                  <p className="text-xs font-normal text-gray-400">File submitted by the assigned translator</p>
                </div>
                <a
                  href={`/api/admin/translation_jobs/${jobId}/document?type=translated`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  View ↗
                </a>
              </button>
            )}

            {hasAiDraft && (
              <button
                type="button"
                onClick={() => setSource('ai_draft')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${source === 'ai_draft' ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <Sparkles className={`h-4 w-4 shrink-0 ${source === 'ai_draft' ? 'text-purple-600' : 'text-gray-300'}`} />
                <div className="flex-1">
                  <p>AI-generated draft</p>
                  <p className="text-xs font-normal text-gray-400">Auto-translated — review before sending</p>
                </div>
                <a
                  href={`/api/admin/translation_jobs/${jobId}/document?type=draft`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  View ↗
                </a>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSource('upload')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${source === 'upload' ? 'border-[#1a1a2e] bg-[#1a1a2e]/5 text-[#1a1a2e]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <Upload className={`h-4 w-4 shrink-0 ${source === 'upload' ? 'text-[#1a1a2e]' : 'text-gray-300'}`} />
              <div>
                <p>Upload my own file</p>
                <p className="text-xs font-normal text-gray-400">.docx, .pdf — replaces any existing draft</p>
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {source === 'upload' && (
            <div className="space-y-2">
              <Label>Upload translated document</Label>
              <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}>
                <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
                  {file
                    ? <><FileText className="h-6 w-6 text-green-600" /><span className="text-green-700 font-medium">{file.name}</span></>
                    : <><Upload className="h-6 w-6" /><span>Click to select file (.docx, .pdf)</span></>
                  }
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".docx,.pdf,.doc"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {source === 'ai_draft' && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Make sure you&apos;ve reviewed the AI draft before sending. Click <strong>View ↗</strong> above to open it.</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e]"
            disabled={(source === 'upload' && !file) || submitting}
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending to Client…</>
              : 'Send to Client'}
          </Button>
        </form>
      </div>
    </div>
  )
}
