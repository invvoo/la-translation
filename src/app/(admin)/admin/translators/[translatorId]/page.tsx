'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Loader2, Pencil, Check, X, Plus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ALL_LANGUAGES } from '@/lib/languages'

const SPECIALTIES = ['General', 'Legal', 'Medical', 'Technical', 'Financial', 'Patent', 'Immigration', 'Court Certified', 'Literary', 'Marketing']

export default function TranslatorDetailPage() {
  const { translatorId } = useParams<{ translatorId: string }>()
  const [translator, setTranslator] = useState<any>(null)
  const [translation_jobs, setJobs] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' })
  const [editPairs, setEditPairs] = useState<{ source: string; target: string }[]>([])
  const [editSpecialties, setEditSpecialties] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('translation_translators').select('*').eq('id', translatorId).single(),
      supabase.from('translation_jobs').select('id, job_type, status, invoice_number, translation_clients(contact_name)').eq('assigned_translator_id', translatorId).order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data: t }, { data: j }]) => {
      setTranslator(t)
      setJobs(j ?? [])
    })
  }, [translatorId])

  function startEditing() {
    setEditForm({ full_name: translator.full_name, email: translator.email, phone: translator.phone ?? '' })
    const pairs = (translator.translation_language_pairs ?? []).map((p: string) => {
      const [source, target] = p.split('→')
      return { source: source?.trim() ?? '', target: target?.trim() ?? '' }
    })
    setEditPairs(pairs.length > 0 ? pairs : [{ source: '', target: '' }])
    setEditSpecialties(translator.specialties ?? [])
    setEditing(true)
  }

  function cancelEditing() { setEditing(false) }

  async function saveEditing() {
    setSaving(true)
    const pairs = editPairs.filter((p) => p.source && p.target).map((p) => `${p.source}→${p.target}`)
    await fetch(`/api/admin/translation_translators/${translatorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone || null,
        translation_language_pairs: pairs,
        specialties: editSpecialties,
      }),
    })
    // Refresh
    const { data } = await createClient().from('translation_translators').select('*').eq('id', translatorId).single()
    setTranslator(data)
    setSaving(false)
    setEditing(false)
  }

  async function toggleActive() {
    await fetch(`/api/admin/translation_translators/${translatorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !translator.is_active }),
    })
    setTranslator((t: any) => ({ ...t, is_active: !t.is_active }))
  }

  async function handleConnect() {
    setOnboarding(true)
    const res = await fetch(`/api/admin/translation_translators/${translatorId}/connect`, { method: 'POST' })
    const data = await res.json()
    if (data.onboardingUrl) window.open(data.onboardingUrl, '_blank')
    else alert('Failed to create onboarding link.')
    setOnboarding(false)
  }

  if (!translator) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/translation_translators" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">{translator.full_name}</h1>
        <Badge className={cn('text-xs', translator.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {translator.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={toggleActive}>
            {translator.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5 mb-6">
          <h2 className="font-semibold text-gray-900">Edit Profile</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Language Pairs</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditPairs((p) => [...p, { source: '', target: '' }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {editPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={pair.source} onChange={(e) => setEditPairs((p) => p.map((x, idx) => idx === i ? { ...x, source: e.target.value } : x))}>
                  <option value="">Source…</option>
                  {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-gray-400 text-sm">→</span>
                <select className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={pair.target} onChange={(e) => setEditPairs((p) => p.map((x, idx) => idx === i ? { ...x, target: e.target.value } : x))}>
                  <option value="">Target…</option>
                  {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {editPairs.length > 1 && (
                  <button type="button" onClick={() => setEditPairs((p) => p.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button key={s} type="button"
                  onClick={() => setEditSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                  className={cn('px-3 py-1.5 rounded-full text-sm border transition-colors', editSpecialties.includes(s) ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={saveEditing} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Save Changes</>}
            </Button>
            <Button variant="outline" onClick={cancelEditing} disabled={saving}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold mb-3">Contact</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-24">Email</dt><dd><a href={`mailto:${translator.email}`} className="text-blue-600">{translator.email}</a></dd></div>
              {translator.phone && <div className="flex gap-2"><dt className="text-gray-500 w-24">Phone</dt><dd>{translator.phone}</dd></div>}
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold mb-3">Stripe Connect</h2>
            <div className="flex items-center gap-3 mb-3">
              <Badge className={cn('text-xs', {
                'bg-green-100 text-green-700': translator.stripe_connect_status === 'active',
                'bg-yellow-100 text-yellow-700': translator.stripe_connect_status === 'pending',
                'bg-gray-100 text-gray-500': !translator.stripe_connect_status,
              })}>
                {translator.stripe_connect_status ?? 'not connected'}
              </Badge>
            </div>
            <Button size="sm" variant="outline" onClick={handleConnect} disabled={onboarding}>
              {onboarding ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
              {translator.stripe_connect_id ? 'Update Stripe Account' : 'Connect Stripe Account'}
            </Button>
          </div>

          {(translator.translation_language_pairs ?? []).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold mb-3">Language Pairs</h2>
              <div className="flex flex-wrap gap-2">
                {translator.translation_language_pairs.map((lp: string) => (
                  <Badge key={lp} className="text-xs bg-blue-50 text-blue-700">{lp}</Badge>
                ))}
              </div>
            </div>
          )}

          {(translator.specialties ?? []).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold mb-3">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {translator.specialties.map((s: string) => (
                  <Badge key={s} className="text-xs bg-purple-50 text-purple-700">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {translation_jobs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold">Assigned Jobs</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {translation_jobs.map((j: any) => (
              <Link key={j.id} href={`/admin/translation_jobs/${j.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 text-sm">
                <span className="text-gray-500">{j.invoice_number ?? j.id.slice(0, 8)}</span>
                <span className="flex-1 font-medium">{(j.translation_clients as any)?.contact_name}</span>
                <span className="capitalize text-gray-500">{j.job_type.replace('_', ' ')}</span>
                <span className="capitalize text-gray-400">{j.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
