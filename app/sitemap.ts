import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://socialbeam.ai';

type RouteConfig = {
  path: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
};

const PUBLIC_ROUTES: RouteConfig[] = [
  // Core pages
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/integrations', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/customers', priority: 0.7, changeFrequency: 'monthly' },

  // Use cases
  { path: '/use-cases', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/use-cases/agency', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/use-cases/ecommerce', priority: 0.6, changeFrequency: 'monthly' },

  // Platform pages
  { path: '/platforms/linkedin', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/platforms/instagram', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/platforms/x', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/platforms/facebook', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platforms/tiktok', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platforms/pinterest', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platforms/reddit', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platforms/youtube', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platforms/bluesky', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platforms/threads', priority: 0.6, changeFrequency: 'monthly' },

  // Alternatives
  { path: '/alternatives', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/alternatives/buffer', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/alternatives/hootsuite', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/alternatives/later', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/alternatives/metricool', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/alternatives/sprout-social', priority: 0.6, changeFrequency: 'monthly' },

  // Free tools
  { path: '/free-tools', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/free-tools/hashtag-generator', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/free-tools/post-creator', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/free-tools/link-in-bio', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/free-tools/utm-generator', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/free-tools/instagram-name-generator', priority: 0.5, changeFrequency: 'monthly' },

  // Content pages
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/changelog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/resources', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/community', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/api', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/status', priority: 0.4, changeFrequency: 'hourly' },

  // Legal/Trust pages
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/security', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/cookie-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/help', priority: 0.5, changeFrequency: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
