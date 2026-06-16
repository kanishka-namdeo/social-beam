import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Schedule deletion in 30 days (soft delete)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    await prisma.user.update({
      where: { id: userId },
      data: {
        scheduledForDeletionAt: deletionDate,
        role: 'FREE_USER',
      },
    });

    // Cancel any active subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeSubscriptionId) {
      try {
        const { stripe } = await import('@/lib/stripe');
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        logger.info('api.user.account.stripe_cancelled', { userId, subscriptionId: subscription.stripeSubscriptionId });
      } catch (stripeError) {
        logger.error('api.user.account.stripe_cancel_error', { userId, error: String(stripeError) });
      }
    }

    logger.info('api.user.account.deletion_scheduled', {
      userId,
      email: user.email,
      deletionDate: deletionDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your account has been scheduled for deletion. All data will be permanently removed within 30 days.',
      deletionDate: deletionDate.toISOString(),
    });
  } catch (error) {
    logger.error('api.user.account.deletion_error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to schedule account deletion' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        scheduledForDeletionAt: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      scheduledForDeletionAt: user.scheduledForDeletionAt,
    });
  } catch (error) {
    logger.error('api.user.account.get_error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch account info' }, { status: 500 });
  }
}
