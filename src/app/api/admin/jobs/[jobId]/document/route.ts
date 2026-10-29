import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const type = req.nextUrl.searchParams.get('type')   // 'draft' | 'translated' | 'media' | null (original)
  const indexParam = req.nextUrl.searchParams.get('index') // for multi-doc originals

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: job } = await service
    .from('translation_jobs')
    .select('document_path, document_name, ai_draft_path, translated_doc_path, document_paths')
    .eq('id', jobId)
    .single() as unknown as {
      data: {
        document_path: string | null
        document_name: string | null
        ai_draft_path: string | null
        translated_doc_path: string | null
        document_paths: { path: string; name: string }[] | null
        media_path?: string | null
      } | null
    }

  let filePath: string | null | undefined

  if (type === 'draft') {
    filePath = job?.ai_draft_path
  } else if (type === 'translated') {
    filePath = job?.translated_doc_path
  } else if (type === 'media') {
    filePath = (job as any)?.media_path
  } else {
    // Original document — support multi-file via ?index=N
    const index = indexParam !== null ? parseInt(indexParam, 10) : 0
    const paths = job?.document_paths
    if (paths && Array.isArray(paths) && paths.length > 0 && index < paths.length) {
      filePath = paths[index]?.path
    } else {
      filePath = job?.document_path
    }
  }

  if (!filePath) {
    return NextResponse.json({
      error: type === 'draft' ? 'AI draft not available yet'
        : type === 'translated' ? 'No vendor submission yet'
        : type === 'media' ? 'Media file not found'
        : 'Document not found'
    }, { status: 404 })
  }

  const { data: signedUrl, error } = await service.storage
    .from('job-documents')
    .createSignedUrl(filePath, 300) // 5-minute link

  if (error || !signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl.signedUrl)
}
