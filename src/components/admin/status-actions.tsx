'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Action {
  label: string
  newStatus: string
  confirm?: string
  needsAppointment?: boolean
}

function getActions(jobType: string, status: string): Action[] {
  if (jobType === 'notary') {
    if (status === 'draft') return [{ label: 'Send Quote', newStatus: 'quote_sent' }]
    if (status === 'quote_sent') return [{ label: 'Mark Quote Accepted', newStatus: 'quote_accepted' }]
    if (status === 'quote_accepted') return [{ label: 'Mark Paid', newStatus: 'paid' }]
    if (status === 'paid') return [{ label: 'Schedule Appointment', newStatus: 'scheduled', needsAppointment: true }]
    if (status === 'scheduled') return [{ label: 'Mark Completed', newStatus: 'completed', confirm: 'Mark this notary job as completed?' }]
    if (status === 'completed') return [{ label: 'Close Job', newStatus: 'complete', confirm: 'Close this job?' }]
  }
  if (jobType === 'equipment_rental') {
    if (status === 'draft') return [{ label: 'Send Quote', newStatus: 'quote_sent' }]
    if (status === 'quote_sent') return [{ label: 'Mark Quote Accepted', newStatus: 'quote_accepted' }]
    if (status === 'quote_accepted') return [{ label: 'Mark Paid', newStatus: 'paid' }]
    if (status === 'paid') return [{ label: 'Mark Dispatched', newStatus: 'dispatched', confirm: 'Mark equipment as dispatched to client?' }]
    if (status === 'dispatched') return [{ label: 'Mark Returned', newStatus: 'returned', confirm: 'Mark equipment as returned?' }]
    if (status === 'returned') return [{ label: 'Settle Deposit & Close', newStatus: 'complete', confirm: 'Settle deposit and close this job?' }]
  }
  if (jobType === 'interpretation') {
    if (status === 'draft') return [{ label: 'Send Quote', newStatus: 'quote_sent' }]
    if (status === 'quote_sent') return [{ label: 'Mark Quote Accepted', newStatus: 'quote_accepted' }]
    // quote_accepted: payment via ManualPaymentButton or Stripe — assign page opens once paid
    if (status === 'assigned') return [{ label: 'Mark Completed', newStatus: 'completed', confirm: 'Mark interpretation as completed?' }]
    if (status === 'completed') return [{ label: 'Mark Invoiced', newStatus: 'invoiced' }]
    if (status === 'invoiced') return [{ label: 'Close Job', newStatus: 'complete', confirm: 'Mark interpreter paid and close this job?' }]
  }
  return []
}

export function StatusActions({ jobId, jobType, status }: { jobId: string; jobType: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAppt, setShowAppt] = useState(false)
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('09:00')

  const actions = getActions(jobType, status)
  if (actions.length === 0) return null

  async function doAction(action: Action) {
    if (action.needsAppointment) { setShowAppt(true); return }
    if (action.confirm && !confirm(action.confirm)) return
    await submit(action.newStatus)
  }

  async function submitAppointment(newStatus: string) {
    if (!apptDate) { alert('Please select a date.'); return }
    const appointmentAt = new Date(`${apptDate}T${apptTime}:00`).toISOString()
    await submit(newStatus, appointmentAt)
    setShowAppt(false)
  }

  async function submit(newStatus: string, appointmentAt?: string) {
    setLoading(true)
    await fetch(`/api/admin/translation_jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, appointmentAt }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.newStatus} size="sm" onClick={() => doAction(a)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : a.label}
        </Button>
      ))}

      {showAppt && (
        <div className="w-full mt-2 bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="font-medium text-sm">Schedule Appointment</p>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} className="w-32" />
            </div>
            <Button size="sm" onClick={() => submitAppointment('scheduled')} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAppt(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
