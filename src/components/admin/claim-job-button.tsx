'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HandlerBadge } from './handler-badge'
import { Button } from '@/components/ui/button'
import { UserPlus, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Employee { id: string; full_name: string }

interface Props {
  jobId: string
  currentUserId: string
  handler: Employee | null
  translation_employees: Employee[]
}

export function ClaimJobButton({ jobId, currentUserId, handler, translation_employees }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  async function setHandler(employeeId: string | null) {
    setOpen(false)
    await fetch(`/api/admin/translation_jobs/${jobId}/handler`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId }),
    })
    startTransition(() => router.refresh())
  }

  const isMe = handler?.id === currentUserId

  return (
    <div className="relative inline-block">
      {!handler ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Unassigned</span>
          <Button size="sm" variant="outline" onClick={() => setHandler(currentUserId)} disabled={pending}>
            <UserPlus className="h-3.5 w-3.5" />
            Claim
          </Button>
          {translation_employees.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => setOpen(!open)} disabled={pending}>
              Assign <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <HandlerBadge id={handler.id} name={handler.full_name} size="md" showName />
          {isMe && <span className="text-xs text-gray-400">(you)</span>}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} disabled={pending} className="h-6 px-1.5 text-gray-400">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHandler(null)} disabled={pending} className="h-6 px-1.5 text-gray-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[180px]">
            {!isMe && (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 font-medium text-[#1a1a2e]"
                onClick={() => setHandler(currentUserId)}
              >
                <UserPlus className="h-3.5 w-3.5" /> Claim for myself
              </button>
            )}
            {translation_employees.filter(e => e.id !== currentUserId).map(emp => (
              <button
                key={emp.id}
                className={cn('w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2', handler?.id === emp.id && 'bg-gray-50 font-medium')}
                onClick={() => setHandler(emp.id)}
              >
                <HandlerBadge id={emp.id} name={emp.full_name} size="sm" />
                {emp.full_name}
              </button>
            ))}
            {handler && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                  onClick={() => setHandler(null)}
                >
                  <X className="h-3.5 w-3.5" /> Unassign
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
