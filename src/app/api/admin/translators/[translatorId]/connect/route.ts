import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

interface Props {
  params: Promise<{ translatorId: string }>
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { translatorId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: translator } = await service
    .from('translators')
    .select('id, full_name, email, stripe_connect_id')
    .eq('id', translatorId)
    .single()

  if (!translator) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let accountId = translator.stripe_connect_id

  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: 'express',
      email: translator.email,
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id

    await service.from('translators').update({
      stripe_connect_id: accountId,
      stripe_connect_status: 'pending',
    }).eq('id', translatorId)
  }

  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/translators/${translatorId}`,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/translators/${translatorId}`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ onboardingUrl: link.url })
}
