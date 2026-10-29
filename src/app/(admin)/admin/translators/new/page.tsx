'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, X, Plus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ALL_LANGUAGES } from '@/lib/languages'

const SPECIALTIES = ['General', 'Legal', 'Medical', 'Technical', 'Financial', 'Patent', 'Immigration', 'Court Certified', 'Literary', 'Marketing']

export default function NewTranslatorPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', notes: '' })
  const [langPairs, setLangPairs] = useState<{ source: string; target: string }[]>([{ source: '', target: '' }])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [courtCertified, setCourtCertified] = useState(false)
  const [medicalCertified, setMedicalCertified] = useState(false)
  const [doesConsecutive, setDoesConsecutive] = useState(true)
  const [doesSimultaneous, setDoesSimultaneous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function addPair() { setLangPairs((p) => [...p, { source: '', target: '' }]) }
  function removePair(i: number) { setLangPairs((p) => p.filter((_, idx) => idx !== i)) }
  function updatePair(i: number, field: 'source' | 'target', value: string) {
    setLangPairs((p) => p.map((pair, idx) => idx === i ? { ...pair, [field]: value } : pair))
  }
  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const pairs = langPairs.filter((p) => p.source && p.target).map((p) => `${p.source}→${p.target}`)
    const supabase = createClient()
    const { error: err } = await supabase.from('translation_translators').insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      translation_language_pairs: pairs,
      specialties,
      notes: form.notes || null,
      court_certified: courtCertified,
      medical_certified: medicalCertified,
      does_consecutive: doesConsecutive,
      does_simultaneous: doesSimultaneous,
    } as any)
    if (err) { setError(err.message); setSubmitting(false) }
    else { router.push('/admin/translation_translators') }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/translation_translators" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Add Translator / Interpreter</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Full Name *</Label><Input required value={form.full_name} onChange={set('full_name')} /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" required value={form.email} onChange={set('email')} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Language Pairs</h2>
            <Button type="button" variant="outline" size="sm" onClick={addPair}><Plus className="h-3.5 w-3.5 mr-1" />Add Pair</Button>
          </div>
          {langPairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                value={pair.source} onChange={(e) => updatePair(i, 'source', e.target.value)}>
                <option value="">Source language…</option>
                {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="text-gray-400 text-sm flex-shrink-0">→</span>
              <select className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                value={pair.target} onChange={(e) => updatePair(i, 'target', e.target.value)}>
                <option value="">Target language…</option>
                {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {langPairs.length > 1 && (
                <button type="button" onClick={() => removePair(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  specialties.includes(s) ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Interpreter Qualifications</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Court Certified', checked: courtCertified, set: setCourtCertified },
              { label: 'Medical Certified (CCHI/NB)', checked: medicalCertified, set: setMedicalCertified },
              { label: 'Consecutive Interpreting', checked: doesConsecutive, set: setDoesConsecutive },
              { label: 'Simultaneous Interpreting', checked: doesSimultaneous, set: setDoesSimultaneous },
            ] as const).map(({ label, checked, set: setter }) => (
              <label key={label} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className="accent-[#1a1a2e]" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-1.5">
          <Label>Internal Notes</Label>
          <Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Certifications, availability, rate notes…" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Add Translator'}
        </Button>
      </form>
    </div>
  )
}
