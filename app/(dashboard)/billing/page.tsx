import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingClient } from './billing-client';

const pricingTiers = [
  {
    name: 'AI Starter',
    price: '$19',
    period: '/mo',
    description: 'AI-powered content generation',
    features: [
      'AI post generation',
      'AI caption & hashtag suggestions',
      'Optimal posting time recommendations',
      'AI content analysis',
    ],
    priceId: process.env.STRIPE_PRICE_ID_AI_STARTER ?? '',
    popular: true,
  },
  {
    name: 'AI Pro',
    price: '$49',
    period: '/mo',
    description: 'Full AI automation for teams',
    features: [
      'Everything in AI Starter',
      'Unlimited AI content generation',
      'Automated engagement replies',
      'Priority support',
    ],
    priceId: process.env.STRIPE_PRICE_ID_AI_PRO ?? '',
    popular: false,
  },
];

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const user = session.user as { id?: string };
  if (!user?.id) {
    redirect('/login');
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  return <BillingClient subscription={subscription} pricingTiers={pricingTiers} />;
}