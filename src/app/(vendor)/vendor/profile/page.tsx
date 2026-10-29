'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const VENDOR_TYPES = [
  { value: 'translator',  label: 'Translator' },
  { value: 'interpreter', label: 'Interpreter' },
  { value: 'both',        label: 'Translator & Interpreter' },
  { value: 'notary',      label: 'Notary / Apostille Agent' },
  { value: 'other',       label: 'Other' },
]

const SPECIALTIES = ['Legal', 'Medical', 'Technical', 'Financial', 'General', 'Court Certified', 'USCIS / Immigration']

const CERTS = [
  { id: 'ata',    label: 'ATA Certified',               desc: 'American Translators Association' },
  { id: 'court',  label: 'Court Certified',              desc: 'State or federally court-certified interpreter' },
  { id: 'cchi',   label: 'CCHI Certified',               desc: 'Certification Commission for Healthcare Interpreters' },
  { id: 'nb',     label: 'National Board Certified',     desc: 'National Board of Certification for Medical Interpreters' },
  { id: 'atio',   label: 'ATIO Member',                  desc: 'Association of Translators and Interpreters of Ontario' },
  { id: 'doj',    label: 'DOJ / Federal Court Certified',desc: 'U.S. Department of Justice certified' },
  { id: 'sworn',  label: 'Sworn Translator',             desc: 'Government-authorized sworn translation' },
  { id: 'notary', label: 'Notary Public',                desc: 'Commissioned notary public' },
]

const PAYMENT_METHODS = [
  { value: 'stripe',  label: 'Stripe',  hint: 'Instant 1-click payouts to your bank' },
  { value: 'paypal',  label: 'PayPal',  hint: 'We send payment to your PayPal email' },
  { value: 'zelle',   label: 'Zelle',   hint: 'We send via Zelle to your phone or email' },
  { value: 'venmo',   label: 'Venmo',   hint: 'We send to your Venmo handle' },
  { value: 'check',   label: 'Check',   hint: 'Physical check mailed to your address' },
  { value: 'other',   label: 'Other',   hint: 'Describe your preferred method' },
]

const PAYMENT_DETAIL_LABEL: Record<string, string> = {
  paypal: 'PayPal email address',
  zelle:  'Zelle phone number or email',
  venmo:  'Venmo handle (e.g. @yourname)',
  check:  'Mailing address for check',
  other:  'Payment details / instructions',
}

interface Profile {
  full_name: string; phone: string; vendor_type: string; translation_language_pairs: string[]
  specialties: string[]; certifications: string[]; per_word_rate: number | null
  hourly_rate: number | null; notes: string; payment_method: string; payment_details: string
  address: string; city: string; state: string; zip: string; lat: number | null; lng: number | null
}

