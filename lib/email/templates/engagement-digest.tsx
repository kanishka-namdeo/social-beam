import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type EngagementDigestTemplateProps = {
  name: string;
  commentCount: number;
  mentionCount: number;
  dmCount: number;
  totalUnread: number;
};

export function EngagementDigestTemplate({
  name,
  commentCount,
  mentionCount,
  dmCount,
  totalUnread,
}: EngagementDigestTemplateProps) {
  return (
    <BaseEmailTemplate preview="Your engagement digest">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Your engagement digest
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, here's what's happening with your audience.
        </Text>

        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
          <Section className="mb-3">
            <Text className="text-sm text-gray-500 m-0">New comments</Text>
            <Text className="text-xl font-bold text-gray-900 m-0">{commentCount}</Text>
          </Section>
          <Section className="mb-3">
            <Text className="text-sm text-gray-500 m-0">Mentions</Text>
            <Text className="text-xl font-bold text-gray-900 m-0">{mentionCount}</Text>
          </Section>
          <Section className="mb-3">
            <Text className="text-sm text-gray-500 m-0">Direct messages</Text>
            <Text className="text-xl font-bold text-gray-900 m-0">{dmCount}</Text>
          </Section>
          <Section>
            <Text className="text-sm text-gray-500 m-0">Total unread</Text>
            <Text className="text-xl font-bold text-indigo-500 m-0">{totalUnread}</Text>
          </Section>
        </Section>

        <Section className="text-center my-8">
          <Link
            href="https://socialbeam.app/inbox"
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            Open inbox
          </Link>
        </Section>

        <Text className="text-sm text-gray-600">
          Stay on top of your audience!
        </Text>
      </Section>
    </BaseEmailTemplate>
  );
}
