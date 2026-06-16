import React from 'react';
import { Section, Text, Link, Button } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type WelcomeTemplateProps = {
  name: string;
};

export function WelcomeTemplate({ name }: WelcomeTemplateProps) {
  return (
    <BaseEmailTemplate preview="Welcome to SocialBeam!">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to SocialBeam, {name}!
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Your AI-powered social media command center is ready.
        </Text>

        <Section className="mb-6">
          <Section className="mb-3">
            <Text className="text-sm font-semibold text-gray-800 mb-1">
              Schedule posts across 8 platforms
            </Text>
            <Text className="text-sm text-gray-500 m-0">
              Plan and publish to X, Instagram, LinkedIn, TikTok, and more — all from one place.
            </Text>
          </Section>
          <Section className="mb-3">
            <Text className="text-sm font-semibold text-gray-800 mb-1">
              AI-powered content creation
            </Text>
            <Text className="text-sm text-gray-500 m-0">
              Generate on-brand posts tailored to each platform in seconds.
            </Text>
          </Section>
          <Section className="mb-3">
            <Text className="text-sm font-semibold text-gray-800 mb-1">
              Unified engagement inbox
            </Text>
            <Text className="text-sm text-gray-500 m-0">
              See comments, mentions, and DMs from every platform in a single inbox.
            </Text>
          </Section>
        </Section>

        <Section className="text-center my-8">
          <Link
            href="https://socialbeam.app/dashboard"
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            Go to your dashboard
          </Link>
        </Section>

        <Text className="text-sm text-gray-600">
          Happy posting,
          <br />
          The SocialBeam Team
        </Text>
      </Section>
    </BaseEmailTemplate>
  );
}
