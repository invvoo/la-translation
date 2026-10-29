'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Send, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function QuoteReviewPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)

  // Editable fields
  const [wordCount, setWordCount] = useState('')
  const [perWordRate, setPerWordRate] = useState('')
  const [multiplier, setMultiplier] = useState('')
  const [adjustedAmount, setAdjustedAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountLabel, setDiscountLabel] = useState('')
  const [note, setNote] = useState('')
  const [manualOverride, setManualOverride] = useState(false)

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('translation_jobs')
      .select('id, job_type, status, source_lang, target_lang, word_count, quote_amount, quote_adjusted_amount, quote_per_word_rate, quote_multiplier, employee_notes, translation_clients(contact_name, email), translation_specialty_multipliers:specialty_id(name)')
      .eq('id', jobId)
      .single()
      .then(({ data: rawData }) => {
        const data = rawData as any
        if (!data) return
        setJob(data)
        setWordCount(String(data.word_count ?? ''))
        setPerWordRate(String(data.quote_per_word_rate ?? ''))
        setMultiplier(String(data.quote_multiplier ?? '1'))
        const displayed = data.quote_adjusted_amount ?? data.quote_amount
        setAdjustedAmount(displayed != null ? String(displayed) : '')
        setManualOverride(data.quote_adjusted_amount != null)
        setDiscountAmount(data.discount_amount != null ? String(data.discount_amount) : '')
        setDiscountLabel(data.discount_label ?? '')
        setNote(data.employee_notes ?? '')
      })
  }, [jobId])

  // Recalculate from word count × rate × multiplier
  function recalculate() {
    const wc = parseFloat(wordCount)
    const rate = parseFloat(perWordRate)
    const mult = parseFloat(multiplier) || 1
    if (!isNaN(wc) && !isNaN(rate)) {
      const calc = Math.ceil(wc * rate * mult * 100) / 100
      setAdjustedAmount(calc.toFixed(2))
      setManualOverride(false)
    }
  }

  // Save draft (PATCH) — always called before sending too
  async function saveDraft() {
    const amount = parseFloat(adjustedAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid quote amount greater than $0.')
      return false
    }
    setSaving(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/quote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustedAmount: amount,
        wordCount: wordCount && parseInt(wordCount) > 0 ? parseInt(wordCount) : undefined,
        perWordRate: perWordRate ? parseFloat(perWordRate) : undefined,
        discountAmount: discountAmount ? parseFloat(discountAmount) : undefined,
        discountLabel: discountLabel || undefined,
        note,
      }),
    })
    setSaving(false)
    return res.ok
  }

  async function handleSaveDraft() {
    const ok = await saveDraft()
    if (ok) alert('Quote saved.')
  }

  async function handleSend() {
    const amount = parseFloat(adjustedAmount)
    if (isNaN(amount) || amount <= 0) {
      setSendError('Please set a quote amount greater than $0 before sending.')
      return
    }
    const client = job?.translation_clients as any
    if (!confirm(`Send quote for ${formatCurrency(amount)} to ${client?.email}?`)) return

    setSending(true)
    setSendError(null)

    // Always save current values before sending
    const saved = await saveDraft()
    if (!saved) {
      setSendError('Failed to save quote before sending.')
      setSending(false)
      return
    }

    const res = await fetch(`/api/admin/translation_jobs/${jobId}/quote`, { method: 'POST' })
    if (res.ok) {
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      const body = await res.json().catch(() => ({}))
      setSendError(body.error ?? `Server error (${res.status})`)
      setSending(false)
    }
  }

  if (!job) return <div className="p-8 text-gray-400">Loading…</div>

  const client = job.translation_clients as any
  const specialty = job.translation_specialty_multipliers as any
  const isTranslation = job.job_type === 'translation'
  const canRecalc = isTranslation && wordCount && perWordRate

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Review &amp; Send Quote</h1>
      </div>

      {/* Job summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Client</dt>
            <dd>{client?.contact_name} &lt;{client?.email}&gt;</dd>
          </div>
          {job.source_lang && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Languages</dt>
              <dd>{job.source_lang} → {job.target_lang}</dd>
            </div>
          )}
          {isTranslation && specialty && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Specialty</dt>
              <dd>{specialty?.name}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Editable quote fields */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Adjust &amp; Send</h2>

        {isTranslation && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Word Count</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={wordCount}
                onChange={(e) => setWordCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rate / Word ($)</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={perWordRate}
                onChange={(e) => setPerWordRate(e.target.value)}
                placeholder="0.10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Multiplier</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="1.0"
              />
            </div>
          </div>
        )}

        {isTranslation && canRecalc && (
          <Button variant="outline" size="sm" onClick={recalculate} type="button">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Recalculate from fields
          </Button>
        )}

        <div className="space-y-1.5">
          <Label>
            Final Quote Amount
            {manualOverride && <span className="ml-2 text-xs text-amber-600">(manually set)</span>}
          </Label>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 font-medium">$</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={adjustedAmount}
              onChange={(e) => { setAdjustedAmount(e.target.value); setManualOverride(true) }}
              className="max-w-[160px] font-semibold text-base"
            />
          </div>
        </div>

        {/* Discount */}
        <div className="border border-dashed border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Discount (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Amount ($)</Label>
              <div className="flex gap-2 items-center">
                <span className="text-gray-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Discount Description</Label>
              <Input
                type="text"
                value={discountLabel}
                onChange={(e) => setDiscountLabel(e.target.value)}
                placeholder="e.g. Returning client discount"
              />
            </div>
          </div>
          {discountAmount && parseFloat(discountAmount) > 0 && adjustedAmount && (
            <p className="text-xs text-green-700">
              Client sees: <strong>{formatCurrency(parseFloat(adjustedAmount))}</strong> – <strong>{formatCurrency(parseFloat(discountAmount))}</strong> = <strong>{formatCurrency(Math.max(0, parseFloat(adjustedAmount) - parseFloat(discountAmount)))}</strong>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Internal Note (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Notes visible only to staff…"
          />
        </div>

        {sendError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {sendError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
          </Button>
          <Button onClick={handleSend} disabled={sending || saving || !adjustedAmount}>
            {sending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Quote to Client</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
