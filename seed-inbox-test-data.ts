import 'dotenv/config';
import { PrismaClient } from './app/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  // Get first workspace
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.log('No workspace found');
    process.exit(1);
  }
  console.log('Workspace:', workspace.id, workspace.name);

  // Delete existing engagement items
  await prisma.engagementItem.deleteMany({ where: { workspaceId: workspace.id } });
  console.log('Cleared existing engagement items');

  const testItems = [
    { platform: 'instagram', type: 'COMMENT', authorName: 'sarah_designs', authorAvatar: '', content: 'Love this! Can you share more about how you built this feature?', parentContent: 'Check out our new AI scheduling tool', platformUrl: 'https://instagram.com/p/test1', status: 'UNREAD', sentiment: 'POSITIVE', aiDraft: null },
    { platform: 'x', type: 'MENTION', authorName: '@techfounder', authorAvatar: '', content: 'Just tried this out - the AI suggestions are spot on', parentContent: null, platformUrl: 'https://x.com/test/status/123', status: 'UNREAD', sentiment: 'NEUTRAL', aiDraft: 'Thanks for the feedback! We are glad you love it.' },
    { platform: 'linkedin', type: 'COMMENT', authorName: 'Alex Chen', authorAvatar: '', content: 'Great insights on social media automation. Would love to connect.', parentContent: 'The future of social is AI-powered', platformUrl: 'https://linkedin.com/post/test', status: 'READ', sentiment: 'POSITIVE', aiDraft: null },
    { platform: 'instagram', type: 'DM', authorName: 'jane_doe', authorAvatar: '', content: 'Hey! Interested in collaborating on a project?', parentContent: null, platformUrl: 'https://instagram.com/direct/test', status: 'UNREAD', sentiment: 'NEUTRAL', aiDraft: null },
    { platform: 'facebook', type: 'COMMENT', authorName: 'Mike Johnson', authorAvatar: '', content: 'This is exactly what I needed. Thank you for sharing!', parentContent: '5 tips for better social media engagement', platformUrl: 'https://facebook.com/post/test', status: 'REPLIED', sentiment: 'POSITIVE', aiDraft: null },
    { platform: 'x', type: 'MENTION', authorName: '@social_guru', authorAvatar: '', content: 'Not sure about this new feature. Seems complicated.', parentContent: null, platformUrl: 'https://x.com/test/status/456', status: 'DISMISSED', sentiment: 'NEGATIVE', aiDraft: null },
  ];

  for (const item of testItems) {
    await prisma.engagementItem.create({
      data: { ...item, workspaceId: workspace.id }
    });
    console.log('Created:', item.authorName);
  }
  console.log('Done seeding test data');
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
