'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, Loader2, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EquipmentRentalPage() {
  const [items, setItems] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', clientCompany: '',
    rentalStartDate: '', rentalEndDate: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('translation_equipment_items').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setItems(data ?? []))
  }, [])

  function setQty(itemId: string, delta: number, max: number) {
    setCart((c) => {
      const current = c[itemId] ?? 0
      const next = Math.min(Math.max(0, current + delta), max)
      if (next === 0) { const { [itemId]: _, ...rest } = c; return rest }
      return { ...c, [itemId]: next }
    })
  }

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const days = form.rentalStartDate && form.rentalEndDate
    ? Math.max(1, Math.ceil((new Date(form.rentalEndDate).getTime() - new Date(form.rentalStartDate).getTime()) / 86400000))
    : 0

  const totalEstimate = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = items.find((i) => i.id === itemId)
    return sum + (item ? qty * Number(item.rate_per_day) * days : 0)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Object.keys(cart).length === 0) { setError('Please select at least one item.'); return }
    if (!form.rentalStartDate || !form.rentalEndDate) { setError('Please select rental dates.'); return }
    setSubmitting(true)
    setError(null)

    const rentalItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = items.find((i) => i.id === itemId)!
      return { itemId, name: item.name, qty, ratePerDay: Number(item.rate_per_day) }
    })

    const res = await fetch('/api/translation_jobs/equipment-rental', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: form.clientName, clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined, clientCompany: form.clientCompany || undefined,
        rentalStartDate: form.rentalStartDate, rentalEndDate: form.rentalEndDate,
        items: rentalItems, notes: form.notes || undefined,
      }),
    })

    if (res.ok) { setSuccess(true) } else {
      setError('We were unable to submit your request. Please try again or call us at (213) 368-0700.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Equipment Rental Request Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your request has been received. Our team will confirm equipment availability and send you a formal quote by email.
          </p>
          <p className="text-sm text-gray-500">
            Questions? Call <a href="tel:2133680700" className="text-blue-600 font-medium">(213) 368-0700</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-[#1a1a2e] font-bold text-lg">L.A. Translation &amp; Interpretation</Link>
      </nav>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Equipment Rental</h1>
          <p className="text-gray-500 mt-2">Simultaneous interpreting equipment for conferences, meetings &amp; events</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Your Information</h2>
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
                <Label>Organization</Label>
                <Input value={form.clientCompany} onChange={set('clientCompany')} />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Rental Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" required value={form.rentalStartDate} onChange={set('rentalStartDate')} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" required value={form.rentalEndDate} onChange={set('rentalEndDate')} min={form.rentalStartDate || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            {days > 0 && <p className="text-sm text-blue-600">Rental period: {days} day{days !== 1 ? 's' : ''}</p>}
          </div>

          {/* Equipment */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Select Equipment</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                    <p className="text-sm text-blue-600 font-medium mt-0.5">{formatCurrency(Number(item.rate_per_day))}/day</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQty(item.id, -1, item.quantity_available)}
                      className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
                      disabled={!cart[item.id]}>
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{cart[item.id] ?? 0}</span>
                    <button type="button" onClick={() => setQty(item.id, 1, item.quantity_available)}
                      className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
                      disabled={(cart[item.id] ?? 0) >= item.quantity_available}>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {days > 0 && Object.keys(cart).length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                Estimated total: {formatCurrency(totalEstimate)} ({days} day{days !== 1 ? 's' : ''})
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
            <Label>Event Details / Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={set('notes')}
              placeholder="Event type, number of attendees, number of languages, venue details…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Rental Request'}
          </Button>
          <p className="text-xs text-center text-gray-400">
            Deposit required on booking. Equipment must be returned in original condition.
          </p>
        </form>
      </div>
    </div>
  )
}
