import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  contact_name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

interface Props {
  params: Promise<{ clientId: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { clientId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('translation_clients').update(parsed.data).eq('id', clientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
