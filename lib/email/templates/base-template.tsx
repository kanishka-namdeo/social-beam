import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Tailwind,
  Font,
} from '@react-email/components';

type BaseEmailTemplateProps = {
  children: React.ReactNode;
  preview?: string;
};

export function BaseEmailTemplate({ children, preview }: BaseEmailTemplateProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2',
            format: 'woff2',
          }}
          fontStyle="normal"
          fontWeight={400}
        />
      </Head>
      {preview && <Head><title>{preview}</title></Head>}
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: '#6366f1',
              },
            },
          },
        }}
      >
        <Body className="bg-gray-50 font-sans my-auto mx-auto px-2">
          <Container className="max-w-[600px] mx-auto mt-8 mb-8">
            <Section className="text-center py-6">
              <Text className="text-2xl font-bold text-brand m-0">SocialBeam</Text>
            </Section>

            <Section className="bg-white rounded-xl p-8 shadow-sm">
              {children}
            </Section>

            <Section className="text-center pt-6 pb-4">
              <Hr className="border-gray-200 my-4" />
              <Text className="text-sm text-gray-500 mb-1">
                <Link href="https://socialbeam.app" className="text-brand no-underline">
                  SocialBeam
                </Link>
                {' — AI-powered social media management'}
              </Text>
              <Text className="text-xs text-gray-400 mb-1">
                <Link href="https://socialbeam.app/settings" className="text-gray-400 underline">
                  Manage email preferences
                </Link>
              </Text>
              <Text className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} SocialBeam. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
