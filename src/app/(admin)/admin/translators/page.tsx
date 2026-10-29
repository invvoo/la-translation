import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ApproveVendorButtons } from '@/components/admin/approve-vendor-buttons'

export default async function TranslatorsPage() {
  const supabase = await createClient()

  const [{ data: translation_translators }, { data: pending }] = await Promise.all([
    supabase
      .from('translation_translators')
      .select('id, full_name, email, phone, translation_language_pairs, specialties, stripe_connect_status, is_active')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('translation_translators')
      .select('id, full_name, email, translation_language_pairs, specialties, vendor_type, applied_at')
      .eq('is_active', false)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: true }),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Translators &amp; Interpreters</h1>
        <Link href="/admin/translation_translators/new">
          <Button size="sm"><Plus className="h-4 w-4" /> Add Translator</Button>
        </Link>
      </div>

      {/* Pending vendor applications */}
      {(pending ?? []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">Pending Applications ({pending!.length})</h2>
            <p className="text-xs text-amber-700 mt-0.5">Vendors who signed up and are awaiting approval</p>
          </div>
          <div className="divide-y divide-amber-100">
            {pending!.map((t: any) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{t.full_name}</p>
                  <p className="text-xs text-gray-500">{t.email}</p>
                  {t.vendor_type && <p className="text-xs text-amber-700 mt-0.5 capitalize">{t.vendor_type}</p>}
                  {(t.translation_language_pairs ?? []).length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(t.translation_language_pairs as string[]).slice(0, 4).join(', ')}
                      {(t.translation_language_pairs as string[]).length > 4 && ` +${(t.translation_language_pairs as string[]).length - 4} more`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/translation_translators/${t.id}`} className="text-xs text-gray-500 hover:underline mr-2">View profile</Link>
                  <ApproveVendorButtons translatorId={t.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active translation_translators */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Languages</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Stripe</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(translation_translators ?? []).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{t.full_name}</p>
                  <p className="text-xs text-gray-400">{t.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {(t.translation_language_pairs ?? []).slice(0, 3).join(', ')}
                  {(t.translation_language_pairs ?? []).length > 3 && ` +${t.translation_language_pairs.length - 3} more`}
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn('text-xs', {
                    'bg-green-100 text-green-700': t.stripe_connect_status === 'active',
                    'bg-yellow-100 text-yellow-700': t.stripe_connect_status === 'pending',
                    'bg-red-100 text-red-700': t.stripe_connect_status === 'restricted',
                    'bg-gray-100 text-gray-500': !t.stripe_connect_status,
                  })}>
                    {t.stripe_connect_status ?? 'not connected'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/translation_translators/${t.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {(translation_translators ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No active translation_translators yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
