import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Documentation',
  description: 'Model Context Protocol integration documentation for Social Beam',
};

export default function McpDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">MCP Integration Documentation</h1>
      <p className="text-muted-foreground mb-8">
        Social Beam exposes a Model Context Protocol (MCP) server that allows AI agents to interact with your social media management workspace.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <p className="mb-4">The MCP server endpoint is available at:</p>
        <code className="block bg-muted p-3 rounded-md mb-4">{baseUrl}/api/mcp</code>
        <p className="mb-4">
          Authentication uses OAuth 2.1 with PKCE (S256). Configure your MCP client with the authorization and token endpoints below.
        </p>
        <div className="space-y-2 text-sm">
          <p><strong>Authorization:</strong> {baseUrl}/api/auth/mcp-authorize</p>
          <p><strong>Token:</strong> {baseUrl}/api/auth/mcp-token</p>
          <p><strong>Revocation:</strong> {baseUrl}/api/auth/mcp-revoke</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Scopes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Scope</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['mcp:accounts', 'View and manage connected platform accounts'],
                ['mcp:compose', 'Create, edit, and manage social media posts'],
                ['mcp:analytics', 'View analytics, metrics, and audience growth'],
                ['mcp:brand', 'Manage brand context, voice, and identity'],
                ['mcp:inbox', 'View and respond to engagement (comments, mentions, DMs)'],
                ['mcp:publish', 'Publish and schedule posts to platforms'],
                ['mcp:reddit', 'Access Reddit trending topics and recommendations'],
              ].map(([scope, desc]) => (
                <tr key={scope} className="border-b">
                  <td className="p-2 font-mono text-xs">{scope}</td>
                  <td className="p-2">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Tools (30)</h2>
        <div className="grid gap-4">
          {[
            { category: 'Accounts', tools: [
              { name: 'accounts_list', desc: 'List all connected social platform accounts' },
              { name: 'accounts_status', desc: 'Get connection status for a specific platform' },
              { name: 'accounts_disconnect', desc: 'Disconnect a platform account (destructive)' },
            ]},
            { category: 'Compose', tools: [
              { name: 'compose_create_post', desc: 'Create a new social media post' },
              { name: 'compose_generate', desc: 'AI-generate post content with brand context' },
              { name: 'compose_list_posts', desc: 'List posts with filters' },
              { name: 'compose_get_post', desc: 'Get a specific post by ID' },
              { name: 'compose_update_post', desc: 'Update a draft or scheduled post' },
              { name: 'compose_delete_post', desc: 'Delete a draft post' },
            ]},
            { category: 'Analytics', tools: [
              { name: 'analytics_overview', desc: 'Get aggregated analytics metrics' },
              { name: 'analytics_content_ranking', desc: 'Get top performing posts by metric' },
              { name: 'analytics_audience_growth', desc: 'Get follower growth time-series' },
              { name: 'analytics_recommendations', desc: 'AI-powered posting recommendations' },
            ]},
            { category: 'Brand', tools: [
              { name: 'brand_get_context', desc: 'Get current brand context' },
              { name: 'brand_update', desc: 'Update brand context fields' },
              { name: 'brand_health', desc: 'Get brand health score' },
              { name: 'brand_test', desc: 'Test brand voice with sample generation' },
              { name: 'brand_history', desc: 'Get version history of brand changes' },
              { name: 'brand_learning_signals', desc: 'Get learning signals from performance' },
            ]},
            { category: 'Inbox', tools: [
              { name: 'inbox_list', desc: 'List engagement items with pagination' },
              { name: 'inbox_get', desc: 'Get a specific engagement item' },
              { name: 'inbox_reply', desc: 'Reply to an engagement item' },
              { name: 'inbox_draft_reply', desc: 'AI-generate a reply draft' },
              { name: 'inbox_update_status', desc: 'Update engagement item status' },
            ]},
            { category: 'Publish', tools: [
              { name: 'publish_now', desc: 'Immediately publish a draft post' },
              { name: 'publish_schedule', desc: 'Schedule a draft for future publishing' },
              { name: 'publish_retry', desc: 'Retry publishing a failed post' },
              { name: 'publish_status', desc: 'Get publish status per platform' },
            ]},
            { category: 'Reddit', tools: [
              { name: 'reddit_trending', desc: 'List trending Reddit posts' },
              { name: 'reddit_analyze', desc: 'AI-analyze trending post for brand relevance' },
              { name: 'reddit_subreddits_recommend', desc: 'Get recommended subreddits' },
              { name: 'reddit_create_post', desc: 'Create post from trending topic' },
            ]},
          ].map(({ category, tools }) => (
            <div key={category}>
              <h3 className="text-lg font-medium mb-2">{category}</h3>
              <div className="space-y-1">
                {tools.map(({ name, desc }) => (
                  <div key={name} className="flex gap-3 text-sm">
                    <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{name}</code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Resources (4)</h2>
        <div className="space-y-3">
          {[
            { uri: 'brand://context', desc: 'Brand identity, voice, audience, and goals' },
            { uri: 'brand://health', desc: 'Brand health score and field confidence breakdown' },
            { uri: 'accounts://connected', desc: 'Connected platform accounts with status' },
            { uri: 'config://platforms', desc: 'Supported platforms with character limits and capabilities' },
          ].map(({ uri, desc }) => (
            <div key={uri} className="flex gap-3 text-sm">
              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{uri}</code>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Prompt Templates (4)</h2>
        <div className="space-y-3">
          {[
            { name: 'create-content-calendar', desc: 'Generate a week of themed content across platforms' },
            { name: 'analyze-engagement', desc: 'Analyze recent engagement and suggest responses' },
            { name: 'brand-voice-audit', desc: 'Audit content for brand voice consistency' },
            { name: 'trending-to-content', desc: 'Turn trending topics into branded content' },
          ].map(({ name, desc }) => (
            <div key={name} className="flex gap-3 text-sm">
              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{name}</code>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Rate Limiting</h2>
        <p className="text-sm text-muted-foreground">
          100 requests per minute per user. Returns HTTP 429 with Retry-After header when exceeded.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Client Configuration</h2>
        <h3 className="text-lg font-medium mb-2">Cursor</h3>
        <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto mb-4">{`{
  "mcpServers": {
    "social-beam": {
      "url": "${baseUrl}/api/mcp",
      "type": "streamable-http"
    }
  }
}`}</pre>
        <h3 className="text-lg font-medium mb-2">Claude Desktop</h3>
        <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">{`{
  "mcpServers": {
    "social-beam": {
      "url": "${baseUrl}/api/mcp",
      "type": "streamable-http"
    }
  }
}`}</pre>
      </section>
    </div>
  );
}
