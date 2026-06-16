import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type EmailVerificationTemplateProps = {
  name: string;
  verificationUrl: string;
};

export function EmailVerificationTemplate({ name, verificationUrl }: EmailVerificationTemplateProps) {
  const verifyPageUrl = verificationUrl.includes('?token=')
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://socialbeam.app'}/verify-email?token=${verificationUrl.split('?token=')[1]}`
    : verificationUrl;

  return (
    <BaseEmailTemplate preview="Verify your email address">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Verify your email
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, click the button below to verify your email address.
        </Text>

        <Section className="text-center my-8">
          <Link
            href={verifyPageUrl}
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            Verify email address
          </Link>
        </Section>

        <Text className="text-sm text-gray-500 mb-4">
          This link expires in 24 hours.
        </Text>

        <Text className="text-xs text-gray-400">
          If the button doesn't work, copy and paste this link into your browser:
        </Text>
        <Text className="text-xs text-brand break-all">
          {verifyPageUrl}
        </Text>
      </Section>
    </BaseEmailTemplate>
  );
}
