import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geo/geocode'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: translator } = await (service as any)
    .from('translation_translators')
    .select('id, full_name, email, phone, vendor_type, translation_language_pairs, specialties, certifications, per_word_rate, hourly_rate, notes, payment_method, payment_details, address, city, state, zip, lat, lng')
    .eq('email', user.email)
    .maybeSingle()

  if (!translator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ translator })
}

const schema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
  translation_language_pairs: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  per_word_rate: z.number().positive().nullable().optional(),
  hourly_rate: z.number().positive().nullable().optional(),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(['stripe', 'paypal', 'zelle', 'venmo', 'check', 'other']).optional(),
  payment_details: z.string().max(500).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data: existing } = await (service as any)
    .from('translation_translators')
    .select('id, address, city, state, zip, lat, lng')
    .eq('email', user.email)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { ...parsed.data }

  // Geocode if address-related fields changed
  const addrChanged = ['address', 'city', 'state', 'zip'].some(
    (k) => k in parsed.data && (parsed.data as any)[k] !== (existing as any)[k]
  )
  if (addrChanged) {
    const fullAddr = [
      parsed.data.address ?? existing.address,
      parsed.data.city ?? existing.city,
      parsed.data.state ?? existing.state,
      parsed.data.zip ?? existing.zip,
    ].filter(Boolean).join(', ')

    const coords = fullAddr ? await geocodeAddress(fullAddr) : null
    updates.lat = coords?.lat ?? null
    updates.lng = coords?.lng ?? null
  }

  const { error } = await (service as any)
    .from('translation_translators')
    .update(updates)
    .eq('id', existing.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
