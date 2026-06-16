export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return Response.json({
    name: 'Social Beam',
    description: 'AI-powered social media management — compose posts, analyze analytics, manage brand context, handle engagement, and monitor Reddit trends across multiple social platforms.',
    url: `${baseUrl}/api/mcp`,
    version: '1.0.0',
    auth: {
      type: 'oauth2',
      authorize_url: `${baseUrl}/api/auth/mcp-authorize`,
      token_url: `${baseUrl}/api/auth/mcp-token`,
      revoke_url: `${baseUrl}/api/auth/mcp-revoke`,
      scopes: [
        'mcp:compose',
        'mcp:analytics',
        'mcp:brand',
        'mcp:inbox',
        'mcp:publish',
        'mcp:reddit',
        'mcp:accounts',
      ],
      scope_descriptions: {
        'mcp:compose': 'Create, edit, and manage social media posts',
        'mcp:analytics': 'View analytics, metrics, and audience growth',
        'mcp:brand': 'Manage brand context, voice, and identity',
        'mcp:inbox': 'View and respond to engagement (comments, mentions, DMs)',
        'mcp:publish': 'Publish and schedule posts to platforms',
        'mcp:reddit': 'Access Reddit trending topics and recommendations',
        'mcp:accounts': 'View and manage connected platform accounts',
      },
    },
    capabilities: {
      tools: [
        'accounts_list', 'accounts_status', 'accounts_disconnect',
        'compose_create_post', 'compose_generate', 'compose_list_posts', 'compose_get_post', 'compose_update_post', 'compose_delete_post',
        'analytics_overview', 'analytics_content_ranking', 'analytics_audience_growth', 'analytics_recommendations',
        'brand_get_context', 'brand_update', 'brand_health', 'brand_test', 'brand_history', 'brand_learning_signals',
        'inbox_list', 'inbox_get', 'inbox_reply', 'inbox_draft_reply', 'inbox_update_status',
        'publish_now', 'publish_schedule', 'publish_retry', 'publish_status',
        'reddit_trending', 'reddit_analyze', 'reddit_subreddits_recommend', 'reddit_create_post',
      ],
      resources: [
        'brand://context',
        'brand://health',
        'accounts://connected',
        'config://platforms',
      ],
      prompts: [
        'create-content-calendar',
        'analyze-engagement',
        'brand-voice-audit',
        'trending-to-content',
      ],
    },
    documentation: `${baseUrl}/docs/mcp`,
  });
}
