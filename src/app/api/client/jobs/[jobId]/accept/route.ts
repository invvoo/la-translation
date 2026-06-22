import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'

interface Props { params: Promise<{ jobId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { jobId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: client } = await service
      .from('clients')
      .select('id, contact_name, email, stripe_customer_id')
      .eq('email', user.email)
      .maybeSingle()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { data: job } = await service
      .from('jobs')
      .select('id, job_type, status, source_lang, target_lang, quote_amount, quote_adjusted_amount')
      .eq('id', jobId)
      .eq('client_id', client.id)
      .single() as any

    if (!job) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!['quote_sent', 'quote_accepted'].includes(job.status)) {
      return NextResponse.json({ error: 'This quote is not available for payment' }, { status: 409 })
    }

    // Fetch discount separately (columns may not be in generated types yet)
    const { data: jobExtra } = await service
      .from('jobs')
      .select('discount_amount, discount_label')
      .eq('id', jobId)
      .single() as any

    const baseAmount = Number(job.quote_adjusted_amount ?? job.quote_amount ?? 0)
    const discountAmount = jobExtra?.discount_amount != null ? Number(jobExtra.discount_amount) : 0
    const finalAmount = Math.max(0, baseAmount - discountAmount)
    const amountCents = Math.round(finalAmount * 100)

    if (amountCents < 50) {
      return NextResponse.json({ error: 'Quote amount is too low to process a payment (minimum $0.50). Contact us to confirm pricing.' }, { status: 400 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = (client as any).stripe_customer_id as string | null
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({ name: (client as any).contact_name, email: client.email })
      stripeCustomerId = customer.id
      await service.from('clients').update({ stripe_customer_id: stripeCustomerId } as any).eq('id', client.id)
    }

    const serviceLabel = job.source_lang && job.target_lang
      ? `${job.source_lang} → ${job.target_lang} ${job.job_type}`
      : (job.job_type as string)

    const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-proto')?.split(',')[0].trim() + '://' + req.headers.get('host')
    const baseUrl = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer: stripeCustomerId ?? undefined,
      customer_email: !stripeCustomerId ? (client as any).email : undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `LA Translation — ${serviceLabel}`,
            description: discountAmount > 0
              ? `${jobExtra?.discount_label || 'Discount'} applied. Order ID: ${job.id}`
              : `Order ID: ${job.id}`,
          },
        },
        quantity: 1,
      }],
      metadata: { jobId: job.id },
      success_url: `${baseUrl}/client/jobs/${job.id}?paid=1`,
      cancel_url: `${baseUrl}/client/jobs/${job.id}`,
    }

    let session
    try {
      session = await getStripe().checkout.sessions.create(sessionParams)
    } catch (stripeErr: any) {
      const isStaleCustomer =
        (stripeErr?.code === 'resource_missing' && stripeErr?.param === 'customer') ||
        (typeof stripeErr?.message === 'string' && /no such customer/i.test(stripeErr.message))
      if (isStaleCustomer && (client as any).email) {
        const newCustomer = await getStripe().customers.create({ name: (client as any).contact_name, email: (client as any).email })
        stripeCustomerId = newCustomer.id
        await service.from('clients').update({ stripe_customer_id: stripeCustomerId } as any).eq('id', client.id)
        session = await getStripe().checkout.sessions.create({ ...sessionParams, customer: stripeCustomerId, customer_email: undefined })
      } else {
        throw stripeErr
      }
    }

    await service.from('jobs')
      .update({ status: 'quote_accepted', quote_accepted_at: new Date().toISOString() } as any)
      .eq('id', job.id)

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[client/accept]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
