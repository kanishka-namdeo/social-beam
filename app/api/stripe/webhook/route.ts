import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendReceiptEmail } from '@/lib/email/flows/send-receipt-email';

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

        let alreadyProcessed = false;
        await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.findUnique({ where: { userId } });
          if (sub?.stripeSubscriptionId === subscriptionId) {
            alreadyProcessed = true;
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

        if (alreadyProcessed) {
          logger.info('api.stripe.webhook.checkout.already_processed', { userId, subscriptionId });
          break;
        }

        logger.info('api.stripe.webhook.checkout.completed', { userId, subscriptionId });

        try {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const amount = (session.amount_total ?? 0) / 100;
            const currency = session.currency ?? 'usd';
            const priceId = session.metadata?.priceId ?? null;
            const tier = priceId === process.env.STRIPE_PRICE_ID_AI_PRO ? 'AI_PRO' : 'AI_STARTER';
            await sendReceiptEmail({
              email: user.email,
              name: user.name ?? '',
              amount,
              currency,
              plan: tier === 'AI_PRO' ? 'AI Pro' : 'AI Starter',
              periodEnd: new Date(),
              invoicePdf: (session as any).hosted_invoice_url ?? undefined,
            });
          }
        } catch (emailError) {
          logger.error('api.stripe.webhook.receipt_email_error', { userId, error: String(emailError) });
        }
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

        // Send renewal receipt email
        try {
          const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
          if (sub) {
            const user = await prisma.user.findUnique({ where: { id: sub.userId } });
            if (user) {
              const amount = (invoice.amount_paid ?? 0) / 100;
              const currency = invoice.currency ?? 'usd';
              const planName = sub.tier === 'AI_PRO' ? 'AI Pro' : sub.tier === 'AI_STARTER' ? 'AI Starter' : sub.plan;
              await sendReceiptEmail({
                email: user.email,
                name: user.name ?? '',
                amount,
                currency,
                plan: planName,
                periodEnd: new Date(periodEnd ?? Date.now() * 1000),
                invoicePdf: invoice.hosted_invoice_url ?? undefined,
              });
            }
          }
        } catch (emailError) {
          logger.error('api.stripe.webhook.renewal_receipt_email_error', { subscriptionId, error: String(emailError) });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        // current_period_end is sent by Stripe but renamed in newer SDK types
        const periodEnd = (subscription as any).current_period_end;
        const newPriceId = subscription.items.data[0]?.price.id ?? null;

        // Determine tier from the new price ID
        const newTier = newPriceId === process.env.STRIPE_PRICE_ID_AI_PRO
          ? 'AI_PRO'
          : newPriceId === process.env.STRIPE_PRICE_ID_AI_STARTER
            ? 'AI_STARTER'
            : null;

        await prisma.$transaction(async (tx) => {
          const existingSub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (!existingSub) return;

          const updateData: Record<string, unknown> = {
            status: subscription.status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            stripePriceId: newPriceId,
          };

          // Update tier if price changed to a known tier
          if (newTier && newTier !== existingSub.tier) {
            updateData.tier = newTier as import('@/lib/feature-gates').SubscriptionTier;

            // Downgrade to free if subscription is no longer active
            if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
              await tx.user.update({
                where: { id: existingSub.userId },
                data: { role: 'FREE_USER', lastRoleChangeAt: new Date() },
              });
            }
          }

          await tx.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: updateData,
          });
        });

        logger.info('api.stripe.webhook.subscription.updated', {
          subscriptionId: subId,
          newPriceId,
          newTier,
          status: subscription.status,
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

        // Send cancellation confirmation email
        try {
          const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (sub) {
            const user = await prisma.user.findUnique({ where: { id: sub.userId } });
            if (user) {
              await sendReceiptEmail({
                email: user.email,
                name: user.name ?? '',
                amount: 0,
                currency: 'usd',
                plan: `${sub.tier} (cancelled)`,
                periodEnd: new Date(),
              });
            }
          }
        } catch (emailError) {
          logger.error('api.stripe.webhook.cancellation_email_error', { subscriptionId: subId, error: String(emailError) });
        }

        logger.info('api.stripe.webhook.subscription.deleted', { subscriptionId: subId });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (!subscriptionId) break;

        logger.warn('api.stripe.webhook.payment_failed', { subscriptionId, invoiceId: invoice.id });

        await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
          if (!sub) return;

          // Mark subscription as past_due - user loses premium access
          await tx.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: 'past_due' },
          });

          // Downgrade user to free immediately
          await tx.user.update({
            where: { id: sub.userId },
            data: { role: 'FREE_USER', lastRoleChangeAt: new Date() },
          });

          logger.warn('api.stripe.webhook.payment_failed.downgraded', {
            userId: sub.userId,
            subscriptionId,
          });
        });

        // Send payment failure notification email
        try {
          const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
          if (sub) {
            const user = await prisma.user.findUnique({ where: { id: sub.userId } });
            if (user) {
              // Could send a payment failure email here
              logger.info('api.stripe.webhook.payment_failed.notify_user', { userId: sub.userId, email: user.email });
            }
          }
        } catch (emailError) {
          logger.error('api.stripe.webhook.payment_failed.email_error', { subscriptionId, error: String(emailError) });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('api.stripe.webhook.processing_error', { eventId: event?.id, error: String(error) });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}