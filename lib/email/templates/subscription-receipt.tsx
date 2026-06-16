import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type SubscriptionReceiptTemplateProps = {
  name: string;
  amount: number;
  currency: string;
  plan: string;
  periodEnd: Date;
};

export function SubscriptionReceiptTemplate({
  name,
  amount,
  currency,
  plan,
  periodEnd,
}: SubscriptionReceiptTemplateProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(periodEnd);

  return (
    <BaseEmailTemplate preview="Payment confirmed">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Payment confirmed
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, thank you for your subscription!
        </Text>

        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
          <Section className="mb-3">
            <Text className="text-sm text-gray-500 m-0">Plan</Text>
            <Text className="text-base font-semibold text-gray-900 m-0">{plan}</Text>
          </Section>
          <Section className="mb-3">
            <Text className="text-sm text-gray-500 m-0">Amount</Text>
            <Text className="text-base font-semibold text-gray-900 m-0">{formattedAmount}</Text>
          </Section>
          <Section>
            <Text className="text-sm text-gray-500 m-0">Billing period ends</Text>
            <Text className="text-base font-semibold text-gray-900 m-0">{formattedDate}</Text>
          </Section>
        </Section>

        <Section className="text-center my-8">
          <Link
            href="https://socialbeam.app/billing"
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            Manage billing
          </Link>
        </Section>

        <Text className="text-sm text-gray-600">
          Thank you for your subscription!
        </Text>
      </Section>
    </BaseEmailTemplate>
  );
}
