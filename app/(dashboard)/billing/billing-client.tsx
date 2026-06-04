"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, CreditCard, Sparkle } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from '@/app/generated/prisma';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  priceId: string;
  popular: boolean;
}

interface BillingClientProps {
  subscription: Subscription | null;
  pricingTiers: PricingTier[];
}

export function BillingClient({ subscription, pricingTiers }: BillingClientProps) {
  const searchParams = useSearchParams();
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams?.get('canceled')) {
      toast.error('Checkout canceled', { description: 'Your payment was not completed. Try again when ready.' });
    }
    if (searchParams?.get('session_id')) {
      toast.success('Payment successful!', { description: 'Your account is being upgraded. Refresh to see changes.' });
    }
  }, [searchParams]);

  const handleUpgrade = async (priceId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error('Checkout failed', { description: data?.error ?? 'Unknown error' });
        }
      } catch {
        toast.error('Checkout failed', { description: 'Network error. Please try again.' });
      }
    });
  };

  const handleManage = async () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/portal', { method: 'POST' });
        const data = await res.json() as { url?: string; error?: string };
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error('Portal failed', { description: data?.error ?? 'Unknown error' });
        }
      } catch {
        toast.error('Portal failed', { description: 'Network error. Please try again.' });
      }
    });
  };

  if (subscription?.status === 'active' && (subscription.stripeSubscriptionId || (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()))) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Subscription</h1>
          <p className="text-sm text-muted-foreground">Manage your subscription and payment methods.</p>
        </div>
        <Card className="rounded-sm border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="size-6 text-success" weight="fill" />
              <div>
                <h3 className="font-semibold text-foreground">Active Subscription</h3>
                <p className="text-sm text-muted-foreground">
                  Plan: {subscription.plan}
                  {subscription.currentPeriodEnd && (
                    <span className="ml-2">Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
            </div>
            <Button className="mt-4" onClick={handleManage} disabled={isLoading}>
              <CreditCard className="size-4 mr-2" />
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground">Choose a plan to unlock AI-powered features.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.name}
            className={`border-border flex flex-col ${tier.popular ? 'ring-2 ring-brand relative' : ''}`}
          >
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl text-foreground">{tier.name}</CardTitle>
                {tier.popular && (
                  <Badge className="bg-brand text-primary-foreground">Most Popular</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={tier.popular ? 'default' : 'outline'}
                onClick={() => handleUpgrade(tier.priceId)}
                disabled={isLoading || !tier.priceId}
              >
                {isLoading ? 'Redirecting...' : `Get ${tier.name}`}
                <Sparkle className="size-4 ml-2" weight="fill" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}