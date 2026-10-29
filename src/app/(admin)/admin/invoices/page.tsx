import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import PayoutButton from './payout-button'
import { ApproveInvoiceButton } from './approve-invoice-button'
import MarkPaidButton from './mark-paid-button'

const METHOD_BADGE: Record<string, { label: string; className: string }> = {
  stripe: { label: 'Stripe',  className: 'bg-violet-100 text-violet-700' },
  paypal: { label: 'PayPal',  className: 'bg-blue-100 text-blue-700' },
  zelle:  { label: 'Zelle',   className: 'bg-purple-100 text-purple-700' },
  venmo:  { label: 'Venmo',   className: 'bg-sky-100 text-sky-700' },
  check:  { label: 'Check',   className: 'bg-amber-100 text-amber-700' },
  other:  { label: 'Manual',  className: 'bg-gray-100 text-gray-600' },
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('translation_translator_invoices')
    .select('*, translation_translators(full_name, email, stripe_connect_id, payment_method, payment_details), translation_jobs(invoice_number, job_type, translation_clients(contact_name))')
    .in('status', ['submitted', 'approved', 'queued', 'paid', 'failed'])
    .order('created_at', { ascending: true })

  const submitted = (invoices ?? []).filter((i) => i.status === 'submitted')
  const pending = (invoices ?? []).filter((i) => i.status === 'approved')
  const others = (invoices ?? []).filter((i) => !['submitted', 'approved'].includes(i.status))
  const now = new Date()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Invoices &amp; Payouts</h1>

      {/* Submitted invoices awaiting approval */}
      {submitted.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">Awaiting Approval ({submitted.length})</h2>
            <p className="text-xs text-amber-700 mt-0.5">Vendor-submitted invoices — approve to queue for net-30 payout</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-amber-50 border-b border-amber-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-amber-800">Vendor</th>
                <th className="px-4 py-3 text-left font-medium text-amber-800">Job</th>
                <th className="px-4 py-3 text-right font-medium text-amber-800">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-amber-800">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {submitted.map((inv: any) => {
                const t = inv.translation_translators ?? {}
                const method = t.payment_method ?? 'check'
                const badge = METHOD_BADGE[method] ?? METHOD_BADGE.other
                return (
                  <tr key={inv.id} className="hover:bg-amber-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.full_name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                      <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inv.translation_jobs?.invoice_number ?? inv.job_id?.slice(0, 8)}
                      <p className="text-xs text-gray-400">{inv.translation_jobs?.translation_clients?.contact_name}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(inv.amount))}</td>
                    <td className="px-4 py-3 text-right">
                      <ApproveInvoiceButton invoiceId={inv.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending payouts */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pending Payouts ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-400 text-sm">No pending payouts</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Translator</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Job</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Due</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map((inv: any) => {
                const isDue = inv.payout_due_at && new Date(inv.payout_due_at) <= now
                const t = inv.translation_translators ?? {}
                const method = t.payment_method ?? 'check'
                const badge = METHOD_BADGE[method] ?? METHOD_BADGE.other
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.full_name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                      <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inv.translation_jobs?.invoice_number ?? inv.job_id.slice(0, 8)}
                      <p className="text-xs text-gray-400">{inv.translation_jobs?.translation_clients?.contact_name}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(inv.amount))}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={isDue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {inv.payout_due_at ? formatDate(inv.payout_due_at) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.stripe_connect_id ? (
                        <PayoutButton invoiceId={inv.id} />
                      ) : method !== 'stripe' ? (
                        <MarkPaidButton
                          invoiceId={inv.id}
                          paymentMethod={method}
                          paymentDetails={t.payment_details}
                          amount={Number(inv.amount)}
                          translatorName={t.full_name ?? ''}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Stripe account</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* History */}
      {others.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Translator</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Job</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {others.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.translation_translators?.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.translation_jobs?.invoice_number ?? inv.job_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(inv.amount))}</td>
                  <td className="px-4 py-3 text-right capitalize">
                    <span className={inv.status === 'paid' ? 'text-green-600 font-medium' : inv.status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
