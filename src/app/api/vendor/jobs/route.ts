import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: translator } = await service
    .from('translation_translators')
    .select('id, full_name, translation_language_pairs, specialties, is_active')
    .eq('email', user.email)
    .maybeSingle()

  if (!translator) {
    return NextResponse.json({ error: 'no_account', message: 'No vendor account found for this email.' }, { status: 403 })
  }

  if (!translator.is_active) {
    return NextResponse.json({ error: 'pending_approval', message: 'Your application is pending review.' }, { status: 403 })
  }

  const { data: translation_jobs } = await (service as any)
    .from('translation_jobs')
    .select('id, job_type, status, source_lang, target_lang, word_count, invoice_number, deadline_at, assigned_at, created_at, document_name, document_path, ai_draft_path, translated_doc_path, vendor_confirmed_rate, vendor_accepted_at, vendor_overtime_requested, translator_acceptance_token, translation_clients(contact_name)')
    .eq('assigned_translator_id', translator.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ translator, translation_jobs: translation_jobs ?? [] })
}
