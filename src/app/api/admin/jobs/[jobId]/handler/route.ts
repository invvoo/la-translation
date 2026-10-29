import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // employeeId: string to assign, null to unassign, 'me' to assign current user
  const employeeId: string | null = body.employeeId === 'me' ? user.id : (body.employeeId ?? null)

  const service = createServiceClient()
  const { error } = await service
    .from('translation_jobs')
    .update({ handled_by: employeeId } as any)
    .eq('id', jobId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
