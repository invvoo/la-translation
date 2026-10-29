import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: job } = await service
    .from('translation_jobs')
    .select('translated_doc_path, ai_draft_path')
    .eq('id', jobId)
    .single() as any

  return NextResponse.json({
    hasSubmission: !!(job?.translated_doc_path),
    hasAiDraft: !!(job?.ai_draft_path),
  })
}
