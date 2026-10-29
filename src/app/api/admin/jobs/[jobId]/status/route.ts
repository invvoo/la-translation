import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { autoClaimJob } from '@/lib/admin/auto-claim'

const schema = z.object({
  status: z.string().min(1),
  note: z.string().optional(),
  appointmentAt: z.string().datetime().optional(),
  dispatchAt: z.string().datetime().optional(),
})

interface Props {
  params: Promise<{ jobId: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, note, appointmentAt, dispatchAt } = parsed.data

  const { data: job } = await supabase.from('translation_jobs').select('status').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const updates: Record<string, unknown> = { status }
  if (appointmentAt) updates.appointment_at = appointmentAt
  if (dispatchAt) updates.dispatch_at = dispatchAt
  if (status === 'returned') updates.return_at = new Date().toISOString()
  if (status === 'complete' || status === 'completed') updates.delivered_at = new Date().toISOString()

  const { error } = await supabase.from('translation_jobs').update(updates as any).eq('id', jobId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await autoClaimJob(supabase as any, jobId, user.id)

  await supabase.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: status,
    changed_by: user.id,
    note: note ?? null,
  })

  return NextResponse.json({ ok: true })
}
