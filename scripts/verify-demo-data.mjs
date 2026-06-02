import { PrismaClient } from '../app/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const analyticsCount = await prisma.analyticsSnapshot.count({ where: { postId: { startsWith: 'demo_post_' } } });
  const followerCount = await prisma.followerSnapshot.count({ where: { id: 'demo_foll_1' } });
  const postCount = await prisma.post.count({ where: { id: { startsWith: 'demo_post_' } } });
  const postPlatformCount = await prisma.postPlatform.count({ where: { postId: { startsWith: 'demo_post_' } } });

  console.log('Demo data verification:');
  console.log('  Posts:', postCount);
  console.log('  PostPlatforms:', postPlatformCount);
  console.log('  AnalyticsSnapshots:', analyticsCount);
  console.log('  FollowerSnapshots:', followerCount);
  console.log('  Total records created:', postCount + postPlatformCount + analyticsCount + followerCount);
  console.log('  WorkspaceId used: cb00516d621a641b5ac5e72cf');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
