'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ALL_LANGUAGES } from '@/lib/languages'

type JobType = 'translation' | 'interpretation' | 'equipment_rental' | 'notary'

export default function NewJobPage() {
  const router = useRouter()
  const [jobType, setJobType] = useState<JobType>('translation')
  const [specialties, setSpecialties] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Common fields
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Translation/interpretation
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')

  // Interpretation
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [locationType, setLocationType] = useState<'in_person' | 'phone' | 'video'>('in_person')
  const [locationDetails, setLocationDetails] = useState('')

  // Notary
  const [notaryType, setNotaryType] = useState<'notary' | 'apostille' | 'both'>('notary')
  const [deliveryMethod, setDeliveryMethod] = useState<'in_person' | 'mail'>('in_person')

  useEffect(() => {
    createClient().from('translation_specialty_multipliers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setSpecialties(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    let url = `/api/translation_jobs/${jobType.replace('_', '-')}`
    let body: any = { clientName, clientEmail, clientPhone: clientPhone || undefined, clientNotes: notes || undefined }

    if (jobType === 'translation' || jobType === 'interpretation') {
      body = { ...body, sourceLang, targetLang }
    }
    if (jobType === 'translation') {
      body = { ...body, specialtyId }
    }
    if (jobType === 'interpretation') {
      body = { ...body, scheduledAt: scheduledAt || undefined, durationMinutes: parseInt(durationMinutes, 10), locationType, locationDetails: locationDetails || undefined, interpreterNotes: notes || undefined }
    }
    if (jobType === 'notary') {
      body = { ...body, notaryServiceType: notaryType, deliveryMethod, notes: notes || undefined }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: jobType === 'translation' ? undefined : { 'Content-Type': 'application/json' },
      body: jobType === 'translation' ? undefined : JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/translation_jobs/${data.jobId}`)
    } else {
      alert('Failed to create job.')
      setSubmitting(false)
    }
  }

  // Note: translation translation_jobs with file upload go through the public form
  const showTranslationNote = jobType === 'translation'

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/translation_jobs" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">New Job (Manual Entry)</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* Job Type */}
        <div className="space-y-2">
          <Label>Job Type</Label>
          <div className="flex flex-wrap gap-2">
            {(['translation', 'interpretation', 'equipment_rental', 'notary'] as JobType[]).map((t) => (
              <button key={t} type="button"
                onClick={() => setJobType(t)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${jobType === t ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'border-gray-200 hover:border-gray-400'}`}>
                {t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {showTranslationNote && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
            For translation translation_jobs with document upload, use the <Link href="/translation" target="_blank" className="underline font-medium">public request form</Link> or upload manually after creating this record.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Client Name *</Label>
              <Input required value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Client Email *</Label>
              <Input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Client Phone</Label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
          </div>

          {(jobType === 'translation' || jobType === 'interpretation') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Source Language *</Label>
                <select required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={sourceLang} onChange={(e) => { setSourceLang(e.target.value); setTargetLang('') }}>
                  <option value="">Select…</option>
                  {ALL_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Language *</Label>
                <select required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                  <option value="">Select…</option>
                  {ALL_LANGUAGES.filter((l) => l !== sourceLang).map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {jobType === 'translation' && (
            <div className="space-y-1.5">
              <Label>Specialty *</Label>
              <select required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                <option value="">Select…</option>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {jobType === 'interpretation' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date &amp; Time</Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min="30" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                    value={locationType} onChange={(e) => setLocationType(e.target.value as any)}>
                    <option value="in_person">In-Person</option>
                    <option value="phone">Phone</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location / Link</Label>
                  <Input value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} placeholder="Address or meeting link" />
                </div>
              </div>
            </>
          )}

          {jobType === 'notary' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={notaryType} onChange={(e) => setNotaryType(e.target.value as any)}>
                  <option value="notary">Notarization Only</option>
                  <option value="apostille">Apostille Only</option>
                  <option value="both">Notarization + Apostille</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery</Label>
                <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as any)}>
                  <option value="in_person">In-Person</option>
                  <option value="mail">By Mail</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call-in notes, special instructions…" />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Job'}
          </Button>
        </form>
      </div>
    </div>
  )
}
