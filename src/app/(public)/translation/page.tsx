'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { Upload, CheckCircle, Loader2, FileText, AlertCircle, CheckCircle2, Zap, X, Mail, Package, Truck, MapPin, Building2, Search } from 'lucide-react'
import { calcTurnaroundDays, calculateRushFee, calculateReviewQuote, REVIEW_RATE, REVIEW_MINIMUM, REVIEW_WORDS_PER_DAY, type ReviewCertType } from '@/lib/quote/calculator'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SORTED_LANGUAGES } from '@/lib/languages'
import { ServiceNavLinks } from '@/components/service-nav-links'

type ServiceMode = 'translate' | 'review'
type CertificationType = 'none' | 'general' | 'court'
type MailingOption = 'none' | 'standard' | 'hard_copy' | 'pickup'

const MAILING_PRICES = { standard: 10, hard_copy_company: 25, hard_copy_court: 45, fedex: 69 }

function mailingBasePrice(opt: MailingOption, cert: CertificationType): number {
  if (opt === 'standard') return MAILING_PRICES.standard
  if (opt === 'hard_copy') return cert === 'court' ? MAILING_PRICES.hard_copy_court : MAILING_PRICES.hard_copy_company
  return 0 // 'none' and 'pickup' are free
}

function totalMailingPrice(opt: MailingOption, cert: CertificationType, fedex: boolean): number {
  const base = mailingBasePrice(opt, cert)
  return base + (fedex && opt !== 'none' && opt !== 'pickup' ? MAILING_PRICES.fedex : 0)
}

const CERT_OPTIONS: { value: CertificationType; label: string; description: string }[] = [
  { value: 'none', label: 'Standard Translation', description: 'For personal use, internal business documents, or any purpose that does not require official certification.' },
  { value: 'general', label: 'Certified Translation', description: 'Accepted by USCIS, passport offices, government agencies, universities, and employers. Includes a signed certificate of accuracy.' },
  { value: 'court', label: 'Court-Certified Translation', description: 'Required for legal proceedings, court filings, depositions, and litigation. Completed by a court-certified translator.' },
]

const REVIEW_OPTIONS: { value: ReviewCertType; label: string; description: string; rate: string; minimum: string }[] = [
  { value: 'company', label: 'Review & Company-Certify', description: 'A certified translator reviews your existing translation and issues a signed certificate of accuracy for USCIS, employers, or universities.', rate: '$0.08/word', minimum: '$50 minimum' },
  { value: 'court', label: 'Review & Court-Certify', description: 'A court-certified translator reviews and certifies the translation for use in legal proceedings, court filings, and depositions.', rate: '$0.15/word', minimum: '$200 minimum' },
]

const CERT_SPECIALTY: Record<CertificationType, string> = {
  none: 'General',
  general: 'Certified (USCIS)',
  court: 'Court Certified',
}

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB per file

