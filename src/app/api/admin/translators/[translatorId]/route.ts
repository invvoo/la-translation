import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  translation_language_pairs: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

interface Props {
  params: Promise<{ translatorId: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { translatorId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('translation_translators').update(parsed.data).eq('id', translatorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
