import { SupabaseClient } from '@supabase/supabase-js'

// Sets handled_by to userId only if the job has no handler yet.
export async function autoClaimJob(service: SupabaseClient, jobId: string, userId: string) {
  await service
    .from('translation_jobs')
    .update({ handled_by: userId } as any)
    .eq('id', jobId)
    .is('handled_by', null)
}
