import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ jobId: string }>
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job } = await supabase.from('translation_jobs').select('status').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft-delete: set status to 'cancelled' so it disappears from active list but stays for audit
  const { error } = await supabase.from('translation_jobs').update({ status: 'cancelled' } as any).eq('id', jobId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'cancelled',
    changed_by: user.id,
    note: 'Marked as not proceeding',
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { note } = await req.json()
  const { error } = await (supabase as any).from('translation_jobs').update({ employee_notes: note ?? null }).eq('id', jobId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
