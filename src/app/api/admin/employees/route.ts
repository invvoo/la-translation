import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { AdminInviteEmail } from '@/lib/email/templates/admin-invite'
import { render as renderAsync } from '@react-email/components'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

// ── GET /api/admin/employees ─────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const admin = (service.auth as any).admin

  const { data: employees, error } = await service
    .from('employees')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all(
    (employees ?? []).map(async (emp) => {
      try {
        const { data } = await admin.getUserById(emp.id)
        return { ...emp, email: data?.user?.email ?? null }
      } catch {
        return { ...emp, email: null }
      }
    }),
  )

  return NextResponse.json(enriched)
}

// ── POST /api/admin/employees — invite or re-link an admin by email ──────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const admin = (service.auth as any).admin

  const { data: invoker } = await service
    .from('employees')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const body = await req.json()
  const email: string = (body.email ?? '').trim().toLowerCase()
  const fullName: string = (body.full_name ?? '').trim()
  const role: 'admin' | 'employee' = body.role === 'employee' ? 'employee' : 'admin'

  if (!email || !fullName) {
    return NextResponse.json({ error: 'email and full_name are required' }, { status: 400 })
  }

  const redirectTo = `${BASE_URL}/auth/callback?next=/admin`

  // Find out if this email already has a Supabase auth account
  const { data: { users: allUsers }, error: listErr } = await admin.listUsers({ perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const existingAuthUser = (allUsers ?? []).find(
    (u: any) => u.email?.toLowerCase() === email,
  )

  let userId: string
  let actionLink: string
  let emailSubject: string

  if (existingAuthUser) {
    // Auth user exists — generate a password-reset link so they can set their password
    userId = existingAuthUser.id
    const { data: rl, error: rlErr } = await admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    if (rlErr) return NextResponse.json({ error: rlErr.message }, { status: 500 })
    actionLink = rl?.properties?.action_link
    emailSubject = 'Set up your LA Translation admin password'
  } else {
    // Brand-new user — create via invite
    const { data: il, error: ilErr } = await admin.generateLink({
      type: 'invite',
      email,
      options: { data: { full_name: fullName }, redirectTo },
    })
    if (ilErr) return NextResponse.json({ error: ilErr.message }, { status: 500 })
    userId = il?.user?.id
    actionLink = il?.properties?.action_link
    emailSubject = "You've been invited to the LA Translation admin portal"
  }

  if (!userId || !actionLink) {
    return NextResponse.json({ error: 'Failed to generate access link' }, { status: 500 })
  }

  // Upsert employee row — handles first-time invites and re-links for existing auth users
  await service.from('employees').upsert(
    { id: userId, full_name: fullName, role, is_active: true } as any,
    { onConflict: 'id' },
  )

  // Send branded email via Resend
  try {
    const html = await renderAsync(AdminInviteEmail({
      inviteeName: fullName.split(' ')[0],
      inviterName: invoker?.full_name ?? undefined,
      acceptUrl: actionLink,
    }))
    await getResend().emails.send({ from: FROM_EMAIL, to: email, subject: emailSubject, html })
  } catch (e) {
    console.error('[employees/invite] email send failed:', e)
  }

  return NextResponse.json({ ok: true, userId })
}
