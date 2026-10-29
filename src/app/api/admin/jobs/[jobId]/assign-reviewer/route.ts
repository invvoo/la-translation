import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({
    reviewerId: z.string().uuid().nullable(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 })

  const service = createServiceClient()

  const { data: job } = await service.from('translation_jobs').select('id, status').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await (service as any).from('translation_jobs').update({
    reviewer_id: parsed.data.reviewerId,
  }).eq('id', jobId)

  if (error) {
    console.error('[assign-reviewer]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (parsed.data.reviewerId) {
    await service.from('translation_job_status_history').insert({
      job_id: jobId,
      old_status: job.status,
      new_status: job.status,
      changed_by: user.id,
      note: `Internal reviewer assigned`,
    })
  }

  return NextResponse.json({ ok: true })
}
