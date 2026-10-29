'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { JOB_TYPES, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ArrowLeft, Pencil, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<any>(null)
  const [translation_jobs, setJobs] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ contact_name: '', phone: '', company_name: '', notes: '' })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('translation_clients').select('*').eq('id', clientId).single(),
      supabase.from('translation_jobs').select('id, job_type, status, invoice_number, quote_amount, quote_adjusted_amount, created_at, source_lang, target_lang').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]).then(([{ data: c }, { data: j }]) => {
      setClient(c)
      setJobs(j ?? [])
    })
  }, [clientId])

  function startEditing() {
    setForm({
      contact_name: client.contact_name ?? '',
      phone: client.phone ?? '',
      company_name: client.company_name ?? '',
      notes: client.notes ?? '',
    })
    setEditing(true)
  }

  async function saveEditing() {
    setSaving(true)
    await fetch(`/api/admin/translation_clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_name: form.contact_name,
        phone: form.phone || null,
        company_name: form.company_name || null,
        notes: form.notes || null,
      }),
    })
    setClient((c: any) => ({ ...c, ...form, phone: form.phone || null, company_name: form.company_name || null, notes: form.notes || null }))
    setSaving(false)
    setEditing(false)
  }

  if (!client) return <div className="p-8 text-gray-400">Loading…</div>

  const totalSpend = translation_jobs.reduce((s, j) => s + Number(j.quote_adjusted_amount ?? j.quote_amount ?? 0), 0)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/translation_clients" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1a1a2e]">{client.contact_name}</h1>
          {client.company_name && <p className="text-sm text-gray-500">{client.company_name}</p>}
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold text-[#1a1a2e]">{translation_jobs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Spend</p>
          <p className="text-2xl font-bold text-[#1a1a2e]">{formatCurrency(totalSpend)}</p>
        </div>
      </div>

      {editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Edit Client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company / Organization</Label>
              <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, preferences, account rep…" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={saveEditing} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Save</>}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold mb-3">Contact Info</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-24">Email</dt><dd><a href={`mailto:${client.email}`} className="text-blue-600">{client.email}</a></dd></div>
            {client.phone && <div className="flex gap-2"><dt className="text-gray-500 w-24">Phone</dt><dd>{client.phone}</dd></div>}
            {client.company_name && <div className="flex gap-2"><dt className="text-gray-500 w-24">Company</dt><dd>{client.company_name}</dd></div>}
            <div className="flex gap-2"><dt className="text-gray-500 w-24">Client since</dt><dd>{formatDate(client.created_at)}</dd></div>
            {client.notes && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <dt className="text-gray-500 w-24 shrink-0">Notes</dt>
                <dd className="text-gray-700 whitespace-pre-line">{client.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 font-semibold">Job History</div>
        <div className="divide-y divide-gray-50">
          {translation_jobs.map((job) => (
            <Link key={job.id} href={`/admin/translation_jobs/${job.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 text-sm">
              <span className="text-gray-400 w-32">{job.invoice_number ?? job.id.slice(0, 8)}</span>
              <span className="flex-1">{JOB_TYPES[job.job_type as keyof typeof JOB_TYPES]}{job.source_lang ? ` — ${job.source_lang} → ${job.target_lang}` : ''}</span>
              <Badge className={cn('text-xs', STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-700')}>{STATUS_LABELS[job.status] ?? job.status}</Badge>
              <span className="text-gray-500">{formatCurrency(Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0))}</span>
              <span className="text-gray-400">{formatDate(job.created_at)}</span>
            </Link>
          ))}
          {translation_jobs.length === 0 && <p className="px-6 py-8 text-center text-gray-400 text-sm">No translation_jobs</p>}
        </div>
      </div>
    </div>
  )
}