interface UploadedFile {
  file: File
  storagePath: string | null  // null = not yet uploaded
  progress: number            // 0–100
  error: string | null
}

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function TranslationRequestPage() {
  const [serviceMode, setServiceMode] = useState<ServiceMode>('translate')
  const [reviewCertType, setReviewCertType] = useState<ReviewCertType>('company')
  const [langPairs, setLangPairs] = useState<{ id: string; source_lang: string; target_lang: string; per_word_rate: number }[]>([])
  const [specialties, setSpecialties] = useState<{ name: string; multiplier: number }[]>([])
  const [minimums, setMinimums] = useState({ standard: 95, certified: 120, court: 275, courtPremium: 450 })
  const [courtPremiumLangs, setCourtPremiumLangs] = useState<string[]>(['Japanese', 'Hebrew'])

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [detecting, setDetecting] = useState(false)
  const [detectedLang, setDetectedLang] = useState<string | null>(null)
  const [detectedConfidence, setDetectedConfidence] = useState(0)
  const [showManualSource, setShowManualSource] = useState(false)
  const [detectedWordCount, setDetectedWordCount] = useState<number | null>(null)

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', clientCompany: '',
    sourceLang: '',
    targetLang: '',
    certificationTpe: 'none' as CertificationType,
    mailingOption: 'none' as MailingOption,
    mailingFedex: false,
  })

  const [rushEnabled, setRushEnabled] = useState(false)
  const [requestedDays, setRequestedDays] = useState<number | ''>('')

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ wordCount: number; estimatedQuote: number | null; missingPricing: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useState(() => {
    const supabase = createClient()
    supabase.from('translation_language_pairs').select('id, source_lang, target_lang, per_word_rate').eq('is_active', true)
      .then(({ data }) => setLangPairs(data ?? []))
    supabase.from('translation_specialty_multipliers').select('name, multiplier').eq('is_active', true)
      .then(({ data }) => setSpecialties(data ?? []))
    supabase.from('translation_system_settings').select('key, value')
      .in('key', ['translation_minimum_standard','translation_minimum_certified','translation_minimum_court','translation_minimum_court_premium','translation_court_premium_langs'])
      .then(({ data }) => {
        if (!data) return
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]))
        setMinimums({
          standard: Number(map['translation_minimum_standard'] ?? 95),
          certified: Number(map['translation_minimum_certified'] ?? 250),
          court: Number(map['translation_minimum_court'] ?? 550),
          courtPremium: Number(map['translation_minimum_court_premium'] ?? 750),
        })
        const premiumRaw = map['translation_court_premium_langs'] ?? 'Japanese,Hebrew'
        setCourtPremiumLangs(premiumRaw.split(',').map((l: string) => l.trim()))
      })
  })

  const allTargetLangs = SORTED_LANGUAGES.filter((lang) => lang !== form.sourceLang)

  // ── File handling ────────────────────────────────────────────────────────────

  async function handleFilesAdded(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles)
    const valid: File[] = []
    for (const f of arr) {
      if (f.size > MAX_FILE_BYTES) {
        setError(`"${f.name}" is too large (${formatBytes(f.size)}). Maximum is 50 MB per file.`)
        continue
      }
      valid.push(f)
    }
    if (valid.length === 0) return

    // Add to state immediately as "uploading"
    setUploadedFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, storagePath: null, progress: 0, error: null })),
    ])

    // Detect language on the first file if not yet detected
    const isFirstFile = uploadedFiles.length === 0 && valid.length > 0
    if (isFirstFile) {
      detectLang(valid[0])
    }

    // Upload each file directly to Supabase
    for (let i = 0; i < valid.length; i++) {
      const f = valid[i]
      const idx = uploadedFiles.length + i
      uploadFile(f, idx)
    }
  }

  async function detectLang(file: File) {
    setDetecting(true)
    try {
      const fd = new FormData()
      fd.append('document', file)
      const res = await fetch('/api/translation_jobs/translation/detect', { method: 'POST', body: fd })
      const data = await res.json()
      const lang = data.language ?? 'Unknown'
      const conf = data.confidence ?? 0
      const wc: number = data.wordCount ?? 0
      setDetectedLang(lang)
      setDetectedConfidence(conf)
      if (wc > 0) setDetectedWordCount(wc)
      if (lang !== 'Unknown' && conf >= 0.7) {
        setForm((f) => ({ ...f, sourceLang: lang }))
        setShowManualSource(false)
      } else {
        setShowManualSource(true)
      }
    } catch {
      setShowManualSource(true)
    } finally {
      setDetecting(false)
    }
  }

  async function uploadFile(file: File, listIndex: number) {
    try {
      // Get signed upload URL
      const urlRes = await fetch('/api/translation_jobs/translation/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error ?? 'Could not prepare upload')

      const { signedUrl, storagePath } = urlData

      // Upload via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100)
            setUploadedFiles((prev) => prev.map((uf, i) => i === listIndex ? { ...uf, progress: pct } : uf))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadedFiles((prev) => prev.map((uf, i) => i === listIndex ? { ...uf, storagePath, progress: 100 } : uf))
            resolve()
          } else {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed — check your connection.'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })
    } catch (err: any) {
      setUploadedFiles((prev) => prev.map((uf, i) => i === listIndex ? { ...uf, error: err.message } : uf))
    }
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    if (index === 0) {
      setDetectedLang(null)
      setDetectedConfidence(0)
      setShowManualSource(false)
      setDetectedWordCount(null)
      setForm((f) => ({ ...f, sourceLang: '' }))
    }
  }

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  // ── Rate preview ─────────────────────────────────────────────────────────────

  function computePreview(): { perWordRate: number; minimum: number; isPivot: boolean } | null {
    if (serviceMode === 'review') return null // review uses flat pricing, handled separately
    if (!form.sourceLang || !form.targetLang) return null
    const specialty = specialties.find((s) => s.name === CERT_SPECIALTY[form.certificationTpe])
    if (!specialty) return null
    const isPremiumCourt = form.certificationTpe === 'court' && courtPremiumLangs.some(
      (l) => l.toLowerCase() === form.sourceLang.toLowerCase() || l.toLowerCase() === form.targetLang.toLowerCase()
    )
    const minimum = form.certificationTpe === 'court' ? (isPremiumCourt ? minimums.courtPremium : minimums.court)
      : form.certificationTpe === 'general' ? minimums.certified : minimums.standard
    const direct = langPairs.find((lp) => lp.source_lang === form.sourceLang && lp.target_lang === form.targetLang)
    if (direct) return { perWordRate: Number(direct.per_word_rate) * Number(specialty.multiplier), minimum, isPivot: false }
    if (form.sourceLang !== 'English' && form.targetLang !== 'English') {
      const toEn = langPairs.find((lp) => lp.source_lang === form.sourceLang && lp.target_lang === 'English')
      const fromEn = langPairs.find((lp) => lp.source_lang === 'English' && lp.target_lang === form.targetLang)
      if (toEn && fromEn) return { perWordRate: (Number(toEn.per_word_rate) + Number(fromEn.per_word_rate)) * Number(specialty.multiplier), minimum, isPivot: true }
    }
    return null
  }

  function computeReviewPreview() {
    if (serviceMode !== 'review') return null
    const wc = detectedWordCount ?? 0
    return {
      rate: REVIEW_RATE[reviewCertType],
      minimum: REVIEW_MINIMUM[reviewCertType],
      amount: Math.max(REVIEW_MINIMUM[reviewCertType], Math.ceil(wc * REVIEW_RATE[reviewCertType] * 100) / 100),
      turnaroundDays: wc > 0 ? Math.max(1, Math.ceil(wc / REVIEW_WORDS_PER_DAY)) : null,
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploadedFiles.length === 0) { setError('Please upload at least one document.'); return }
    const pendingUploads = uploadedFiles.filter((f) => f.storagePath === null && !f.error)
    if (pendingUploads.length > 0) { setError('Please wait for all files to finish uploading.'); return }
    const failedUploads = uploadedFiles.filter((f) => f.error)
    if (failedUploads.length > 0) { setError('Some files failed to upload. Please remove them and try again.'); return }
    if (!form.sourceLang) { setError('Please confirm or select the source language.'); return }

    setSubmitting(true)
    setError(null)

    const storagePaths = uploadedFiles.map((uf) => ({ path: uf.storagePath!, name: uf.file.name }))

    const res = await fetch('/api/translation_jobs/translation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientCompany: form.clientCompany || undefined,
        targetLang: serviceMode === 'review' ? (form.targetLang || form.sourceLang) : form.targetLang,
        certificationTpe: serviceMode === 'review' ? (reviewCertType === 'court' ? 'court' : 'general') : form.certificationTpe,
        sourceLang: form.sourceLang,
        detectedSourceLang: detectedLang || form.sourceLang,
        detectedSourceLangConfidence: detectedConfidence,
        requestedDeliveryDays: rushEnabled && requestedDays !== '' ? Number(requestedDays) : undefined,
        storagePaths,
        preComputedWordCount: detectedWordCount ?? undefined,
        serviceMode,
        reviewCertType: serviceMode === 'review' ? reviewCertType : undefined,
        mailingOption: (form.mailingOption !== 'none' && form.mailingOption !== 'pickup') ? form.mailingOption : undefined,
        mailingFedex: form.mailingFedex || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? 'Something went wrong. Please try again or call us.'))
      setSubmitting(false)
    } else {
      setSuccessData({ wordCount: data.wordCount, estimatedQuote: data.estimatedQuote, missingPricing: data.missingPricing })
      setSuccess(true)
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Translation Request Submitted</h2>
          {successData?.wordCount ? (
            <p className="text-gray-600 mb-3">
              Your {uploadedFiles.length > 1 ? `${uploadedFiles.length} documents contain` : 'document contains'} <strong>{successData.wordCount.toLocaleString()} words</strong>.
            </p>
          ) : null}
          {successData?.missingPricing ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-4 text-left">
              This language pair requires custom pricing. A member of our team will prepare your quote and send it by email within one business day.
            </div>
          ) : successData?.estimatedQuote ? (
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 mb-4">
              <p className="font-semibold">Estimated Quote: {formatCurrency(successData.estimatedQuote)}</p>
              <p className="text-xs mt-1">A member of our team will review your documents and send a formal quote. You pay only after accepting.</p>
            </div>
          ) : null}
          <p className="text-gray-500 text-sm mb-4">
            You will receive a formal quote by email. Review and approve it with a single click — payment is collected securely online.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm text-left">
            <p className="font-medium text-gray-700 mb-0.5">Track your order</p>
            <p className="text-gray-500 text-xs mb-2">Sign in to the client portal to view your quote, accept it, and pay — all in one place.</p>
            <Link href="/client/login" className="inline-block text-xs font-semibold text-[#1a1a2e] underline">
              Go to Client Portal →
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            Typical response within 2 business hours &nbsp;·&nbsp; Questions? Call{' '}
            <a href="tel:2133857781" className="text-blue-600 font-medium">(213) 385-7781</a>
          </p>
        </div>
      </div>
    )
  }

  const preview = computePreview()
  const allUploaded = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.storagePath !== null || f.error !== null)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="text-[#1a1a2e] font-bold text-lg shrink-0">L.A. Translation &amp; Interpretation</Link>
        <ServiceNavLinks current="translation" position="top" />
      </nav>

      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Trust banner */}
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2.5 mb-6">
          <Building2 className="h-3.5 w-3.5 text-[#1a1a2e] shrink-0" />
          <span>A real local office — <strong>2975 Wilshire Blvd #205, Los Angeles</strong> — serving translation_clients in person since 2003.</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Document Translation Quote</h1>
          <p className="text-gray-500 mt-2">Upload your document — we detect the source language and calculate your quote automatically.</p>
        </div>

        {/* Service mode toggle */}
        <div className="flex gap-2 mb-6">
          <button type="button" onClick={() => setServiceMode('translate')}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${serviceMode === 'translate' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Translate a Document
          </button>
          <button type="button" onClick={() => setServiceMode('review')}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${serviceMode === 'review' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            <Search className="h-3.5 w-3.5 inline mr-1.5" />
            Review &amp; Certify an Existing Translation
          </button>
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
            <h2 className="font-semibold text-gray-900 mb-2">Upload Documents</h2>
            <p className="text-xs text-gray-400 mb-3">
              Accepted: .docx, .pdf, .txt &nbsp;·&nbsp; Up to 50 MB per file &nbsp;·&nbsp; You can add multiple files
            </p>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {uploadedFiles.map((uf, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${uf.error ? 'border-red-200 bg-red-50' : uf.storagePath ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <FileText className={`h-4 w-4 shrink-0 ${uf.error ? 'text-red-400' : uf.storagePath ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-800">{uf.file.name}</p>
                      {uf.error ? (
                        <p className="text-xs text-red-600">{uf.error}</p>
                      ) : uf.storagePath ? (
                        <p className="text-xs text-green-600">Uploaded — {formatBytes(uf.file.size)}</p>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uf.progress}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{uf.progress}%</span>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drop / add more */}
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-gray-300 hover:border-blue-400 hover:bg-blue-50/30">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Upload className="h-5 w-5" />
                <span>{uploadedFiles.length === 0 ? 'Click to select files' : 'Add more files'}</span>
              </div>
              <span className="text-xs text-gray-400 mt-0.5">.docx, .pdf, .txt</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".docx,.doc,.pdf,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFilesAdded(e.target.files); e.target.value = '' }}
              />
            </label>
          </div>

          {/* Language detection */}
          {uploadedFiles.length > 0 && (
            <div>
              {detecting ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing document…
                </div>
              ) : detectedWordCount !== null && detectedWordCount > 0 ? (
                <p className="text-sm text-gray-500 mb-2">
                  <span className="font-semibold text-gray-800">{detectedWordCount.toLocaleString()} words</span> detected
                </p>
              ) : !detecting && detectedLang !== null ? (
                <p className="text-sm text-amber-600 mb-2">Word count could not be extracted — our team will review and quote manually.</p>
              ) : null}

              {!detecting && detectedLang && !showManualSource ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Source language detected:</span>
                    <span className="text-[#1a1a2e] font-semibold">{detectedLang}</span>
                    <span className="text-xs text-gray-400">({Math.round(detectedConfidence * 100)}% confidence)</span>
                  </div>
                  <button type="button" onClick={() => setShowManualSource(true)} className="text-xs text-blue-600 hover:underline">
                    Not right?
                  </button>
                </div>
              ) : null}

              {(showManualSource || (!detecting && !detectedLang)) && (
                <div className="space-y-1.5">
                  <Label>
                    {detectedLang && detectedLang !== 'Unknown'
                      ? `We detected ${detectedLang} — please confirm or select the correct language`
                      : "Select the document's source language"}
                  </Label>
                  <select required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                    value={form.sourceLang}
                    onChange={(e) => setForm((f) => ({ ...f, sourceLang: e.target.value }))}>
                    <option value="">Select…</option>
                    {SORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Target language */}
          {uploadedFiles.length > 0 && !detecting && (
            <div className="space-y-1.5">
              <Label>Translate into *</Label>
              <select required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                value={form.targetLang}
                onChange={(e) => setForm((f) => ({ ...f, targetLang: e.target.value }))}>
                <option value="">Select target language…</option>
                {allTargetLangs.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
          )}

          {/* Certification / Review options */}
          {uploadedFiles.length > 0 && !detecting && serviceMode === 'translate' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Certification Needed?</h2>
              <p className="text-xs text-gray-400 mb-3">Different certification levels have different pricing.</p>
              <div className="space-y-2">
                {CERT_OPTIONS.map((opt) => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.certificationTpe === opt.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="certificationTpe" value={opt.value}
                      checked={form.certificationTpe === opt.value}
                      onChange={() => setForm((f) => ({
                        ...f,
                        certificationTpe: opt.value,
                        mailingOption: opt.value === 'none' && f.mailingOption === 'hard_copy' ? 'none' : f.mailingOption,
                        mailingFedex: opt.value === 'none' && f.mailingOption === 'hard_copy' ? false : f.mailingFedex,
                      }))}
                      className="mt-0.5 accent-[#1a1a2e]" />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Review & Certify — cert type selection */}
          {uploadedFiles.length > 0 && !detecting && serviceMode === 'review' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Certification Level</h2>
              <p className="text-xs text-gray-400 mb-3">Choose the certification your reviewd translation needs.</p>
              <div className="space-y-2">
                {REVIEW_OPTIONS.map((opt) => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${reviewCertType === opt.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="reviewCertType" value={opt.value}
                      checked={reviewCertType === opt.value}
                      onChange={() => setReviewCertType(opt.value)}
                      className="mt-0.5 accent-[#1a1a2e]" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <span className="text-xs font-semibold text-gray-600">{opt.rate} · {opt.minimum}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {(() => {
                const rp = computeReviewPreview()
                if (!rp) return null
                return (
                  <div className="mt-3 bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                    <p className="font-semibold text-blue-800">Review Estimate{detectedWordCount ? `: ${formatCurrency(rp.amount)}` : ''}</p>
                    {detectedWordCount ? (
                      <p className="text-xs mt-0.5">{detectedWordCount.toLocaleString()} words × ${rp.rate}/word = {formatCurrency(rp.amount)}{rp.amount === rp.minimum ? ' (minimum applied)' : ''}{rp.turnaroundDays ? ` · Est. ${rp.turnaroundDays} business day${rp.turnaroundDays > 1 ? 's' : ''}` : ''}</p>
                    ) : (
                      <p className="text-xs mt-0.5">Upload a document above to see an estimate.</p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Rush */}
          {uploadedFiles.length > 0 && !detecting && (
            <div>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${rushEnabled ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" className="mt-0.5 accent-orange-500"
                  checked={rushEnabled}
                  onChange={(e) => { setRushEnabled(e.target.checked); if (!e.target.checked) setRequestedDays('') }} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                    <p className="font-medium text-sm text-gray-900">Rush Delivery</p>
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">+20% per day rushed</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Need it sooner? We'll prioritize your job.</p>
                </div>
              </label>
              {rushEnabled && (
                <div className="mt-2 pl-3 space-y-1.5">
                  <Label className="text-xs">How many business days do you need it in?</Label>
                  <Input type="number" min={1} max={30} placeholder="e.g. 2" value={requestedDays}
                    onChange={(e) => setRequestedDays(e.target.value ? parseInt(e.target.value) : '')}
                    className="max-w-[120px]" />
                </div>
              )}
            </div>
          )}

          {/* Mailing / delivery options */}
          {uploadedFiles.length > 0 && !detecting && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Document Delivery</h2>
              <p className="text-xs text-gray-400 mb-3">How would you like to receive your finished translation?</p>
              <div className="space-y-2">
                {([
                  { value: 'none' as MailingOption, icon: <Mail className="h-4 w-4 text-gray-400" />, label: 'Digital Only (PDF / email)', desc: 'Delivered as a secure download link by email.', price: 'Free' },
                  { value: 'pickup' as MailingOption, icon: <MapPin className="h-4 w-4 text-gray-400" />, label: 'Pick Up In Person', desc: 'Pick up at our office: 2975 Wilshire Blvd #205, Los Angeles. We will contact you when ready.', price: 'Free' },
                  { value: 'standard' as MailingOption, icon: <Package className="h-4 w-4 text-gray-400" />, label: 'Standard Mail', desc: 'Printed copy mailed to your address via USPS.', price: `+${formatCurrency(MAILING_PRICES.standard)}` },
                  ...(form.certificationTpe !== 'none' && serviceMode === 'translate' ? [{
                    value: 'hard_copy' as MailingOption,
                    icon: <Truck className="h-4 w-4 text-gray-400" />,
                    label: 'Hard Copy with Certification & Notary',
                    desc: 'Notarized, sealed, and stamped hard copy mailed to your address.',
                    price: `+${formatCurrency(mailingBasePrice('hard_copy', form.certificationTpe))}`,
                  }] : []),
                ] as { value: MailingOption; icon: React.ReactNode; label: string; desc: string; price: string }[]).map((opt) => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.mailingOption === opt.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="mailingOption" value={opt.value}
                      checked={form.mailingOption === opt.value}
                      onChange={() => setForm((f) => ({ ...f, mailingOption: opt.value, mailingFedex: opt.value === 'none' ? false : f.mailingFedex }))}
                      className="mt-0.5 accent-[#1a1a2e]" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">{opt.icon}<p className="font-medium text-sm">{opt.label}</p></div>
                        <span className={`text-xs font-semibold shrink-0 ${opt.price === 'Free' ? 'text-green-600' : 'text-gray-700'}`}>{opt.price}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 pl-5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* FedEx overnight addon */}
              {form.mailingOption !== 'none' && (
                <label className={`mt-2 flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.mailingFedex ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" className="mt-0.5 accent-blue-600"
                    checked={form.mailingFedex}
                    onChange={(e) => setForm((f) => ({ ...f, mailingFedex: e.target.checked }))} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">FedEx Overnight</p>
                      <span className="text-xs font-semibold text-gray-700">+{formatCurrency(MAILING_PRICES.fedex)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Upgrade to FedEx overnight for next-business-day arrival.</p>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Rate preview */}
          {form.sourceLang && form.targetLang && uploadedFiles.length > 0 && !detecting && (() => {
            const mailingCost = totalMailingPrice(form.mailingOption, form.certificationTpe, form.mailingFedex)
            if (preview) {
              const prices = [250, 500, 1000, 10000].map((w) => ({
                words: w,
                price: Math.max(Math.ceil(w * preview.perWordRate * 100) / 100, preview.minimum) + mailingCost,
              }))
              return (
                <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 space-y-1.5">
                  <p className="font-semibold text-blue-800">Estimated Pricing</p>
                  <p>${preview.perWordRate.toFixed(4)}/word{preview.isPivot ? ' (via English pivot)' : ''} · Minimum: {formatCurrency(preview.minimum)}</p>
                  {mailingCost > 0 && (
                    <p className="text-blue-700">
                      + Delivery: {formatCurrency(mailingBasePrice(form.mailingOption, form.certificationTpe))}
                      {form.mailingFedex ? ` + FedEx ${formatCurrency(MAILING_PRICES.fedex)}` : ''}
                      {' '}= {formatCurrency(mailingCost)} mailing
                    </p>
                  )}
                  <div className="text-xs text-blue-500 pt-0.5 space-y-0.5">
                    {prices.map(({ words, price }) => (
                      <p key={words}>≈ {words.toLocaleString()} words → {formatCurrency(price)}{mailingCost > 0 ? ' (incl. delivery)' : ''}</p>
                    ))}
                  </div>
                  <p className="text-xs text-blue-400 pt-0.5">
                    Estimate based on word count. Our team will verify before sending your formal quote.
                  </p>
                </div>
              )
            }
            return (
              <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>This language pair is not in our standard rate schedule. Our team will prepare a custom quote and send it to you by email.</p>
              </div>
            )
          })()}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting || detecting || uploadedFiles.length === 0}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Translation Request'}
          </Button>

          <p className="text-xs text-center text-gray-400">
            Every request is reviewed by our team before a formal quote is issued. You accept and pay directly from the quote email — no account required.
          </p>
        </form>
        <ServiceNavLinks current="translation" position="bottom" />
      </div>
    </div>
  )
}
