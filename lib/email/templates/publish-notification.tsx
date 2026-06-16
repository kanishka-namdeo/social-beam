import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type PublishResult = {
  title?: string;
  platforms: string[];
  status: 'PUBLISHED' | 'FAILED';
  error?: string;
};

type PublishNotificationTemplateProps = {
  name: string;
  publishedCount: number;
  failedCount: number;
  results: PublishResult[];
};

export function PublishNotificationTemplate({
  name,
  publishedCount,
  failedCount,
  results,
}: PublishNotificationTemplateProps) {
  return (
    <BaseEmailTemplate preview="Your publishing summary">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Publishing summary
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, {publishedCount} post{publishedCount !== 1 ? 's' : ''} published
          {failedCount > 0 ? `, ${failedCount} failed` : ''}.
        </Text>

        <Section className="mb-6">
          {results.map((result, idx) => (
            <Section
              key={idx}
              className="border border-gray-200 rounded-lg p-4 mb-3"
            >
              <Section className="flex items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-900 m-0">
                  {result.title || 'Untitled post'}
                </Text>
                <Text
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    result.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {result.status}
                </Text>
              </Section>
              <Text className="text-xs text-gray-500 mb-1">
                Platforms: {result.platforms.join(', ')}
              </Text>
              {result.error && (
                <Text className="text-xs text-red-600 m-0">
                  Error: {result.error}
                </Text>
              )}
            </Section>
          ))}
        </Section>

        <Section className="text-center my-8">
          <Link
            href="https://socialbeam.app/calendar"
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            View calendar
          </Link>
        </Section>
      </Section>
    </BaseEmailTemplate>
  );
}
