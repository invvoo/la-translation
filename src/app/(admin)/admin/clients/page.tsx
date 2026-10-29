import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: translation_clients } = await supabase
    .from('translation_clients')
    .select('id, contact_name, email, phone, company_name, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Clients</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Since</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(translation_clients ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.contact_name}</td>
                <td className="px-4 py-3 text-gray-600">
                  <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.company_name ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-400">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/translation_clients/${c.id}`} className="text-xs text-blue-600 hover:underline">Jobs</Link>
                </td>
              </tr>
            ))}
            {(translation_clients ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No translation_clients yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
