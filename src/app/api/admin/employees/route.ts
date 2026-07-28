import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { AdminInviteEmail } from '@/lib/email/templates/admin-invite'
import { render as renderAsync } from '@react-email/components'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

// ── GET /api/admin/employees — list all employees with their emails ────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: employees, error } = await service
    .from('employees')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with email from auth.users
  const enriched = await Promise.all(
    (employees ?? []).map(async (emp) => {
      try {
        const { data: { user: authUser } } = await service.auth.admin.getUserById(emp.id)
        return { ...emp, email: authUser?.email ?? null }
      } catch {
        return { ...emp, email: null }
      }
    }),
  )

  return NextResponse.json(enriched)
}

// ── POST /api/admin/employees — invite a new admin by email ──────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Look up the invoking user's name to personalise the invite
  const service = createServiceClient()
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

  // Generate invite link via Supabase admin (does not send email — we do that via Resend)
  const redirectTo = `${BASE_URL}/auth/callback?next=/admin`
  const { data: linkData, error: linkError } = await (service.auth.admin as any).generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName }, redirectTo },
  })

  if (linkError) {
    // If user already exists, resend by generating a magic-link for them instead
    const errMsg: string = linkError.message ?? ''
    if (errMsg.toLowerCase().includes('already been registered') || errMsg.toLowerCase().includes('already exists')) {
      return NextResponse.json({ error: 'A user with this email already exists. Remove them from auth first if you want to re-invite.' }, { status: 409 })
    }
    console.error('[employees/invite] generateLink error:', linkError)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const newUserId: string = linkData?.user?.id
  const actionLink: string = linkData?.properties?.action_link

  if (!newUserId || !actionLink) {
    return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
  }

  // Insert into employees immediately (they'll have access as soon as they accept)
  const { error: insertError } = await service.from('employees').insert({
    id: newUserId,
    full_name: fullName,
    role,
    is_active: true,
  })

  if (insertError && !insertError.message.includes('duplicate')) {
    console.error('[employees/invite] insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send branded invite email via Resend
  try {
    const html = await renderAsync(AdminInviteEmail({
      inviteeName: fullName.split(' ')[0],
      inviterName: invoker?.full_name ?? undefined,
      acceptUrl: actionLink,
    }))
    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'You\'ve been invited to the LA Translation admin portal',
      html,
    })
    if (emailError) console.error('[employees/invite] email error:', emailError)
  } catch (e) {
    console.error('[employees/invite] email send failed:', e)
  }

  return NextResponse.json({ ok: true, userId: newUserId })
}
