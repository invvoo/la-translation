'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AiTranslateButton } from '@/components/admin/ai-translate-button'
import { SendTranslatorInquiryButton } from '@/components/admin/send-translator-inquiry-button'
import { Sparkles, UserPlus, Send, Eye, CheckCircle2, RefreshCw, Upload } from 'lucide-react'

interface Props {
  jobId: string
  status: string
  hasDocument: boolean
  hasAiDraft: boolean
  hasVendorSubmission: boolean
  sourceLang?: string | null
  targetLang?: string | null
}

export function TranslationWorkflowActions({ jobId, status, hasDocument, hasAiDraft, hasVendorSubmission, sourceLang, targetLang }: Props) {
  if (status === 'draft') {
    return (
      <Link href={`/admin/translation_jobs/${jobId}/quote`}>
        <Button size="sm" className="bg-[#1a1a2e] hover:bg-[#2a2a4e]">
          <Send className="h-3.5 w-3.5 mr-1.5" /> Review &amp; Send Quote
        </Button>
      </Link>
    )
  }

  if (status === 'quote_sent') {
    return (
      <Link href={`/admin/translation_jobs/${jobId}/quote`}>
        <Button size="sm" variant="outline">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resend / Edit Quote
        </Button>
      </Link>
    )
  }

  if (status === 'quote_accepted') {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
        Awaiting client payment
      </div>
    )
  }

  if (status === 'paid' || status === 'ai_failed') {
    return (
      <div className="flex flex-col gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next step — choose one:</p>
        <div className="flex flex-wrap gap-2 items-start">
          {hasDocument && (
            <div className="flex flex-col gap-1">
              <AiTranslateButton jobId={jobId} />
              <p className="text-[10px] text-gray-400 pl-1">Generate AI draft, then assign a reviewer</p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <SendTranslatorInquiryButton jobId={jobId} sourceLang={sourceLang} targetLang={targetLang} />
            <p className="text-[10px] text-gray-400 pl-1">Email translation_translators to confirm availability</p>
          </div>
          <div className="flex flex-col gap-1">
            <Link href={`/admin/translation_jobs/${jobId}/assign`}>
              <Button size="sm" variant="outline">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign Directly
              </Button>
            </Link>
            <p className="text-[10px] text-gray-400 pl-1">Skip inquiry, assign a translator now</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'ai_translating') {
    return (
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-sm text-purple-800">
        <Sparkles className="h-4 w-4 animate-pulse" /> AI translation in progress…
      </div>
    )
  }

  if (status === 'ai_review_pending') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/translation_jobs/${jobId}/assign`}>
            <Button size="sm" className="bg-[#1a1a2e] hover:bg-[#2a2a4e]">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign External Translator
            </Button>
          </Link>
          {hasAiDraft && (
            <a href={`/api/admin/translation_jobs/${jobId}/document?type=draft`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> View AI Draft
              </Button>
            </a>
          )}
          <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
            <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Deliver to Client
            </Button>
          </Link>
        </div>
        {hasDocument && (
          <div className="flex items-center gap-2">
            <AiTranslateButton jobId={jobId} label="Re-run AI Translation" />
            <span className="text-[10px] text-gray-400">Overwrites current draft using your saved AI rules</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'assigned') {
    if (hasVendorSubmission) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/translation_jobs/${jobId}/review`}>
              <Button size="sm" className="bg-green-700 hover:bg-green-800">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Review Submission
              </Button>
            </Link>
            <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Deliver to Client
              </Button>
            </Link>
          </div>
          {hasDocument && (
            <div className="flex items-center gap-2">
              <AiTranslateButton jobId={jobId} label="Re-run AI Translation" />
              <span className="text-[10px] text-gray-400">Overwrites current draft using your saved AI rules</span>
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm text-blue-800">
            Translator assigned — awaiting submission
          </div>
          {(hasAiDraft || hasDocument) && (
            <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Deliver to Client
              </Button>
            </Link>
          )}
        </div>
        {hasDocument && (
          <div className="flex items-center gap-2">
            <AiTranslateButton jobId={jobId} label="Re-run AI Translation" />
            <span className="text-[10px] text-gray-400">Overwrites current draft using your saved AI rules</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'in_progress') {
    if (hasVendorSubmission) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/translation_jobs/${jobId}/review`}>
              <Button size="sm" className="bg-green-700 hover:bg-green-800">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Review Submission
              </Button>
            </Link>
            <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Deliver to Client
              </Button>
            </Link>
          </div>
          {hasDocument && (
            <div className="flex items-center gap-2">
              <AiTranslateButton jobId={jobId} label="Re-run AI Translation" />
              <span className="text-[10px] text-gray-400">Overwrites current draft using your saved AI rules</span>
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm text-blue-800">
            Translation in progress — awaiting vendor submission
          </div>
          {(hasAiDraft || hasDocument) && (
            <Link href={`/admin/translation_jobs/${jobId}/deliver`}>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Deliver to Client
              </Button>
            </Link>
          )}
        </div>
        {hasDocument && (
          <div className="flex items-center gap-2">
            <AiTranslateButton jobId={jobId} label="Re-run AI Translation" />
            <span className="text-[10px] text-gray-400">Overwrites current draft using your saved AI rules</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4" /> Delivered to client
      </div>
    )
  }

  return null
}