const empty: Profile = {
  full_name: '', phone: '', vendor_type: 'translator', translation_language_pairs: [], specialties: [],
  certifications: [], per_word_rate: null, hourly_rate: null, notes: '', payment_method: 'stripe',
  payment_details: '', address: '', city: '', state: '', zip: '', lat: null, lng: null,
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local form state (strings for numeric inputs)
  const [perWordRateStr, setPerWordRateStr] = useState('')
  const [hourlyRateStr, setHourlyRateStr] = useState('')
  const [langPairsStr, setLangPairsStr] = useState('')

  useEffect(() => {
    fetch('/api/vendor/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.translator) {
          const t = d.translator
          setProfile({
            full_name:      t.full_name ?? '',
            phone:          t.phone ?? '',
            vendor_type:    t.vendor_type ?? 'translator',
            translation_language_pairs: t.translation_language_pairs ?? [],
            specialties:    t.specialties ?? [],
            certifications: t.certifications ?? [],
            per_word_rate:  t.per_word_rate ?? null,
            hourly_rate:    t.hourly_rate ?? null,
            notes:          t.notes ?? '',
            payment_method: t.payment_method ?? 'stripe',
            payment_details:t.payment_details ?? '',
            address:        t.address ?? '',
            city:           t.city ?? '',
            state:          t.state ?? '',
            zip:            t.zip ?? '',
            lat:            t.lat ?? null,
            lng:            t.lng ?? null,
          })
          setLangPairsStr((t.translation_language_pairs ?? []).join(', '))
          setPerWordRateStr(t.per_word_rate != null ? String(t.per_word_rate) : '')
          setHourlyRateStr(t.hourly_rate != null ? String(t.hourly_rate) : '')
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function toggleArr(key: 'specialties' | 'certifications', val: string) {
    set(key, profile[key].includes(val) ? profile[key].filter((x) => x !== val) : [...profile[key], val])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const langs = langPairsStr.split(',').map((s) => s.trim()).filter(Boolean)

    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name:       profile.full_name,
        phone:           profile.phone || undefined,
        translation_language_pairs:  langs,
        specialties:     profile.specialties,
        certifications:  profile.certifications,
        per_word_rate:   perWordRateStr ? parseFloat(perWordRateStr) : null,
        hourly_rate:     hourlyRateStr ? parseFloat(hourlyRateStr) : null,
        notes:           profile.notes || undefined,
        payment_method:  profile.payment_method,
        payment_details: profile.payment_details || undefined,
        address:         profile.address || undefined,
        city:            profile.city || undefined,
        state:           profile.state || undefined,
        zip:             profile.zip || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      set('translation_language_pairs', langs)
    } else {
      setError(typeof data.error === 'string' ? data.error : 'Failed to save changes.')
    }
  }

  const isInterpreter = ['interpreter', 'both'].includes(profile.vendor_type)
  const isTranslator  = ['translator', 'both'].includes(profile.vendor_type)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/vendor/translation_jobs" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-[#1a1a2e]">My Profile</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <Input required value={profile.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input type="tel" value={profile.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(213) 555-0100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {VENDOR_TYPES.map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => set('vendor_type', value)}
                    className={`text-sm px-3 py-2 rounded-lg border text-left transition-colors ${profile.vendor_type === value ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Languages & rates */}
          {['translator', 'interpreter', 'both'].includes(profile.vendor_type) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Languages & Rates</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                <Input
                  value={langPairsStr}
                  onChange={(e) => setLangPairsStr(e.target.value)}
                  placeholder="e.g. English, Spanish, French, Chinese"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated list of every language you work with.</p>
              </div>
              {isTranslator && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Per-Word Rate (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input type="number" min="0.001" step="0.001" value={perWordRateStr}
                      onChange={(e) => setPerWordRateStr(e.target.value)} className="pl-6" placeholder="0.08" />
                  </div>
                </div>
              )}
              {isInterpreter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate per Assignment (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input type="number" min="1" step="1" value={hourlyRateStr}
                      onChange={(e) => setHourlyRateStr(e.target.value)} className="pl-6" placeholder="150" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button key={s} type="button" onClick={() => toggleArr('specialties', s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${profile.specialties.includes(s) ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Certifications */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Certifications & Credentials</h2>
            <div className="grid grid-cols-1 gap-2">
              {CERTS.map(({ id, label, desc }) => (
                <label key={id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${profile.certifications.includes(id) ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input type="checkbox" checked={profile.certifications.includes(id)}
                    onChange={() => toggleArr('certifications', id)} className="mt-0.5 accent-[#1a1a2e]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Address (interpreters) */}
          {isInterpreter && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Your Location</h2>
                <p className="text-xs text-gray-500 mt-0.5">Used to match you with in-person assignments within commuting distance.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address <span className="text-red-500">*</span></label>
                <Input required value={profile.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                  <Input required value={profile.city} onChange={(e) => set('city', e.target.value)} placeholder="Los Angeles" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <Input value={profile.state} onChange={(e) => set('state', e.target.value)} placeholder="CA" maxLength={2} />
                </div>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input value={profile.zip} onChange={(e) => set('zip', e.target.value)} placeholder="90010" />
              </div>
              {profile.lat != null && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  Location verified · {profile.lat.toFixed(4)}, {profile.lng?.toFixed(4)}
                </p>
              )}
              {!profile.lat && profile.address && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Location not yet geocoded — save to verify your address.
                </p>
              )}
            </div>
          )}

          {/* Notes / bio */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Brief Introduction</h2>
            <textarea rows={3} value={profile.notes} onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] resize-none"
              placeholder="Years of experience, relevant background…" />
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Payment Preference</h2>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label, hint }) => (
                <button key={value} type="button"
                  onClick={() => set('payment_method', value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${profile.payment_method === value ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span className="flex items-center gap-1.5">
                    {value === 'stripe' && <Zap className="h-3.5 w-3.5 shrink-0" />}
                    {label}
                  </span>
                  <p className={`text-[10px] mt-0.5 leading-tight ${profile.payment_method === value ? 'text-white/70' : 'text-gray-400'}`}>{hint}</p>
                </button>
              ))}
            </div>
            {profile.payment_method === 'stripe' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                <Zap className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <p className="text-xs text-blue-700">Your Stripe account is connected via the admin portal. Contact your coordinator to update it.</p>
              </div>
            )}
            {profile.payment_method !== 'stripe' && PAYMENT_DETAIL_LABEL[profile.payment_method] && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{PAYMENT_DETAIL_LABEL[profile.payment_method]}</label>
                <Input value={profile.payment_details} onChange={(e) => set('payment_details', e.target.value)}
                  placeholder={PAYMENT_DETAIL_LABEL[profile.payment_method]} />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" /> Profile saved successfully.
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e]">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
          </Button>
        </form>
      </main>
    </div>
  )
}
