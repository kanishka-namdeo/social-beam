import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as { id?: string; email?: string; workspaceId?: string };
    if (!user?.id || !user?.email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Capture validated values with proper types before any nested scopes
    const userId: string = user.id;
    const userEmail: string = user.email;

    const body = await req.json();
    const priceId = body.priceId as string;
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    // CRITICAL: Validate priceId against allowlist to prevent arbitrary price injection
    const allowedPriceIds = [
      process.env.STRIPE_PRICE_MONTHLY,
      process.env.STRIPE_PRICE_YEARLY,
      process.env.STRIPE_PRICE_PRO_MONTHLY,
      process.env.STRIPE_PRICE_PRO_YEARLY,
    ].filter((id): id is string => Boolean(id));

    if (!allowedPriceIds.includes(priceId)) {
      log.error('api.stripe.checkout.invalid_price', { priceId, userId });
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({ where: { userId } });

    let customerId = subscription?.stripeCustomerId;

    // Create Stripe customer FIRST, then update DB in transaction
    // If Stripe fails, we don't touch the DB
    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      // Update subscription record in a transaction
      // If this fails, Stripe customer is orphaned but that's acceptable
      // (webhook handler can reconcile on customer.created event)
      await prisma.$transaction(async (tx) => {
        const existing = await tx.subscription.findUnique({ where: { userId } });
        if (!existing) {
          await tx.subscription.create({
            data: {
              id: crypto.randomUUID(),
              userId,
              stripeCustomerId: customerId,
              plan: 'free',
              status: 'active',
            },
          });
        } else {
          await tx.subscription.update({
            where: { userId },
            data: { stripeCustomerId: customerId },
          });
        }
      });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: { userId, priceId },
    });

    log.info('api.stripe.checkout.created', { sessionId: checkoutSession.id, userId });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    log.error('api.stripe.checkout.error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}