import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/tokens'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ token: string }>
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { token } = await params
  const payload = await verifyToken(token)

  if (!payload || payload.type !== 'delivery') {
    return NextResponse.json({ error: 'Invalid or expired download link' }, { status: 410 })
  }

  const supabase = createServiceClient()
  const { data: job } = await supabase
    .from('translation_jobs')
    .select('id, translated_doc_path, document_name, job_type')
    .eq('id', payload.jobId)
    .maybeSingle()

  if (!job?.translated_doc_path) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const { data: signedUrlData, error } = await supabase.storage
    .from('job-documents')
    .createSignedUrl(job.translated_doc_path, 900) // 15 min

  if (error || !signedUrlData) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({
    url: signedUrlData.signedUrl,
    filename: job.document_name ?? 'translation.docx',
  })
}
