'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { MoreVertical, ExternalLink, Trash2, Loader2 } from 'lucide-react'

interface Props {
  jobId: string
  status: string
  jobType?: string
  afterDelete?: string
}

const FINAL = ['complete', 'cancelled']

export function JobActionsDropdown({ jobId, status, jobType, afterDelete = '/admin/translation_jobs' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => { setOpen(false); setConfirming(false) }, [])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, close])

  function toggleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen((o) => !o)
    setConfirming(false)
  }

  function stopProp(e: React.MouseEvent) { e.preventDefault(); e.stopPropagation() }

  async function deleteJob(e: React.MouseEvent) {
    stopProp(e)
    setLoading(true)
    await fetch(`/api/admin/translation_jobs/${jobId}`, { method: 'DELETE' })
    window.location.href = afterDelete
  }

  const isFinal = FINAL.includes(status)

  const menu = open && dropPos ? createPortal(
    <div
      style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
      className="w-52 bg-white rounded-lg border border-gray-200 shadow-lg py-1 text-sm"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {confirming ? (
        <div className="px-3 py-2 space-y-2">
          <p className="text-gray-700 text-xs font-medium">Mark as not proceeding and remove from active list?</p>
          <div className="flex gap-2">
            <button onClick={deleteJob} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-xs font-medium">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
            </button>
            <button onClick={(e) => { stopProp(e); setConfirming(false) }}
              className="flex-1 text-center border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={(e) => { stopProp(e); router.push(`/admin/translation_jobs/${jobId}`) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700">
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" /> View Details
          </button>
          {!isFinal && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={(e) => { stopProp(e); setConfirming(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Not Proceeding
              </button>
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  ) : null

  return (
    <div className="relative" onClick={stopProp}>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Job actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menu}
    </div>
  )
}
