import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/tokens'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'

interface Props {
  params: Promise<{ token: string }>
}

export async function POST(req: NextRequest, { params }: Props) {
  const { token } = await params

  try {
    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'quote') {
      return NextResponse.json({ error: 'Token expired or invalid' }, { status: 410 })
    }

    const supabase = createServiceClient()
    const { data: job } = await supabase
      .from('jobs')
      .select('id, job_type, status, source_lang, target_lang, quote_amount, quote_adjusted_amount, clients(contact_name, email, stripe_customer_id)')
      .eq('id', payload.jobId)
      .single() as any

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!['quote_sent', 'quote_accepted'].includes(job.status)) {
      return NextResponse.json({ error: 'Quote is not in an acceptable state' }, { status: 409 })
    }

    const client = job.clients as any

    // Apply discount if set
    const { data: jobFull } = await supabase
      .from('jobs')
      .select('discount_amount, discount_label')
      .eq('id', payload.jobId)
      .single() as any

    const baseAmount = Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0)
    const discountAmount = jobFull?.discount_amount != null ? Number(jobFull.discount_amount) : 0
    const finalAmount = Math.max(0, baseAmount - discountAmount)
    const amountCents = Math.round(finalAmount * 100)

    if (amountCents < 50) {
      return NextResponse.json({ error: 'Quote amount is too low to process a payment (minimum $0.50).' }, { status: 422 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = client?.stripe_customer_id
    if (!stripeCustomerId && client?.email) {
      const customer = await getStripe().customers.create({ name: client.contact_name, email: client.email })
      stripeCustomerId = customer.id
      await supabase.from('clients').update({ stripe_customer_id: stripeCustomerId }).eq('email', client.email)
    }

    const serviceLabel = job.source_lang && job.target_lang
      ? `${job.source_lang} → ${job.target_lang} ${job.job_type}`
      : job.job_type

    // Build URLs from the request's origin so they always match the current domain
    const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-proto')?.split(',')[0].trim() + '://' + req.headers.get('host')
    const baseUrl = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const lineItems: any[] = [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `LA Translation — ${serviceLabel}`,
            description: discountAmount > 0
              ? `${jobFull?.discount_label || 'Discount'} applied. Job ID: ${job.id}`
              : `Job ID: ${job.id}`,
          },
        },
        quantity: 1,
      },
    ]

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer: stripeCustomerId ?? undefined,
      customer_email: !stripeCustomerId ? client?.email : undefined,
      line_items: lineItems,
      metadata: { jobId: job.id },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/quote/${token}`,
    }

    let session
    try {
      session = await getStripe().checkout.sessions.create(sessionParams)
    } catch (stripeErr: any) {
      // Stored customer ID doesn't exist in this Stripe mode (test→live switch or deleted customer)
      const isStaleCustomer =
        (stripeErr?.code === 'resource_missing' && stripeErr?.param === 'customer') ||
        (typeof stripeErr?.message === 'string' && /no such customer/i.test(stripeErr.message))
      if (isStaleCustomer && client?.email) {
        console.log('[quote/accept] stale Stripe customer ID detected — creating fresh customer')
        const newCustomer = await getStripe().customers.create({ name: client.contact_name, email: client.email })
        stripeCustomerId = newCustomer.id
        await supabase.from('clients').update({ stripe_customer_id: stripeCustomerId }).eq('email', client.email)
        session = await getStripe().checkout.sessions.create({ ...sessionParams, customer: stripeCustomerId, customer_email: undefined })
      } else {
        throw stripeErr
      }
    }

    // Mark quote as accepted
    await supabase
      .from('jobs')
      .update({ status: 'quote_accepted', quote_accepted_at: new Date().toISOString() })
      .eq('id', job.id)

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[quote/accept]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
