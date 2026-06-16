import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://socialbeam.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/features',
          '/pricing',
          '/how-it-works',
          '/integrations',
          '/use-cases/',
          '/platforms/',
          '/customers',
          '/contact',
          '/privacy',
          '/terms',
          '/cookie-policy',
          '/security',
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/compose/',
          '/calendar/',
          '/analytics/',
          '/settings/',
          '/onboarding/',
          '/inbox/',
          '/campaigns/',
          '/activity/',
          '/admin/',
          '/sync/',
          '/reddit/',
          '/test-',
          '/_next/',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: [
          '/',
          '/features',
          '/pricing',
          '/how-it-works',
        ],
        disallow: ['/api/', '/dashboard/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: [
          '/',
          '/features',
          '/pricing',
          '/how-it-works',
        ],
        disallow: ['/api/', '/dashboard/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
