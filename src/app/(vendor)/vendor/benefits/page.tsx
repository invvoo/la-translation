'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoImage } from '@/components/logo-image'
import {
  Zap, DollarSign, ShieldCheck, FileText, Upload, Send,
  CreditCard, ChevronRight, Star, CheckCircle2, ArrowRight,
} from 'lucide-react'

const WORKFLOW_STEPS = [
  { icon: FileText,   label: 'Job assigned',    sub: 'Email + calendar invite'    },
  { icon: Upload,     label: 'Submit work',      sub: 'One-click file upload'      },
  { icon: Send,       label: 'Submit invoice',   sub: 'Enter amount, one click'    },
  { icon: CreditCard, label: 'Get paid',         sub: 'Net-30 via direct deposit'  },
]

function WorkflowDemo() {
  const [activeStep, setActiveStep] = useState(0)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100">
        {WORKFLOW_STEPS.map((s, i) => (
          <button
            key={i} type="button" onClick={() => setActiveStep(i)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${activeStep === i ? 'bg-[#1a1a2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {i + 1}. {s.label.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#1a1a2e] transition-all duration-500"
          style={{ width: `${((activeStep + 1) / WORKFLOW_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="p-5 min-h-[220px]">
        {activeStep === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Step 1 — You receive a job</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">New Assignment — Spanish → English</p>
                  <p className="text-xs text-gray-500 mt-0.5">Legal document · 1,240 words · Due Jan 15</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-[#1a1a2e] text-white text-xs px-3 py-1 rounded-full">
                    <span>PO-20250115-0012</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Email notification</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">+ calendar .ics invite</p>
              </div>
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Portal access</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">Documents ready to download</p>
              </div>
            </div>
            <button type="button" onClick={() => setActiveStep(1)} className="w-full text-xs text-[#1a1a2e] font-medium flex items-center justify-center gap-1 mt-1">
              Next step <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Step 2 — Submit your work</p>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#1a1a2e] transition-colors cursor-pointer group">
              <Upload className="h-8 w-8 text-gray-300 group-hover:text-[#1a1a2e] mx-auto mb-2 transition-colors" />
              <p className="text-sm font-medium text-gray-700">Click to upload completed translation</p>
              <p className="text-xs text-gray-400 mt-0.5">.docx · .pdf · .txt</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Translation submitted — coordinator will review shortly.
            </div>
            <button type="button" onClick={() => setActiveStep(2)} className="w-full text-xs text-[#1a1a2e] font-medium flex items-center justify-center gap-1 mt-1">
              Next step <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Step 3 — Submit your invoice</p>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Invoice amount</p>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <span className="text-gray-400 text-sm mr-1">$</span>
                  <span className="text-sm font-mono font-semibold text-gray-900">99.20</span>
                  <span className="text-xs text-gray-400 ml-auto">1,240 words × $0.08</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Note (optional)</p>
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">Rush delivery applied…</div>
              </div>
              <div className="bg-[#1a1a2e] text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                <Send className="h-3.5 w-3.5" /> Submit Invoice
              </div>
            </div>
            <button type="button" onClick={() => setActiveStep(3)} className="w-full text-xs text-[#1a1a2e] font-medium flex items-center justify-center gap-1 mt-1">
              Next step <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Step 4 — Get paid</p>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Invoice #INV-2025-0042</span>
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Approved</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">$99.20</span>
                <span className="text-xs text-gray-400">Due Jan 30, 2025</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Payment status</span>
                  <span>Queued for transfer</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-green-500 rounded-full" />
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
                <CreditCard className="h-4 w-4 shrink-0" />
                Direct deposit to your bank account — net 30 days from approval
              </div>
            </div>
            <button type="button" onClick={() => setActiveStep(0)} className="w-full text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              ↩ Start over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VendorBenefitsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <LogoImage className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/vendor/login" className="text-sm text-gray-500 hover:text-gray-800">Sign in</Link>
          <Link href="/vendor/signup" className="text-sm font-semibold text-white bg-[#1a1a2e] px-4 py-2 rounded-lg hover:bg-[#2a2a4e] transition-colors">
            Apply now →
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 bg-[#1a1a2e]/5 text-[#1a1a2e] text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Star className="h-3 w-3 fill-[#1a1a2e]" /> 2,000+ translation_translators &amp; interpreters in our network
          </div>
          <h1 className="text-5xl font-bold text-[#1a1a2e] mb-4 leading-tight">
            Work With<br />L.A. Translation
          </h1>
          <p className="text-gray-500 text-xl max-w-lg mx-auto leading-relaxed">
            Steady assignments, reliable payment, and a portal so simple you can invoice in under 60 seconds.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/vendor/signup" className="inline-flex items-center gap-2 bg-[#1a1a2e] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a2a4e] transition-colors">
              Apply as a Vendor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/vendor/login" className="text-sm text-[#1a1a2e] font-medium hover:underline">
              Already a vendor? Sign in →
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: Zap,
              color: 'bg-blue-50 text-blue-600',
              title: 'Consistent work',
              body: "Receive assignments matched to your language pairs and specialties. We've been placing translation_translators and interpreters since 2003.",
            },
            {
              icon: DollarSign,
              color: 'bg-green-50 text-green-600',
              title: 'Reliable, on-time payment',
              body: 'Submit your invoice in one click after delivery. Payment is processed within 30 days of approval — directly to your bank account.',
            },
            {
              icon: ShieldCheck,
              color: 'bg-purple-50 text-purple-600',
              title: 'Professional clientele',
              body: 'Work with UCLA, the FBI, LA Superior Court, CBS, DreamWorks, Baker & McKenzie, and hundreds of law firms and hospitals.',
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-7">
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${color} mb-5`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Interactive workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-[#1a1a2e] mb-3">See how simple the portal is</h2>
            <p className="text-gray-500 mb-6">Click through each step to see exactly what working with us looks like — from assignment notification to getting paid.</p>
            <div className="space-y-3">
              {WORKFLOW_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#1a1a2e] text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <WorkflowDemo />
        </div>

        {/* Stats + payment explainer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-16">
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '30 days', label: 'Max payment turnaround' },
              { value: '200+',    label: 'Languages supported'    },
              { value: '20+ yrs', label: 'In business since 2003' },
              { value: '1 click', label: 'To submit an invoice'   },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-[#1a1a2e]">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1a2e] text-white rounded-2xl p-7">
            <p className="text-lg font-bold mb-4">How payment works</p>
            <ol className="space-y-3 text-sm text-white/80">
              {[
                'Submit your invoice from the vendor portal after delivering your work.',
                'Our coordinator reviews and approves within 1–2 business days.',
                'Payment is deposited directly to your bank within 30 days of approval.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-6 pt-5 border-t border-white/20">
              <p className="text-xs text-white/50">Payment is processed via Stripe direct deposit. A bank account is required to receive payments.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Ready to join our network?</h2>
          <p className="text-gray-500 mb-6">Applications are reviewed within 1–2 business days. You will hear from our coordination team directly.</p>
          <Link href="/vendor/signup" className="inline-flex items-center gap-2 bg-[#1a1a2e] text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-[#2a2a4e] transition-colors">
            Apply as a Vendor <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Questions? Call <a href="tel:2133857781" className="text-[#1a1a2e] font-medium">(213) 385-7781</a> or email{' '}
            <a href="mailto:info@latranslation.com" className="text-[#1a1a2e] font-medium">info@latranslation.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
