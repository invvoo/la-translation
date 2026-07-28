import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const body = await req.json()
  const { full_name, role, is_active, email, password } = body

  // Update employees table fields
  const tableUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) tableUpdates.full_name = String(full_name).trim()
  if (role !== undefined && ['admin', 'employee'].includes(role)) tableUpdates.role = role
  if (is_active !== undefined) tableUpdates.is_active = Boolean(is_active)

  if (Object.keys(tableUpdates).length > 0) {
    const { error } = await service.from('employees').update(tableUpdates as any).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update email / password in auth (admin bypass — no confirmation required)
  const authUpdates: Record<string, unknown> = {}
  if (email !== undefined && String(email).trim()) authUpdates.email = String(email).trim().toLowerCase()
  if (password !== undefined && String(password).trim()) authUpdates.password = String(password).trim()

  if (Object.keys(authUpdates).length > 0) {
    const admin = (service.auth as any).admin

    // Check if the auth user exists — employee rows inserted manually may have no matching auth user
    const { data: existingUser } = await admin.getUserById(id)
    if (!existingUser?.user) {
      return NextResponse.json(
        { error: 'No Supabase auth account found for this employee. Deactivate this row and use the Invite button to set up their account properly.' },
        { status: 422 },
      )
    }

    const { error } = await admin.updateUserById(id, authUpdates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const service = createServiceClient()
  // Hard delete breaks the job_status_history FK — deactivate instead
  const { error } = await service.from('employees').update({ is_active: false } as any).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
