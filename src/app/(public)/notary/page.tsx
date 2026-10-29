'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Loader2, Building2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { ServiceNavLinks } from '@/components/service-nav-links'

const SERVICE_TYPES = [
  { value: 'notary', label: 'Notarization Only', description: 'Official notarization of your document' },
  { value: 'apostille', label: 'Apostille Only', description: 'Apostille certification for international use' },
  { value: 'both', label: 'Notarization + Apostille', description: 'Full certification package' },
]

const DELIVERY_METHODS = [
  { value: 'in_person', label: 'In-Person Pickup', description: '2975 Wilshire Blvd #205, Los Angeles, CA 90010' },
  { value: 'mail', label: 'Mail Delivery', description: 'Documents mailed to your address' },
  { value: 'mobile_notary', label: 'Mobile Notary (We Come to You)', description: 'Nearby service within the LA area · $80–$150 + $15 per signature' },
]

const DOCUMENT_TYPES = [
  'Birth Certificate', 'Death Certificate', 'Marriage Certificate', 'Divorce Decree',
  'Power of Attorney', 'Affidavit', 'Immigration Document (USCIS)', 'Diploma / Transcript',
  'Business Document', 'Court Document', 'Medical Record', 'Financial Document', 'Other',
]

export default function NotaryPage() {
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', clientCompany: '',
    notaryServiceType: 'notary', deliveryMethod: 'in_person',
    documentType: '', documentCount: '1', mobileAddress: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/translation_jobs/notary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientCompany: form.clientCompany || undefined,
        notaryServiceType: form.notaryServiceType,
        deliveryMethod: form.deliveryMethod,
        notaryAddress: form.deliveryMethod === 'mobile_notary' ? form.mobileAddress : undefined,
        notarySignatureCount: parseInt(form.documentCount) || 1,
        notes: [
          form.documentType ? `Document type: ${form.documentType}` : '',
          form.documentCount !== '1' ? `Number of documents/signatures: ${form.documentCount}` : '',
          form.deliveryMethod === 'mobile_notary' && form.mobileAddress ? `Mobile address: ${form.mobileAddress}` : '',
          form.notes,
        ].filter(Boolean).join('\n') || undefined,
      }),
    })

    if (res.ok) {
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
          <h2 className="text-xl font-bold mb-2">Notary Request Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your request has been received. A member of our team will review it and send you a formal quote by email, typically within 2 business hours.
          </p>
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 mb-6 text-left space-y-1">
            <p className="font-medium">Standard Fees for Reference:</p>
            <p>Notarization: $15 per document</p>
            <p>Apostille: $95 per document · $50 each additional document (same submission)</p>
            <p>Death Certificate (Norwalk State Registrar): $199.95</p>
          </div>
          <p className="text-sm text-gray-500">
            Questions? Call <a href="tel:2133857781" className="text-blue-600 font-medium">(213) 385-7781</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="text-[#1a1a2e] font-bold text-lg shrink-0">L.A. Translation &amp; Interpretation</Link>
        <ServiceNavLinks current="notary" position="top" />
      </nav>

      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Trust banner */}
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2.5 mb-6">
          <Building2 className="h-3.5 w-3.5 text-[#1a1a2e] shrink-0" />
          <span>In-person notary services at our physical office — <strong>2975 Wilshire Blvd #205, Los Angeles, CA 90010</strong>. Serving translation_clients since 2003.</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Request Notary Service</h1>
          <p className="text-gray-500 mt-2">Certified document notarization and apostille for international use</p>
        </div>

        {/* In-person only notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-0.5">Notary services must be completed in person</p>
            <p>Digital or remote notarization is not available through our office. All notarizations and apostilles require either an in-person visit to our office or a mobile notary appointment at your location in the LA area.</p>
          </div>
        </div>

        {/* Pricing callout */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-1">Standard Pricing</p>
          <ul className="space-y-0.5 text-blue-700">
            <li>Notarization: <strong>$15</strong> per signature</li>
            <li>Apostille: <strong>$95</strong> per document · <strong>$50</strong> each additional (same submission)</li>
            <li>Death certificate (Norwalk State Registrar): <strong>$199.95</strong></li>
            <li>Mobile notary (LA area): <strong>$80–$150</strong> travel + <strong>$15</strong>/signature</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
          {/* Contact */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input required value={form.clientName} onChange={set('clientName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" required value={form.clientEmail} onChange={set('clientEmail')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.clientPhone} onChange={set('clientPhone')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Organization / Company</Label>
                <Input value={form.clientCompany} onChange={set('clientCompany')} />
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Service Needed *</h2>
            <div className="space-y-2">
              {SERVICE_TYPES.map((st) => (
                <label key={st.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.notaryServiceType === st.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="notaryServiceType" value={st.value}
                    checked={form.notaryServiceType === st.value}
                    onChange={set('notaryServiceType')}
                    className="mt-0.5 accent-[#1a1a2e]" />
                  <div>
                    <p className="font-medium text-sm">{st.label}</p>
                    <p className="text-xs text-gray-400">{st.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Document Details */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Document Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Document Type</Label>
                <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                  value={form.documentType} onChange={set('documentType')}>
                  <option value="">Select…</option>
                  {DOCUMENT_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Documents</Label>
                <Input type="number" min="1" value={form.documentCount} onChange={set('documentCount')} />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Method *</h2>
            <div className="space-y-2">
              {DELIVERY_METHODS.map((dm) => (
                <label key={dm.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.deliveryMethod === dm.value ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="deliveryMethod" value={dm.value}
                    checked={form.deliveryMethod === dm.value}
                    onChange={set('deliveryMethod')}
                    className="mt-0.5 accent-[#1a1a2e]" />
                  <div>
                    <p className="font-medium text-sm">{dm.label}</p>
                    <p className="text-xs text-gray-400">{dm.description}</p>
                  </div>
                </label>
              ))}
              {form.deliveryMethod === 'mobile_notary' && (
                <div className="mt-3 space-y-1.5 pl-1">
                  <Label>Your address (LA area only) *</Label>
                  <Input
                    required
                    placeholder="1234 Main St, Los Angeles, CA 90010"
                    value={form.mobileAddress}
                    onChange={set('mobileAddress')}
                  />
                  <p className="text-xs text-gray-400">
                    Mobile notary service available within Los Angeles. Pricing: $80–$150 travel fee + $15 per notary signature.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={set('notes')}
              placeholder="Purpose of apostille (country of destination), urgency, any special instructions…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Notary Request'}
          </Button>

          <p className="text-xs text-center text-gray-400">
            Our team will send you a quote before any work begins. USCIS-accepted certified translations available.
          </p>
        </form>

        {/* Info box */}
        <div className="mt-6 bg-white rounded-xl border p-6 text-sm text-gray-600 space-y-3">
          <p className="font-semibold text-gray-900">Accepted By</p>
          <p>Our certified translations and apostilles are accepted by USCIS, courts, government agencies, and international bodies worldwide.</p>
          <p>All translations are notarized, sealed, and stamped — and kept on file for 3 years.</p>
          <p>Questions about Legal Document Assistant services? Call <a href="tel:2133856228" className="text-blue-600 font-medium">(213) 385-6228</a></p>
        </div>

        <ServiceNavLinks current="notary" position="bottom" />
      </div>
    </div>
  )
}
