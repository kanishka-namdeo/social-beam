import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as { id?: string; email?: string; workspaceId?: string };
    if (!user?.id || !user?.email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    const body = await req.json();
    const priceId = body.priceId as string;
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      if (!subscription) {
        subscription = await prisma.subscription.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            stripeCustomerId: customerId,
            plan: 'free',
            status: 'active',
          },
        });
      } else {
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: { userId: user.id, priceId: priceId },
    });

    log.info('api.stripe.checkout.created', { sessionId: checkoutSession.id, userId: user.id });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    log.error('api.stripe.checkout.error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}