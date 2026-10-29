import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

interface Props {
  params: Promise<{ jobId: string }>
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { jobId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: job, error: jobErr } = await service
    .from('translation_jobs')
    .select('id, job_type, status, source_lang, target_lang, document_path, document_name')
    .eq('id', jobId)
    .single() as any

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Job not found', detail: jobErr?.message ?? null }, { status: 404 })
  }
  if (!job.document_path) {
    return NextResponse.json({ error: 'No document uploaded yet' }, { status: 400 })
  }
  if (!job.source_lang || !job.target_lang) {
    return NextResponse.json({ error: 'Job is missing source or target language' }, { status: 400 })
  }

  // Mark as queued immediately so the UI reflects it
  await service.from('translation_jobs').update({
    status: 'ai_translating',
    ai_translation_started_at: new Date().toISOString(),
  } as any).eq('id', jobId)

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'ai_translating',
    changed_by: user.id,
    note: 'AI translation queued (manual trigger)',
  })

  // Hand off to Inngest — runs outside the request lifecycle
  await inngest.send({
    name: 'translation/run',
    data: { jobId, triggeredBy: 'manual' },
  })

  return NextResponse.json({ ok: true, status: 'ai_translating' })
}
