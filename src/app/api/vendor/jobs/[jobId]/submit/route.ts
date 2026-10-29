import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/email/notify-admin'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: translator } = await service
    .from('translation_translators')
    .select('id')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()
  if (!translator) return NextResponse.json({ error: 'No active vendor account' }, { status: 403 })

  const { data: job } = await service
    .from('translation_jobs')
    .select('id, status')
    .eq('id', jobId)
    .eq('assigned_translator_id', translator.id)
    .single()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'docx'
  const safeFilename = file.name.normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || `submission.${ext}`
  const storagePath = `documents/vendor-submitted/${jobId}/${safeFilename}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await service.storage
    .from('job-documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })

  await service.from('translation_jobs').update({
    translated_doc_path: storagePath,
    status: 'in_progress',
  } as any).eq('id', jobId)

  await service.from('translation_job_status_history').insert({
    job_id: jobId,
    old_status: job.status,
    new_status: 'in_progress',
    note: 'Vendor submitted final translation',
  } as any)

  // Notify admin that vendor has submitted
  notifyAdmin({
    subject: `Vendor Submitted Translation — Job ${jobId.slice(0, 8).toUpperCase()}`,
    jobId,
    message: `${user.email} has uploaded their completed translation. Review it in the admin portal and deliver to the client.`,
  }).catch((err: unknown) => console.error('[vendor/submit] Admin notify failed:', err))

  return NextResponse.json({ ok: true })
}
