import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type PasswordResetTemplateProps = {
  name: string;
  resetUrl: string;
};

export function PasswordResetTemplate({ name, resetUrl }: PasswordResetTemplateProps) {
  return (
    <BaseEmailTemplate preview="Reset your password">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Reset your password
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, we received a request to reset your password. Click the button below to set a new password.
        </Text>

        <Section className="text-center my-8">
          <Link
            href={resetUrl}
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            Reset password
          </Link>
        </Section>

        <Text className="text-sm text-gray-500 mb-4">
          This link expires in 1 hour.
        </Text>

        <Text className="text-sm text-gray-500">
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Section>
    </BaseEmailTemplate>
  );
}
