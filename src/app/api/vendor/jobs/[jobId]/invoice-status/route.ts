import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ jobId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: translator } = await service
    .from('translation_translators')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()
  if (!translator) return NextResponse.json({ invoice: null })

  const { data: invoice } = await service
    .from('translation_translator_invoices')
    .select('id, amount, status')
    .eq('job_id', jobId)
    .eq('translator_id', translator.id)
    .maybeSingle()

  return NextResponse.json({ invoice: invoice ?? null })
}
