import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error('api.stripe.webhook.signature_error', { error: String(err) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  logger.info('api.stripe.webhook.received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          logger.warn('api.stripe.webhook.checkout.no_user', { sessionId: session.id });
          break;
        }

        await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.findUnique({ where: { userId } });
          if (sub?.stripeSubscriptionId === subscriptionId) {
            // Already processed (idempotency)
            return;
          }

          const priceId = session.metadata?.priceId ?? null;
          const tier = priceId === process.env.STRIPE_PRICE_ID_AI_PRO ? 'AI_PRO' : 'AI_STARTER';

          await tx.subscription.upsert({
            where: { userId },
            create: {
              id: crypto.randomUUID(),
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              plan: 'ai_starter',
              status: 'active',
              tier: tier as import('@/lib/feature-gates').SubscriptionTier,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              status: 'active',
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { role: 'PREMIUM_USER', lastRoleChangeAt: new Date() },
          });
        });

        logger.info('api.stripe.webhook.checkout.completed', { userId, subscriptionId });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (!subscriptionId) break;

        const lineItem = invoice.lines.data[0] as any;
        const periodEnd = lineItem?.period?.end;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { currentPeriodEnd: new Date(periodEnd ?? Date.now() * 1000) },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        const existingSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
        if (!existingSub) break;

        // current_period_end is sent by Stripe but renamed in newer SDK types
        const periodEnd = (subscription as any).current_period_end;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: {
            status: subscription.status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            stripePriceId: subscription.items.data[0]?.price.id ?? null,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (sub) {
            await tx.user.update({
              where: { id: sub.userId },
              data: { role: 'FREE_USER', lastRoleChangeAt: new Date() },
            });
          } else {
            return;
          }
          await tx.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: 'canceled', currentPeriodEnd: new Date() },
          });
        });

        logger.info('api.stripe.webhook.subscription.deleted', { subscriptionId: subId });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('api.stripe.webhook.processing_error', { eventId: event?.id, error: String(error) });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}