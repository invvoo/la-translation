'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Mail, Check, UserCheck, UserX } from 'lucide-react'

type Employee = {
  id: string
  full_name: string
  role: 'admin' | 'employee'
  is_active: boolean
  created_at: string
  email: string | null
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {isActive ? <Check className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('admin')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send invite'); setLoading(false); return }
      setSuccess(true)
      setEmail(''); setFullName(''); setRole('admin')
      setTimeout(() => { setSuccess(false); setOpen(false); onInvited() }, 2000)
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Invite Team Member
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-md">
      <h3 className="font-semibold text-gray-900">Send Admin Invitation</h3>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Check className="h-4 w-4" /> Invite sent successfully!
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="space-y-1">
        <Label htmlFor="inv-name">Full Name</Label>
        <Input
          id="inv-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Smith"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-email">Email Address</Label>
        <Input
          id="inv-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@latranslation.com"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-role">Role</Label>
        <select
          id="inv-role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
        >
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading || success} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send Invite
        </Button>
        <Button type="button" variant="outline" onClick={() => { setOpen(false); setError(null) }}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/employees')
    if (res.ok) setEmployees(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage admin portal access. Invited users receive an email to set up their account.
          </p>
        </div>
      </div>

      <InviteForm onInvited={load} />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No team members yet
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.email ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        emp.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <UserCheck className="h-3 w-3" />
                        {emp.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={emp.is_active} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
