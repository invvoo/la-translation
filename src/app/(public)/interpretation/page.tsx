'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Loader2, AlertCircle, Users, Mic2 } from 'lucide-react'
import Link from 'next/link'
import { SORTED_LANGUAGES } from '@/lib/languages'
import { formatCurrency } from '@/lib/utils'
import { ServiceNavLinks } from '@/components/service-nav-links'

const ASSIGNMENT_TYPES = [
  { value: 'conference',        label: 'Conference / Large Event',   hint: 'Symposium, summit, or multi-speaker event' },
  { value: 'business_meeting',  label: 'Business Meeting',           hint: 'Corporate meeting, negotiations, presentations' },
  { value: 'attorney_client',   label: 'Attorney-Client Meeting',    hint: 'Legal consultations, client-attorney meetings' },
  { value: 'hospital_visit',    label: 'Hospital / Medical Visit',   hint: 'Medical appointments, hospital visits, clinics' },
  { value: 'court_trial',       label: 'Court Trial / Hearing',      hint: 'In-court proceedings, trials, hearings' },
  { value: 'deposition',        label: 'Deposition',                 hint: 'Recorded depositions for legal proceedings' },
  { value: 'other',             label: 'Other',                      hint: 'Escort, interview, or other assignment type' },
]

const LOCATION_TYPES = [
  { value: 'in_person', label: 'In-Person (physical location)', hint: '' },
  { value: 'video',     label: 'Remote / Video Call',           hint: '$4/min · 30-minute minimum' },
  { value: 'phone',     label: 'Over the Phone',                hint: '$4/min · 30-minute minimum' },
]

const INTERP_MODES = [
  {
    value: 'consecutive',
    label: 'Consecutive Interpreting',
    description: 'The interpreter listens, then speaks after the speaker pauses. Best for meetings, depositions, medical appointments, and interviews.',
  },
  {
    value: 'simultaneous',
    label: 'Simultaneous Interpreting',
    description: 'The interpreter speaks at the same time as the speaker in real time. Required for conferences and large events. Specialized equipment is typically needed.',
  },
]

const CERT_REQUIREMENTS = [
  { value: 'none', label: 'No special certification required' },
  { value: 'court', label: 'Court-certified interpreter required' },
  { value: 'medical', label: 'Medical-certified interpreter required (CCHI/NB)' },
]

const EQUIPMENT_OPTIONS = [
  { value: 'yes', label: 'Yes, I need interpreting equipment rental' },
  { value: 'no', label: 'No, I already have equipment' },
  { value: 'unsure', label: "I'm not sure — please contact me" },
]

const SIMULTANEOUS_SURCHARGE = 100 // per interpreter

