import dotenv from 'dotenv';
dotenv.config();

// Clean up the DATABASE_URL if it has quotes
let dbUrl = process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace(/^["']|["']$/g, '');

console.log(`Database URL: ${dbUrl.replace(/:([^:@]+)@/, ':***@')}...\n`);

import { PrismaClient } from './app/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const userEmail = 'premium@test.com';
const platform = 'linkedin';

console.log(`Removing all LinkedIn data for ${userEmail}...\n`);

const user = await prisma.user.findUnique({
  where: { email: userEmail },
  include: { Workspace: true },
});

if (!user) {
  console.log(`User ${userEmail} not found.`);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
}

console.log(`Found user: ${user.email} (${user.role})\n`);

const workspaces = user.Workspace;
if (workspaces.length === 0) {
  console.log('No workspaces found for this user.');
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

let totals = {
  engagementItems: 0,
  followerSnapshots: 0,
  connectedAccounts: 0,
  analyticsSnapshots: 0,
  postPlatforms: 0,
  orphanedPosts: 0,
  platformContexts: 0,
};

for (const workspace of workspaces) {
  console.log(`Processing workspace: ${workspace.id} (${workspace.name})`);

  // 1. Delete LinkedIn engagement items
  const r = await prisma.engagementItem.deleteMany({
    where: { workspaceId: workspace.id, platform },
  });
  totals.engagementItems += r.count;
  console.log(`  - Deleted ${r.count} LinkedIn engagement items`);

  // 2. Delete LinkedIn follower snapshots
  const r2 = await prisma.followerSnapshot.deleteMany({
    where: { workspaceId: workspace.id, platform },
  });
  totals.followerSnapshots += r2.count;
  console.log(`  - Deleted ${r2.count} LinkedIn follower snapshots`);

  // 3. Delete LinkedIn connected accounts (tokens, cookies, credentials)
  const r3 = await prisma.connectedAccount.deleteMany({
    where: { workspaceId: workspace.id, platform },
  });
  totals.connectedAccounts += r3.count;
  console.log(`  - Deleted ${r3.count} LinkedIn connected accounts`);

  // 4. Get all post IDs for this workspace
  const posts = await prisma.post.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  const postIds = posts.map(p => p.id);

  // 5. Delete LinkedIn analytics snapshots
  if (postIds.length > 0) {
    const r4 = await prisma.analyticsSnapshot.deleteMany({
      where: { postId: { in: postIds }, platform },
    });
    totals.analyticsSnapshots += r4.count;
    console.log(`  - Deleted ${r4.count} LinkedIn analytics snapshots`);

    // 6. Delete LinkedIn post platform entries
    const r5 = await prisma.postPlatform.deleteMany({
      where: { postId: { in: postIds }, platform },
    });
    totals.postPlatforms += r5.count;
    console.log(`  - Deleted ${r5.count} LinkedIn post platform entries`);
  }

  // 7. Delete posts that no longer have any platform entries
  const orphanedPosts = await prisma.post.findMany({
    where: {
      workspaceId: workspace.id,
      PostPlatform: { none: {} },
    },
  });
  for (const post of orphanedPosts) {
    await prisma.post.delete({ where: { id: post.id } });
  }
  if (orphanedPosts.length > 0) {
    totals.orphanedPosts += orphanedPosts.length;
    console.log(`  - Deleted ${orphanedPosts.length} orphaned posts (no remaining platforms)`);
  }

  // 8. Delete LinkedIn platform context
  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId: workspace.id },
  });
  if (brandContext) {
    const r6 = await prisma.platformContext.deleteMany({
      where: { brandContextId: brandContext.id, platform },
    });
    totals.platformContexts += r6.count;
    console.log(`  - Deleted ${r6.count} LinkedIn platform contexts`);
  }

  console.log('');
}

console.log(`\nSummary for ${userEmail}:`);
console.log(`  Engagement items:      ${totals.engagementItems}`);
console.log(`  Follower snapshots:    ${totals.followerSnapshots}`);
console.log(`  Connected accounts:    ${totals.connectedAccounts}`);
console.log(`  Analytics snapshots:   ${totals.analyticsSnapshots}`);
console.log(`  Post platform entries: ${totals.postPlatforms}`);
console.log(`  Orphaned posts:        ${totals.orphanedPosts}`);
console.log(`  Platform contexts:     ${totals.platformContexts}`);

const total = Object.values(totals).reduce((a, b) => a + b, 0);
console.log(`\nTotal records deleted: ${total}`);
console.log('Note: The user account, subscription, and other platform data remain intact.');

await prisma.$disconnect();
await pool.end();
