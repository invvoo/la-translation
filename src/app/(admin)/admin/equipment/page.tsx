'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function EquipmentPage() {
  const [items, setItems] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', quantity_total: '1', rate_per_day: '', deposit_amount: '0' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await createClient().from('translation_equipment_items').select('*').order('name')
    setItems(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const qty = parseInt(form.quantity_total, 10)
    await supabase.from('translation_equipment_items').insert({
      name: form.name,
      description: form.description || null,
      quantity_total: qty,
      quantity_available: qty,
      rate_per_day: parseFloat(form.rate_per_day),
      deposit_amount: parseFloat(form.deposit_amount),
    })
    setAdding(false)
    setForm({ name: '', description: '', quantity_total: '1', rate_per_day: '', deposit_amount: '0' })
    setSaving(false)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    await createClient().from('translation_equipment_items').update({ is_active: !current }).eq('id', id)
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Equipment Inventory</h1>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold">New Equipment Item</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" min="1" value={form.quantity_total} onChange={(e) => setForm((f) => ({ ...f, quantity_total: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate/Day ($) *</Label>
              <Input type="number" step="0.01" min="0" required value={form.rate_per_day} onChange={(e) => setForm((f) => ({ ...f, rate_per_day: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.deposit_amount} onChange={(e) => setForm((f) => ({ ...f, deposit_amount: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Item'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Available</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Rate/Day</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Deposit</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((eq) => (
              <tr key={eq.id} className={eq.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <p className="font-medium">{eq.name}</p>
                  {eq.description && <p className="text-xs text-gray-400 mt-0.5">{eq.description}</p>}
                </td>
                <td className="px-4 py-3 text-right">{eq.quantity_total}</td>
                <td className="px-4 py-3 text-right">{eq.quantity_available}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(eq.rate_per_day))}</td>
                <td className="px-4 py-3 text-right">{Number(eq.deposit_amount) > 0 ? formatCurrency(Number(eq.deposit_amount)) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(eq.id, eq.is_active)} className="text-xs text-blue-600 hover:underline">
                    {eq.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