export default function InterpretationRequestPage() {
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', clientCompany: '',
    assignmentType: '',
    sourceLang: '', targetLang: '', scheduledAt: '', durationMinutes: '60',
    locationType: 'in_person', locationDetails: '', interpreterNotes: '',
    interpretationMode: 'consecutive',
    certRequired: 'none',
    equipmentNeeded: 'unsure',
    numReceivers: '',
    boothType: 'none' as 'none' | 'desktop' | 'fullsize',
    technicianStay: false,
    eventLocation: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedQuote, setEstimatedQuote] = useState<{ amount: number; billedMinutes: number } | null>(null)

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const durationMin = parseInt(form.durationMinutes, 10) || 0
  const isSimultaneous = form.interpretationMode === 'simultaneous'
  const needsTwoInterpreters = isSimultaneous && durationMin > 30
  const numInterpreters = needsTwoInterpreters ? 2 : 1
  const simultaneousSurchargeTotal = isSimultaneous ? SIMULTANEOUS_SURCHARGE * numInterpreters : 0

  function computeEquipmentEstimate() {
    if (form.equipmentNeeded !== 'yes') return null
    const receivers = parseInt(form.numReceivers, 10) || 0
    const receiverCost = receivers * 10
    const boothCost = form.boothType === 'fullsize' ? 450 : form.boothType === 'desktop' ? 150 : 0
    const fullsizeDelivery = form.boothType === 'fullsize' ? 200 : 0
    const techHours = Math.ceil(durationMin / 60 / 3)
    const techStayCost = form.technicianStay ? techHours * 200 : 0
    const total = receiverCost + boothCost + fullsizeDelivery + techStayCost
    return { receiverCost, boothCost, fullsizeDelivery, techStayCost, total }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const eq = computeEquipmentEstimate()
    const res = await fetch('/api/translation_jobs/interpretation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: form.clientName, clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined, clientCompany: form.clientCompany || undefined,
        assignmentType: form.assignmentType || undefined,
        sourceLang: form.sourceLang, targetLang: form.targetLang,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        durationMinutes: durationMin,
        locationType: form.locationType,
        locationDetails: form.locationDetails || undefined,
        interpreterNotes: form.interpreterNotes || undefined,
        interpretationMode: form.interpretationMode,
        interpretationCertRequired: form.certRequired,
        numInterpreters,
        simultaneousSurcharge: simultaneousSurchargeTotal || undefined,
        equipmentRentalNeeded: isSimultaneous ? form.equipmentNeeded : undefined,
        equipmentDetails: eq ? {
          numReceivers: parseInt(form.numReceivers, 10) || 0,
          boothType: form.boothType,
          technicianStay: form.technicianStay,
          estimate: eq,
        } : undefined,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setEstimatedQuote({ amount: data.estimatedQuote, billedMinutes: data.billedMinutes })
      setSuccess(true)
    } else {
      setError('We were unable to submit your request. Please try again or call us at (213) 385-7781.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Interpretation Request Submitted</h2>
          <p className="text-gray-500 text-sm mb-4">
            Our coordination team will review your request and contact you to confirm interpreter availability.
          </p>
          {estimatedQuote && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-left">
              <p className="text-blue-800 font-semibold text-base">
                Estimated Quote: {formatCurrency(estimatedQuote.amount + simultaneousSurchargeTotal)}
              </p>
              {needsTwoInterpreters && (
                <p className="text-blue-600 text-xs mt-1">Includes 2-interpreter requirement for simultaneous events over 30 minutes.</p>
              )}
            </div>
          )}
          <p className="text-gray-500 text-sm mb-6">
            This is a preliminary estimate. Our team will confirm interpreter availability and issue a formal quote prior to the appointment.
          </p>
          <p className="text-sm text-gray-500">
            Questions? Call <a href="tel:2133857781" className="text-blue-600 font-medium">(213) 385-7781</a>
          </p>
        </div>
      </div>
    )
  }

  const eq = computeEquipmentEstimate()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="text-[#1a1a2e] font-bold text-lg shrink-0">L.A. Translation &amp; Interpretation</Link>
        <ServiceNavLinks current="interpretation" position="top" />
      </nav>
      <div className="max-w-2xl mx-auto py-12 px-4">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Book an Interpreter</h1>
          <p className="text-gray-500 mt-2">Court · Medical · Business · Simultaneous · Escort · Conference</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-8 space-y-6">

          {/* Contact */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5"><Label>Full Name *</Label><Input required value={form.clientName} onChange={set('clientName')} /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" required value={form.clientEmail} onChange={set('clientEmail')} /></div>
              <div className="space-y-1.5"><Label>Phone <span className="text-red-500">*</span></Label><Input type="tel" required value={form.clientPhone} onChange={set('clientPhone')} placeholder="(213) 555-0100" /></div>
              <div className="col-span-2 space-y-1.5"><Label>Organization / Company</Label><Input value={form.clientCompany} onChange={set('clientCompany')} /></div>
            </div>
          </div>

          {/* Assignment type */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Type of Assignment <span className="text-red-500">*</span></h2>
            <p className="text-xs text-gray-400 mb-3">Select the type of event or proceeding requiring interpretation.</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNMENT_TYPES.map((a) => (
                <button
                  key={a.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, assignmentType: a.value }))}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${form.assignmentType === a.value ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <p className="font-medium leading-tight">{a.label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${form.assignmentType === a.value ? 'text-white/70' : 'text-gray-400'}`}>{a.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interpreting mode */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Type of Interpreting</h2>
            <p className="text-xs text-gray-400 mb-3">Not sure? Consecutive is standard for most appointments and legal proceedings.</p>
            <div className="space-y-2">
              {INTERP_MODES.map((m) => (
                <label key={m.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.interpretationMode === m.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="interpretationMode" value={m.value}
                    checked={form.interpretationMode === m.value}
                    onChange={() => setForm((f) => ({ ...f, interpretationMode: m.value }))}
                    className="mt-0.5 accent-[#1a1a2e]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{m.label}</p>
                      {m.value === 'simultaneous' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">+${SIMULTANEOUS_SURCHARGE}/interpreter</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Two-interpreter notice */}
            {needsTwoInterpreters && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <Users className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Simultaneous interpreting assignments longer than 30 minutes require <strong>two interpreters</strong> so they can switch off — this is the industry standard. Two interpreters will be assigned and priced accordingly.</p>
              </div>
            )}
          </div>

          {/* Certification requirement */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Certification Required?</h2>
            <div className="space-y-2">
              {CERT_REQUIREMENTS.map((c) => (
                <label key={c.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.certRequired === c.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="certRequired" value={c.value}
                    checked={form.certRequired === c.value}
                    onChange={() => setForm((f) => ({ ...f, certRequired: c.value }))}
                    className="accent-[#1a1a2e]" />
                  <p className="text-sm font-medium">{c.label}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Language Pair</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Language From *</Label>
                <select required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={form.sourceLang} onChange={(e) => setForm((f) => ({ ...f, sourceLang: e.target.value, targetLang: f.targetLang === e.target.value ? '' : f.targetLang }))}>
                  <option value="">Select…</option>
                  {SORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Language To *</Label>
                <select required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={form.targetLang} onChange={set('targetLang')}>
                  <option value="">Select…</option>
                  {SORTED_LANGUAGES.filter((lang) => lang !== form.sourceLang).map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Event details */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Event Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date &amp; Time</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min="30" value={form.durationMinutes} onChange={set('durationMinutes')} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Format *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_TYPES.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, locationType: t.value }))}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${form.locationType === t.value ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                      <p className="font-medium leading-tight text-xs">{t.label}</p>
                      {t.hint && <p className={`text-[10px] mt-0.5 ${form.locationType === t.value ? 'text-white/70' : 'text-gray-400'}`}>{t.hint}</p>}
                    </button>
                  ))}
                </div>
                {(form.locationType === 'video' || form.locationType === 'phone') && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-1">
                    Remote / phone interpretation is billed at <strong>$4/minute</strong> with a <strong>30-minute minimum ($120)</strong>.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Location / Address / Meeting Link</Label>
                <Input value={form.locationDetails} onChange={set('locationDetails')} placeholder="Address, court name, or video link" />
              </div>
            </div>
          </div>

          {/* Equipment rental prompt — simultaneous only */}
          {isSimultaneous && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                <Mic2 className="h-4 w-4 inline mr-1.5 text-purple-600" />
                Interpreting Equipment
              </h2>
              <p className="text-xs text-gray-400 mb-3">Simultaneous interpreting typically requires receivers, transmitters, and booths. Do you need equipment rental?</p>
              <div className="space-y-2 mb-4">
                {EQUIPMENT_OPTIONS.map((o) => (
                  <label key={o.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.equipmentNeeded === o.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="equipmentNeeded" value={o.value}
                      checked={form.equipmentNeeded === o.value}
                      onChange={() => setForm((f) => ({ ...f, equipmentNeeded: o.value }))}
                      className="accent-[#1a1a2e]" />
                    <p className="text-sm font-medium">{o.label}</p>
                  </label>
                ))}
              </div>

              {form.equipmentNeeded === 'yes' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment Details</p>

                  <div className="space-y-1.5">
                    <Label>Number of Receivers Needed</Label>
                    <Input type="number" min="0" placeholder="e.g. 20" value={form.numReceivers} onChange={set('numReceivers')} className="max-w-[140px]" />
                    <p className="text-xs text-gray-400">$10 per receiver</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Booth Type</Label>
                    {([
                      { value: 'none', label: 'No booth needed', price: '' },
                      { value: 'desktop', label: 'Desktop Soundproof Booth', price: '$150' },
                      { value: 'fullsize', label: 'Full-Size Booth (ISO 4043)', price: '$450 + $200 delivery' },
                    ] as const).map((b) => (
                      <label key={b.value}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${form.boothType === b.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="boothType" value={b.value}
                          checked={form.boothType === b.value}
                          onChange={() => setForm((f) => ({ ...f, boothType: b.value }))}
                          className="accent-[#1a1a2e]" />
                        <span className="text-sm flex-1">{b.label}</span>
                        {b.price && <span className="text-xs font-semibold text-gray-600">{b.price}</span>}
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.technicianStay ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={form.technicianStay}
                        onChange={(e) => setForm((f) => ({ ...f, technicianStay: e.target.checked }))}
                        className="mt-0.5 accent-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Technician to stay during event</p>
                        <p className="text-xs text-gray-400">+$200 per 3-hour block. Delivery, setup, and strike-down are included in all rentals.</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Event Location (for delivery estimate)</Label>
                    <Input value={form.eventLocation} onChange={(e) => setForm((f) => ({ ...f, eventLocation: e.target.value }))} placeholder="City, address, or venue name" />
                  </div>

                  {/* Equipment estimate */}
                  {eq && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-1">
                      <p className="font-semibold text-gray-800">Equipment Estimate</p>
                      {eq.receiverCost > 0 && <p className="text-gray-600">Receivers: {formatCurrency(eq.receiverCost)}</p>}
                      {eq.boothCost > 0 && <p className="text-gray-600">Booth: {formatCurrency(eq.boothCost)}</p>}
                      {eq.fullsizeDelivery > 0 && <p className="text-gray-600">Full-size delivery: {formatCurrency(eq.fullsizeDelivery)}</p>}
                      {eq.techStayCost > 0 && <p className="text-gray-600">Technician (event): {formatCurrency(eq.techStayCost)}</p>}
                      <p className="font-bold text-gray-900 pt-1 border-t border-gray-100">Total equipment: {formatCurrency(eq.total)}</p>
                      {form.eventLocation && !form.eventLocation.toLowerCase().includes('los angeles') && !form.eventLocation.toLowerCase().includes('la ') && (
                        <p className="text-amber-700 text-xs mt-1">Outside LA delivery pricing: <strong>Call to inquire</strong> — (213) 385-7781</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea rows={3} value={form.interpreterNotes} onChange={set('interpreterNotes')}
              placeholder="Type of proceeding, subject matter, any special requirements…" />
          </div>

          {/* Pricing summary */}
          {isSimultaneous && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
              <p className="font-semibold mb-1">Simultaneous Interpreting Surcharge</p>
              <p>+${SIMULTANEOUS_SURCHARGE} × {numInterpreters} interpreter{numInterpreters > 1 ? 's' : ''} = <strong>{formatCurrency(simultaneousSurchargeTotal)}</strong> added to the base rate.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Interpreter Request'}
          </Button>

          <p className="text-xs text-center text-gray-400">
            Rates vary by language, date, and location. A member of our team will confirm availability and send a formal quote.
          </p>
        </form>

        <ServiceNavLinks current="interpretation" position="bottom" />
      </div>
    </div>
  )
}
