import { render as renderAsync } from '@react-email/components'
import { inngest } from '@/inngest/client'
import { createServiceClient } from '@/lib/supabase/server'
import { translateDocumentBuffer } from '@/lib/ai/translate'
import { AiDraftReadyEmail } from '@/lib/email/templates/ai-draft-ready'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { Document, Paragraph, TextRun, Packer } from 'docx'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? 'info@latranslation.com'

export type TranslateJobEvent = {
  name: 'translation/run'
  data: {
    jobId: string
    triggeredBy?: string
  }
}

export const translateJob = inngest.createFunction(
  {
    id: 'translate-job',
    retries: 1,
    triggers: [{ event: 'translation/run' }],
  },
  async ({ event }: { event: TranslateJobEvent }) => {
    const { jobId, triggeredBy } = event.data as TranslateJobEvent['data']
    const service = createServiceClient()

    // Fetch job + specialty + custom rules
    const { data: job, error: jobErr } = await service
      .from('translation_jobs')
      .select('id, status, source_lang, target_lang, document_path, document_name, specialty_id, word_count, invoice_number, translation_specialty_multipliers:specialty_id(name), translation_clients:client_id(contact_name, email)')
      .eq('id', jobId)
      .single() as any
    if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message}`)

    const specialtyName = (job.translation_specialty_multipliers as any)?.name ?? 'General'

    const { data: rulesSetting } = await service
      .from('translation_system_settings')
      .select('value')
      .eq('key', 'ai_translation_rules')
      .maybeSingle()
    const customSystemPrompt = (rulesSetting as any)?.value?.trim() || undefined

    try {
      // Download source document
      const { data: fileData, error: dlError } = await service.storage
        .from('job-documents')
        .download(job.document_path)
      if (dlError || !fileData) throw new Error(`Storage download failed: ${dlError?.message}`)

      const buffer = Buffer.from(await fileData.arrayBuffer())
      const docName = job.document_name ?? 'document.pdf'

      // Translate (handles text extraction + scanned PDF vision internally)
      const translatedText = await translateDocumentBuffer(
        buffer,
        docName,
        job.source_lang,
        job.target_lang,
        specialtyName,
        customSystemPrompt,
      )

      // Save as .docx
      const doc = new Document({
        sections: [{
          children: translatedText.split('\n').map((line: string) => new Paragraph({ children: [new TextRun(line)] })),
        }],
      })
      const docBuffer = await Packer.toBuffer(doc)
      const draftPath = `documents/ai-draft/${jobId}/ai_draft.docx`

      const { error: uploadError } = await service.storage
        .from('job-documents')
        .upload(draftPath, docBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })
      if (uploadError) throw new Error(`Draft upload failed: ${uploadError.message}`)

      await service.from('translation_jobs').update({
        status: 'ai_review_pending',
        ai_draft_path: draftPath,
        ai_translation_completed_at: new Date().toISOString(),
      } as any).eq('id', jobId)

      await service.from('translation_job_status_history').insert({
        job_id: jobId,
        old_status: 'ai_translating',
        new_status: 'ai_review_pending',
        note: `AI draft generated${triggeredBy ? ` (${triggeredBy})` : ''}`,
      })

      // Email admin that draft is ready
      try {
        const clientName = (job.translation_clients as any)?.contact_name ?? 'Client'
        const html = await renderAsync(AiDraftReadyEmail({
          jobId,
          clientName,
          sourceLang: job.source_lang,
          targetLang: job.target_lang,
          wordCount: job.word_count ?? 0,
        }))
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `AI Draft Ready — Assign Reviewer · ${job.invoice_number ?? jobId}`,
          html,
        })
      } catch (e) {
        console.error('[translate-job] admin email failed:', e)
      }

      return { ok: true, draftPath }
    } catch (err) {
      await service.from('translation_jobs').update({ status: 'ai_failed' } as any).eq('id', jobId)
      await service.from('translation_job_status_history').insert({
        job_id: jobId,
        old_status: 'ai_translating',
        new_status: 'ai_failed',
        note: `AI translation error: ${String(err).slice(0, 200)}`,
      })
      throw err
    }
  },
)
