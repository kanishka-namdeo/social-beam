'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const MCP_SCOPES = [
  { scope: 'mcp:compose', description: 'Create, edit, and manage social media posts' },
  { scope: 'mcp:analytics', description: 'View analytics, metrics, and audience growth' },
  { scope: 'mcp:brand', description: 'Manage brand context, voice, and identity' },
  { scope: 'mcp:inbox', description: 'View and respond to engagement (comments, mentions, DMs)' },
  { scope: 'mcp:publish', description: 'Publish and schedule posts to platforms' },
  { scope: 'mcp:reddit', description: 'Access Reddit trending topics and recommendations' },
  { scope: 'mcp:accounts', description: 'View and manage connected platform accounts' },
];

export function McpTab() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpUrl = `${baseUrl}/api/mcp`;
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const cursorConfig = JSON.stringify({
    mcpServers: {
      'social-beam': {
        url: mcpUrl,
      },
    },
  }, null, 2);

  const claudeConfig = JSON.stringify({
    mcpServers: {
      'social-beam': {
        url: mcpUrl,
      },
    },
  }, null, 2);

  return (
    <div className="space-y-6">
      {/* MCP Server URL */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">MCP Server</CardTitle>
          <CardDescription>
            Connect your AI agents (Claude Code, Cursor, Hermes, OpenClaw) to Social Beam via the Model Context Protocol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={mcpUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(mcpUrl, 'url')}
            >
              {copied === 'url' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Scopes */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">Available Scopes</CardTitle>
          <CardDescription>
            When connecting, you can grant these permissions to your AI agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MCP_SCOPES.map(({ scope, description }) => (
              <div key={scope} className="flex items-start gap-3">
                <Badge variant="secondary" className="font-mono text-xs mt-0.5">
                  {scope}
                </Badge>
                <span className="text-sm text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Configuration */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">Client Configuration</CardTitle>
          <CardDescription>
            Add this configuration to your AI client to connect to Social Beam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cursor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Cursor</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(cursorConfig, 'cursor')}
              >
                {copied === 'cursor' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add to <code className="bg-muted px-1 rounded">.cursor/mcp.json</code> in your project root
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
              <code>{cursorConfig}</code>
            </pre>
          </div>

          {/* Claude Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Claude Desktop / Claude Code</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(claudeConfig, 'claude')}
              >
                {copied === 'claude' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add to <code className="bg-muted px-1 rounded">claude_desktop_config.json</code> or use <code className="bg-muted px-1 rounded">claude mcp add</code>
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
              <code>{claudeConfig}</code>
            </pre>
          </div>

          {/* Generic */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Other MCP Clients</h4>
            <p className="text-xs text-muted-foreground">
              Use the MCP server URL above with any MCP-compatible client. The server supports OAuth 2.1 with PKCE for authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
