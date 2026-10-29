'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search } from 'lucide-react'

export function JobSearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (q) {
      params.set('q', q)
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.replace(`/admin/translation_jobs?${params.toString()}`)
    })
  }, [router, searchParams])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
      <input
        type="search"
        placeholder="Search client, email, invoice…"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={handleChange}
        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] w-56"
      />
    </div>
  )
}
