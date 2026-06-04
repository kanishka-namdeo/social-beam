import Stripe from 'stripe';
import { logger } from '@/lib/logger';

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('stripe.missing_key', { message: 'STRIPE_SECRET_KEY not set — Stripe functionality disabled' });
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-05-27.dahlia',
});

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder';
}
