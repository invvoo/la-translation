'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Mail, Check, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react'

type Employee = {
  id: string
  full_name: string
  role: 'admin' | 'employee'
  is_active: boolean
  created_at: string
  email: string | null
}

// ── Edit Panel ───────────────────────────────────────────────────────────────

function EditPanel({ emp, onSaved, onClose }: { emp: Employee; onSaved: () => void; onClose: () => void }) {
  const [fullName, setFullName] = useState(emp.full_name)
  const [email, setEmail] = useState(emp.email ?? '')
  const [role, setRole] = useState<'admin' | 'employee'>(emp.role)
  const [isActive, setIsActive] = useState(emp.is_active)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = { full_name: fullName, role, is_active: isActive }
    if (email.trim() && email.trim() !== emp.email) body.email = email.trim()
    if (password.trim()) body.password = password.trim()

    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Save failed'); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved(); onClose() }, 1200)
  }

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="space-y-1">
          <Label className="text-xs">Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
            className="w-full h-8 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          >
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">New Password <span className="text-gray-400">(leave blank to keep current)</span></Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-[#1a1a2e]"
          />
          Active
        </label>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving || saved} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Employee Row ─────────────────────────────────────────────────────────────

function EmployeeRow({ emp, onUpdated }: { emp: Employee; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <tr className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {emp.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-900 text-sm">{emp.full_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{emp.email ?? <span className="text-gray-300">—</span>}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
            emp.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {emp.role === 'admin' ? 'Admin' : 'Employee'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
            emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {emp.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditing((v) => !v)}>
            {editing ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Close' : 'Edit'}
          </Button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={5} className="p-0">
            <EditPanel emp={emp} onSaved={onUpdated} onClose={() => setEditing(false)} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Invite Form ──────────────────────────────────────────────────────────────

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
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send invite'); return }
    setSuccess(true)
    setEmail(''); setFullName(''); setRole('admin')
    setTimeout(() => { setSuccess(false); setOpen(false); onInvited() }, 2000)
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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Send Admin Invitation</h3>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Check className="h-4 w-4" /> Invite sent!
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" required className="h-8 text-sm" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@latranslation.com" required className="h-8 text-sm" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
            className="w-full h-8 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          >
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || success} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Send Invite
        </Button>
      </div>
    </form>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

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
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Team</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage admin portal access. Edit names, emails, passwords, and roles inline.
        </p>
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
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No team members yet</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <EmployeeRow key={emp.id} emp={emp} onUpdated={load} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
