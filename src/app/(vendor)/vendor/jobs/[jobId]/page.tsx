'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, FileText, Clock, Upload, CheckCircle, AlertCircle, Send, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface VendorJob {
  id: string; job_type: string; status: string; source_lang: string | null
  target_lang: string | null; word_count: number | null; invoice_number: string | null
  deadline_at: string | null; assigned_at: string | null; created_at: string
  document_name: string | null; document_path: string | null; ai_draft_path: string | null
  translated_doc_path: string | null; translation_clients: { contact_name: string } | null
  vendor_confirmed_rate: number | null; vendor_accepted_at: string | null
  vendor_overtime_requested: boolean | null; translator_acceptance_token: string | null
}

interface InvoiceInfo { id: string; amount: number; status: string }

export default function VendorJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<VendorJob | null>(null)
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Invoice state
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceNote, setInvoiceNote] = useState('')
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [invoiceDone, setInvoiceDone] = useState(false)
  const [overtimeRequested, setOvertimeRequested] = useState(false)
  const [overtimeNotes, setOvertimeNotes] = useState('')

  useEffect(() => {
    fetch('/api/vendor/translation_jobs').then(async (r) => {
      const d = await r.json()
      const found = (d.translation_jobs ?? []).find((j: VendorJob) => j.id === jobId)
      setJob(found ?? null)
      // Pre-fill invoice amount from confirmed rate
      if (found?.vendor_confirmed_rate != null) {
        setInvoiceAmount(String(Number(found.vendor_confirmed_rate).toFixed(2)))
      }
      setLoading(false)
    })
    fetch(`/api/vendor/translation_jobs/${jobId}/invoice-status`).then(async (r) => {
      if (r.ok) {
        const d = await r.json()
        if (d.invoice) setInvoice(d.invoice)
      }
    }).catch(() => {})
  }, [jobId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/vendor/translation_jobs/${jobId}/submit`, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    setUploading(false)
    if (res.ok) {
      setUploadDone(true)
      setJob((prev) => prev ? { ...prev, status: 'in_progress', translated_doc_path: 'submitted' } : prev)
    } else {
      setUploadError(data.error ?? 'Upload failed. Please try again.')
    }
  }

  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(invoiceAmount)
    if (isNaN(amount) || amount <= 0) { setInvoiceError('Enter a valid amount.'); return }
    setInvoiceSubmitting(true)
    setInvoiceError(null)
    const res = await fetch(`/api/vendor/translation_jobs/${jobId}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        note: invoiceNote || undefined,
        overtimeRequested: overtimeRequested || undefined,
        overtimeNotes: overtimeNotes || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setInvoiceSubmitting(false)
    if (res.ok) {
      setInvoiceDone(true)
    } else {
      setInvoiceError(data.error ?? 'Failed to submit invoice.')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gray-400" /></div>
  if (!job) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-3">Job not found.</p>
        <Link href="/vendor/translation_jobs" className="text-[#1a1a2e] underline text-sm">Back to translation_jobs</Link>
      </div>
    </div>
  )

  const langLabel = job.source_lang && job.target_lang ? `${job.source_lang} → ${job.target_lang}` : null
  const deadline = job.deadline_at ? new Date(job.deadline_at) : null
  const isOverdue = deadline && deadline < new Date()
  const alreadySubmitted = !!job.translated_doc_path || uploadDone
  const canSubmitWork = ['assigned', 'in_progress'].includes(job.status)
  const canSubmitInvoice = ['in_progress', 'delivered', 'complete'].includes(job.status) && !invoice && !invoiceDone
  const isInterpreter = job.job_type === 'interpretation'
  const needsAcceptance = !isInterpreter && !job.vendor_accepted_at && !!job.translator_acceptance_token
  const confirmedRate = job.vendor_confirmed_rate != null ? Number(job.vendor_confirmed_rate) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/vendor/translation_jobs" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <span className="font-semibold text-[#1a1a2e]">Job Detail</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Acceptance required banner */}
        {needsAcceptance && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 text-sm mb-1">Action Required: Accept This Job</p>
              <p className="text-sm text-amber-800 mb-3">
                Please confirm your acceptance and locked-in rate before starting work.
                You won&apos;t be able to submit a translation or invoice until you accept.
              </p>
              <Link href={`/vendor/translation-acceptance/${job.translator_acceptance_token}`}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Accept Job &amp; Confirm Rate
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Job info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize',
                job.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                job.status === 'delivered' || job.status === 'complete' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-500'
              )}>
                {job.status.replace(/_/g, ' ')}
              </span>
              {job.invoice_number && <span className="text-xs text-gray-400 font-mono ml-2">{job.invoice_number}</span>}
            </div>
            {deadline && (
              <div className={cn('flex items-center gap-1.5 text-sm font-medium', isOverdue ? 'text-red-600' : 'text-gray-600')}>
                <Clock className="h-4 w-4" />
                Due {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
          <dl className="space-y-2.5 text-sm">
            {langLabel && <div className="flex justify-between"><dt className="text-gray-500">Languages</dt><dd className="font-medium">{langLabel}</dd></div>}
            {job.word_count && <div className="flex justify-between"><dt className="text-gray-500">Word count</dt><dd>{job.word_count.toLocaleString()} words</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd className="capitalize">{job.job_type.replace(/_/g, ' ')}</dd></div>
            {job.assigned_at && <div className="flex justify-between"><dt className="text-gray-500">Assigned</dt><dd>{new Date(job.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>}
            {confirmedRate != null && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Confirmed rate</dt>
                <dd className="font-semibold text-green-700">${confirmedRate.toFixed(2)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Source Documents</h2>
          <div className="space-y-3">
            {job.document_path && (
              <a
                href={`/api/admin/translation_jobs/${jobId}/document`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
              >
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{job.document_name ?? 'Original Document'}</p>
                  <p className="text-xs text-gray-500">Source file to translate</p>
                </div>
                <Download className="h-4 w-4 text-gray-400" />
              </a>
            )}
            {job.ai_draft_path && (
              <a
                href={`/api/admin/translation_jobs/${jobId}/document?type=draft`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 transition-all text-sm"
              >
                <FileText className="h-5 w-5 text-purple-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">AI Draft</p>
                  <p className="text-xs text-gray-500">AI-generated first draft — review and refine</p>
                </div>
                <Download className="h-4 w-4 text-purple-400" />
              </a>
            )}
          </div>
        </div>

        {/* Submit translation */}
        {canSubmitWork && !needsAcceptance && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Submit Your Translation</h2>
            <p className="text-sm text-gray-500 mb-4">Upload your completed file. Your coordinator will review and deliver it to the client.</p>

            {uploadDone || alreadySubmitted ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Translation submitted — your coordinator will review shortly.
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" className="hidden" accept=".docx,.doc,.pdf,.txt,.xlsx,.xls" onChange={handleUpload} />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                  className="w-full border-dashed h-16 text-gray-500 hover:text-gray-700"
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading…</>
                    : <><Upload className="h-4 w-4 mr-2" /> Click to upload completed translation</>
                  }
                </Button>
                {uploadError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {uploadError}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Submit invoice */}
        {canSubmitInvoice && !needsAcceptance && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Submit Invoice</h2>
            <p className="text-sm text-gray-500 mb-4">
              {confirmedRate != null && !isInterpreter
                ? `Your confirmed rate is locked at $${confirmedRate.toFixed(2)}. This will be your invoice amount.`
                : 'Our team will review and process payment within 30 days of approval.'}
            </p>
            {invoiceDone ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Invoice submitted — you will be notified once approved.
              </div>
            ) : (
              <form onSubmit={handleInvoiceSubmit} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="pl-6"
                    required
                    readOnly={confirmedRate != null && !isInterpreter}
                  />
                </div>

                {/* Interpreter overtime toggle */}
                {isInterpreter && confirmedRate != null && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overtimeRequested}
                        onChange={(e) => {
                          setOvertimeRequested(e.target.checked)
                          if (!e.target.checked) {
                            setInvoiceAmount(confirmedRate.toFixed(2))
                            setOvertimeNotes('')
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Request overtime (invoice above confirmed rate)</span>
                    </label>
                    {overtimeRequested && (
                      <textarea
                        rows={2}
                        value={overtimeNotes}
                        onChange={(e) => setOvertimeNotes(e.target.value)}
                        placeholder="Explain the reason for overtime (e.g. assignment ran 2 hours over)"
                        className="w-full border border-amber-300 bg-amber-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                      />
                    )}
                  </div>
                )}

                <Input
                  placeholder="Optional note to coordinator"
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  maxLength={500}
                />
                {invoiceError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {invoiceError}
                  </p>
                )}
                <Button type="submit" disabled={invoiceSubmitting} className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e]">
                  {invoiceSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</> : <><Send className="h-4 w-4 mr-2" /> Submit Invoice</>}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Existing invoice */}
        {invoice && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Invoice Submitted</p>
            <p className="text-sm text-gray-600">
              ${Number(invoice.amount).toFixed(2)} — <span className="capitalize text-gray-500">{invoice.status}</span>
            </p>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 pb-4">
          Questions? Contact your coordinator at{' '}
          <a href="tel:2133857781" className="text-[#1a1a2e]">(213) 385-7781</a>
        </div>
      </main>
    </div>
  )
}
