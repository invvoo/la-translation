'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Loader2, Upload, FileAudio, FileVideo, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ALL_LANGUAGES } from '@/lib/languages'

const SERVICE_OPTIONS = [
  { value: 'transcription', label: 'Transcription Only', description: 'Convert spoken audio to written text.' },
  { value: 'subtitles', label: 'Subtitles / Captions Only', description: 'Create timed subtitle file (SRT/VTT) for your video.' },
  { value: 'both', label: 'Transcription + Subtitles', description: 'Full written transcript plus timed subtitle file.' },
] as const

const ACCEPTED = '.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.avi,.mkv,.webm'
const ACCEPTED_TYPES = new Set([
  'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave',
  'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/ogg',
  'audio/flac','audio/x-flac','audio/webm',
  'video/mp4','video/quicktime','video/x-msvideo','video/x-matroska',
  'video/webm','video/mpeg','video/3gpp','video/ogg',
])
const MAX_BYTES = 500 * 1024 * 1024 // 500 MB
const LARGE_FILE_WARN_BYTES = 150 * 1024 * 1024 // 150 MB — suggest email option

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TranscriptionPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', clientCompany: '',
    serviceType: 'transcription' as 'transcription' | 'subtitles' | 'both',
    sourceLang: '',
    targetLang: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadFailed, setUploadFailed] = useState(false)

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFileError(null)
    if (!selected) { setFile(null); return }

    if (!ACCEPTED_TYPES.has(selected.type) && selected.type !== '') {
      setFileError('Unsupported file type. Please upload an audio or video file.')
      setFile(null)
      return
    }
    if (selected.size > MAX_BYTES) {
      setFileError(`File is too large (${formatBytes(selected.size)}). Maximum is 500 MB — see below to send via email instead.`)
      setUploadFailed(true)
      setFile(null)
      return
    }
    setUploadFailed(false)
    setFile(selected)
  }

  const isVideo = file?.type.startsWith('video/')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select an audio or video file.'); return }
    setSubmitting(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Step 1: get signed upload URL
      const urlRes = await fetch('/api/translation_jobs/transcription/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error ?? 'Could not prepare upload')

      const { signedUrl, storagePath } = urlData

      // Step 2: upload directly to Supabase Storage (XHR for progress)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else { setUploadFailed(true); reject(new Error(`Upload failed (${xhr.status})`)) }
        }
        xhr.onerror = () => { setUploadFailed(true); reject(new Error('Upload failed — your file may be too large or your connection timed out.')) }
        xhr.ontimeout = () => { setUploadFailed(true); reject(new Error('Upload timed out — the file may be too large to upload directly.')) }
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      setUploadProgress(100)

      // Step 3: create job record
      const jobRes = await fetch('/api/translation_jobs/transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          clientPhone: form.clientPhone || undefined,
          clientCompany: form.clientCompany || undefined,
          storagePath,
          mediaName: file.name,
          serviceType: form.serviceType,
          sourceLang: form.sourceLang || undefined,
          targetLang: form.targetLang || undefined,
          notes: form.notes || undefined,
        }),
      })
      const jobData = await jobRes.json()
      if (!jobRes.ok) throw new Error(jobData.error ?? 'Failed to submit request')

      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Request Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your file has been received. Our team will review it and send you a formal quote by email, typically within one business day.
          </p>
          <p className="text-sm text-gray-500">
            Questions? Call{' '}
            <a href="tel:2133857781" className="text-blue-600 font-medium">(213) 385-7781</a>
            {' '}or email{' '}
            <a href="mailto:info@latranslation.com" className="text-blue-600">info@latranslation.com</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-[#1a1a2e] font-bold text-lg">L.A. Translation &amp; Interpretation</Link>
      </nav>

      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Transcription &amp; Subtitling</h1>
          <p className="text-gray-500 mt-2">Upload your audio or video file. We will transcribe the spoken content, create subtitle files, or both.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-8 space-y-6">

          {/* Contact */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input required value={form.clientName} onChange={set('clientName')} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" required value={form.clientEmail} onChange={set('clientEmail')} placeholder="jane@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.clientPhone} onChange={set('clientPhone')} placeholder="(213) 555-0100" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Company (optional)</Label>
                <Input value={form.clientCompany} onChange={set('clientCompany')} />
              </div>
            </div>
          </div>

          {/* File upload */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Upload File *</h2>
            <p className="text-xs text-gray-400 mb-3">
              Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, AVI, MKV, WebM &nbsp;·&nbsp; Max 500 MB
            </p>

            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-green-300 bg-green-50">
                {isVideo
                  ? <FileVideo className="h-8 w-8 text-green-600 shrink-0" />
                  : <FileAudio className="h-8 w-8 text-green-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                  <p className="text-xs text-green-600">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-gray-300 hover:border-blue-400 hover:bg-blue-50/30">
                <Upload className="h-7 w-7 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to select audio or video</span>
                <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, MP4, MOV and more — up to 500 MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {fileError && (
              <div className="mt-2 text-sm text-red-600 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {fileError}
              </div>
            )}

            {/* Large file warning (allowed but may be slow) */}
            {file && file.size > LARGE_FILE_WARN_BYTES && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <span className="font-medium">Large file ({formatBytes(file.size)})</span> — upload may take a few minutes depending on your connection.
                If it fails, email your file directly to{' '}
                <a href="mailto:info@latranslation.com" className="font-medium underline">info@latranslation.com</a> and we will handle it manually.
              </div>
            )}

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service type */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Service Needed *</h2>
            <div className="space-y-2">
              {SERVICE_OPTIONS.map((opt) => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.serviceType === opt.value
                      ? 'border-[#1a1a2e] bg-[#1a1a2e]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input
                    type="radio"
                    name="serviceType"
                    value={opt.value}
                    checked={form.serviceType === opt.value}
                    onChange={() => setForm((f) => ({ ...f, serviceType: opt.value }))}
                    className="mt-0.5 accent-[#1a1a2e]"
                  />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Spoken Language</Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                value={form.sourceLang}
                onChange={set('sourceLang')}
              >
                <option value="">Auto-detect / Unknown</option>
                {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <p className="text-xs text-gray-400">Language spoken in the recording</p>
            </div>
            {(form.serviceType === 'subtitles' || form.serviceType === 'both') && (
              <div className="space-y-1.5">
                <Label>Subtitle Language</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={form.targetLang}
                  onChange={set('targetLang')}
                >
                  <option value="">Same as spoken language</option>
                  {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <p className="text-xs text-gray-400">Leave blank for same-language subtitles</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Speaker count, accents, technical vocabulary, time-coding preferences, output format (SRT, VTT, Word)…"
            />
          </div>

          {error && !uploadFailed && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {uploadFailed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Having trouble uploading?</p>
              <p className="text-amber-800 mb-3">
                Large files sometimes exceed upload limits. You can send your file directly to our team by email and we will handle the rest.
              </p>
              <a
                href="mailto:info@latranslation.com?subject=Transcription%20Request"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                Email Your File to info@latranslation.com
              </a>
              <p className="text-xs text-amber-700 mt-2">Include your name, phone number, and service needed. We respond within one business day.</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting || !file || uploadFailed}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {uploadProgress !== null && uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Submitting…'}</>
              : 'Submit Transcription Request'}
          </Button>

          <p className="text-xs text-center text-gray-400">
            Our team will review your file and send you a quote before any work begins. You pay only after accepting.
          </p>
        </form>
      </div>
    </div>
  )
}
