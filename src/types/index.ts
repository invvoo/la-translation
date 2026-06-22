import type { Database } from './database'

export type Job = Database['public']['Tables']['jobs']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Translator = Database['public']['Tables']['translators']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type LanguagePair = Database['public']['Tables']['language_pairs']['Row']
export type SpecialtyMultiplier = Database['public']['Tables']['specialty_multipliers']['Row']
export type EquipmentItem = Database['public']['Tables']['equipment_items']['Row']
export type TranslatorInvoice = Database['public']['Tables']['translator_invoices']['Row']
export type JobStatusHistory = Database['public']['Tables']['job_status_history']['Row']
export type EmailLog = Database['public']['Tables']['email_log']['Row']

export type JobType = Job['job_type']

export const TRANSLATION_STATUSES = [
  'draft',
  'quote_sent',
  'quote_accepted',
  'paid',
  'ai_translating',
  'ai_review_pending',
  'ai_failed',
  'assigned',
  'in_progress',
  'delivered',
  'complete',
  'cancelled',
] as const

export const INTERPRETATION_STATUSES = [
  'draft',
  'confirmed',
  'assigned',
  'completed',
  'invoiced',
  'paid',
  'cancelled',
] as const

export const EQUIPMENT_RENTAL_STATUSES = [
  'draft',
  'quote_sent',
  'quote_accepted',
  'paid',
  'dispatched',
  'returned',
  'deposit_settled',
  'complete',
  'cancelled',
] as const

export const NOTARY_STATUSES = [
  'draft',
  'quote_sent',
  'quote_accepted',
  'paid',
  'scheduled',
  'completed',
  'complete',
  'cancelled',
] as const

export const TRANSCRIPTION_STATUSES = [
  'draft',
  'quote_sent',
  'quote_accepted',
  'paid',
  'in_progress',
  'delivered',
  'complete',
  'cancelled',
] as const

export type JobStatus =
  | typeof TRANSLATION_STATUSES[number]
  | typeof INTERPRETATION_STATUSES[number]
  | typeof EQUIPMENT_RENTAL_STATUSES[number]
  | typeof NOTARY_STATUSES[number]
  | typeof TRANSCRIPTION_STATUSES[number]

export const JOB_TYPES: Record<string, string> = {
  translation: 'Translation',
  interpretation: 'Interpretation',
  equipment_rental: 'Equipment Rental',
  notary: 'Notary / Apostille',
  transcription: 'Transcription / Subtitling',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  quote_sent: 'Quote Sent',
  quote_accepted: 'Quote Accepted',
  paid: 'Payment Received',
  ai_translating: 'AI Translating',
  ai_review_pending: 'AI Draft Ready',
  ai_failed: 'AI Failed — Manual Required',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  complete: 'Complete',
  confirmed: 'Confirmed',
  completed: 'Completed',
  invoiced: 'Invoiced',
  dispatched: 'Dispatched',
  returned: 'Returned',
  deposit_settled: 'Deposit Settled',
  scheduled: 'Scheduled',
  cancelled: 'Cancelled',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  quote_sent: 'bg-blue-100 text-blue-700',
  quote_accepted: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  ai_translating: 'bg-purple-100 text-purple-700',
  ai_review_pending: 'bg-yellow-100 text-yellow-700',
  ai_failed: 'bg-red-100 text-red-700',
  assigned: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-blue-100 text-blue-700',
  delivered: 'bg-teal-100 text-teal-700',
  complete: 'bg-green-200 text-green-800',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-teal-100 text-teal-700',
  invoiced: 'bg-orange-100 text-orange-700',
  dispatched: 'bg-cyan-100 text-cyan-700',
  returned: 'bg-gray-100 text-gray-700',
  deposit_settled: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}
