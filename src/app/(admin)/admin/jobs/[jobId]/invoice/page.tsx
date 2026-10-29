'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InvoicePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [translation_translators, setTranslators] = useState<any[]>([])
  const [translatorId, setTranslatorId] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('translation_jobs').select('id, assigned_translator_id, quote_amount, quote_adjusted_amount, translation_translators:assigned_translator_id(id, full_name)').eq('id', jobId).single(),
      supabase.from('translation_translators').select('id, full_name, email').eq('is_active', true).order('full_name'),
    ]).then(([{ data: jobData }, { data: transData }]) => {
      setJob(jobData)
      setTranslators(transData ?? [])
      if (jobData?.assigned_translator_id) setTranslatorId(jobData.assigned_translator_id)
      // Default: 60% of job amount
      const jobAmount = Number(jobData?.quote_adjusted_amount ?? jobData?.quote_amount ?? 0)
      if (jobAmount > 0) setAmount((jobAmount * 0.6).toFixed(2))
    })
  }, [jobId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!translatorId || !amount) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/translation_jobs/${jobId}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translatorId, amount: parseFloat(amount), invoiceNumber: invoiceNumber || undefined, notes: notes || undefined }),
    })
    if (res.ok) {
      router.push(`/admin/translation_jobs/${jobId}`)
    } else {
      alert('Failed to record invoice.')
      setSubmitting(false)
    }
  }

  if (!job) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Record Vendor Invoice</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Translator / Vendor</Label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              value={translatorId}
              onChange={(e) => setTranslatorId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {translation_translators.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} — {t.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Invoice Amount ($)</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <p className="text-xs text-gray-400">Payout will be queued for net-30 days from today.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Vendor Invoice # (optional)</Label>
            <Input placeholder="e.g. TR-2026-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Approve &amp; Queue for Net-30 Payout'}
          </Button>
        </form>
      </div>
    </div>
  )
}
