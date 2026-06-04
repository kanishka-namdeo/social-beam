import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as { id?: string };
    if (!user?.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/billing`,
    });

    logger.info('api.stripe.portal.created', { userId: user.id });
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logger.error('api.stripe.portal.error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}