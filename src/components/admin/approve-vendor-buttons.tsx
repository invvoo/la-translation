'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function ApproveVendorButtons({ translatorId }: { translatorId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    setActing('approve')
    await fetch(`/api/admin/translation_translators/${translatorId}/approve`, { method: 'POST' })
    startTransition(() => router.refresh())
  }

  async function handleReject() {
    if (!confirm('Reject and delete this application?')) return
    setActing('reject')
    await fetch(`/api/admin/translation_translators/${translatorId}/approve`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleApprove} disabled={pending || !!acting} className="bg-green-600 hover:bg-green-700 h-7 text-xs">
        {acting === 'approve' && pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
      </Button>
      <Button size="sm" variant="outline" onClick={handleReject} disabled={pending || !!acting} className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">
        {acting === 'reject' && pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
      </Button>
    </div>
  )
}
