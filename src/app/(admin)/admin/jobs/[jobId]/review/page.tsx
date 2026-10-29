import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReviewDeliverPanel } from '@/components/admin/review-deliver-panel'

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()

  const { data: job } = await (supabase as any)
    .from('translation_jobs')
    .select('id, status, job_type, document_path, document_paths, translated_doc_path, ai_draft_path, translation_clients(contact_name, email), translation_translators:assigned_translator_id(full_name, email)')
    .eq('id', jobId)
    .single()

  if (!job) notFound()
  if (!job.translated_doc_path) {
    return (
      <div className="p-8 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#1a1a2e]">Review Submission</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
          No vendor submission has been received yet for this job.
        </div>
      </div>
    )
  }

  const client = job.translation_clients as any
  const translator = job.translation_translators as any

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/translation_jobs/${jobId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Review Vendor Submission</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-5">
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="text-gray-500 w-28">Client</dt><dd className="font-medium">{client?.contact_name}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-500 w-28">Email</dt><dd>{client?.email}</dd></div>
          {translator && (
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Translator</dt><dd>{translator.full_name}</dd></div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Documents</h2>
        <div className="space-y-3">
          {/* Show all uploaded originals */}
          {(() => {
            const paths = job.document_paths as { path: string; name: string }[] | null
            if (paths && paths.length > 0) {
              return paths.map((d: { path: string; name: string }, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[260px]">{paths.length > 1 ? `Doc ${i + 1}: ${d.name}` : 'Original document'}</span>
                  <a href={`/api/admin/translation_jobs/${jobId}/document?index=${i}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline font-medium ml-3 shrink-0">
                    Open ↗
                  </a>
                </div>
              ))
            }
            if (job.document_path) {
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Original document</span>
                  <a href={`/api/admin/translation_jobs/${jobId}/document`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline font-medium">
                    Open ↗
                  </a>
                </div>
              )
            }
            return null
          })()}
          {job.ai_draft_path && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI draft</span>
              <a href={`/api/admin/translation_jobs/${jobId}/document?type=draft`} target="_blank" rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:underline font-medium">
                Open ↗
              </a>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm font-semibold text-gray-900">Vendor submission</span>
            <a href={`/api/admin/translation_jobs/${jobId}/document?type=translated`} target="_blank" rel="noopener noreferrer"
              className="text-sm text-green-700 hover:underline font-semibold">
              Open ↗
            </a>
          </div>
        </div>
      </div>

      <ReviewDeliverPanel jobId={jobId} />
    </div>
  )
}
