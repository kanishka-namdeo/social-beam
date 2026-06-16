export const SUPPORTED_PLATFORMS = [
  {
    name: 'instagram',
    characterLimit: 2200,
    features: ['images', 'stories', 'reels', 'carousel', 'hashtags'],
  },
  {
    name: 'facebook',
    characterLimit: 63206,
    features: ['images', 'videos', 'stories', 'links', 'polls', 'events'],
  },
  {
    name: 'x',
    characterLimit: 280,
    features: ['images', 'videos', 'threads', 'polls', 'spaces'],
  },
  {
    name: 'linkedin',
    characterLimit: 3000,
    features: ['images', 'videos', 'articles', 'documents', 'polls', 'newsletters'],
  },
  {
    name: 'tiktok',
    characterLimit: 2200,
    features: ['videos', 'duets', 'stitches', 'hashtags', 'sounds'],
  },
  {
    name: 'pinterest',
    characterLimit: 500,
    features: ['images', 'videos', 'boards', 'idea-pins', 'product-pins'],
  },
] as const;
