import React from 'react';
import { Section, Text, Link, Hr } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

type RedditDigestItem = {
  title: string;
  subreddit: string;
  upvotes: number;
  relevanceScore: number | null;
  intentScore: number | null;
  url: string;
};

type RedditDigestTemplateProps = {
  name: string;
  trends: RedditDigestItem[];
  highIntentCount: number;
};

function formatScore(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

export function RedditDigestTemplate({
  name,
  trends,
  highIntentCount,
}: RedditDigestTemplateProps) {
  return (
    <BaseEmailTemplate preview="Your Reddit intelligence digest">
      <Section>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Reddit Intelligence Digest
        </Text>
        <Text className="text-base text-gray-600 mb-6">
          Hi {name}, here are the top Reddit trends from the last 24 hours.
        </Text>

        {highIntentCount > 0 && (
          <Section className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <Text className="text-sm font-semibold text-amber-700 m-0">
              {highIntentCount} high-intent lead{highIntentCount !== 1 ? 's' : ''} detected
            </Text>
            <Text className="text-xs text-amber-600 m-0">
              These threads show strong buying signals — engage now for best results.
            </Text>
          </Section>
        )}

        {trends.length === 0 ? (
          <Section className="bg-gray-50 rounded-lg p-6 mb-6">
            <Text className="text-sm text-gray-500 m-0">
              No significant trends detected in the last 24 hours. We'll keep monitoring.
            </Text>
          </Section>
        ) : (
          <Section className="mb-6">
            {trends.map((trend, i) => (
              <React.Fragment key={i}>
                <Section className="py-3">
                  <Link
                    href={trend.url}
                    className="text-sm font-semibold text-indigo-500 no-underline"
                  >
                    {trend.title}
                  </Link>
                  <Text className="text-xs text-gray-500 mt-1 mb-1">
                    r/{trend.subreddit} · {trend.upvotes} upvotes
                  </Text>
                  <Section className="flex gap-4">
                    <Text className="text-xs text-gray-500 m-0">
                      Relevance: {formatScore(trend.relevanceScore)}
                    </Text>
                    {trend.intentScore !== null && (
                      <Text className="text-xs text-gray-500 m-0">
                        Intent: {trend.intentScore}/100
                      </Text>
                    )}
                  </Section>
                </Section>
                {i < trends.length - 1 && <Hr className="border-gray-100 my-2" />}
              </React.Fragment>
            ))}
          </Section>
        )}

        <Section className="text-center my-8">
          <Link
            href="https://socialbeam.app/reddit"
            className="inline-block bg-indigo-500 text-white font-semibold rounded-lg px-6 py-3 no-underline text-sm"
          >
            View full dashboard
          </Link>
        </Section>
      </Section>
    </BaseEmailTemplate>
  );
}
