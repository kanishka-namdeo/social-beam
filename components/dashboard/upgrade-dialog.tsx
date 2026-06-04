"use client";

import { Sparkle, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tiers = [
  {
    name: "AI Starter",
    price: "$19",
    period: "/mo",
    description: "AI-powered content creation",
    features: [
      "AI content generation",
      "AI caption & hashtag generation",
      "Optimal posting time suggestions",
      "AI content analysis",
    ],
    href: "/billing",
  },
  {
    name: "AI Pro",
    price: "$49",
    period: "/mo",
    description: "Full AI automation for teams",
    features: [
      "Unlimited AI generation",
      "AI campaign generation",
      "Automated engagement replies",
      "Priority support",
    ],
    href: "/billing",
  },
];

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Unlock Premium Features
          </DialogTitle>
          <DialogDescription>
            Choose a plan that works for you. All plans include a free trial.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <Card key={tier.name} className="border-border flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check weight="bold" className="size-4 text-brand mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={tier.href} className="w-full" onClick={() => onOpenChange(false)}>
                  <Button className="w-full bg-brand hover:bg-brand/90">Upgrade</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
