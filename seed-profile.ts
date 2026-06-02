import { PrismaClient } from './app/generated/prisma/client.ts';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Find first workspace
  const workspace = await prisma.workspace.findFirst();

  if (!workspace) {
    console.log('No workspace found');
    await prisma.$disconnect();
    return;
  }

  console.log('Workspace:', workspace.id, workspace.name);
  console.log('User ID:', workspace.userId);

  // Check if profile exists
  const existingProfile = await prisma.userProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (existingProfile) {
    console.log('Profile already exists');
    console.log('  tone:', existingProfile.tone);
    console.log('  postTypes:', JSON.stringify(existingProfile.postTypes));
    console.log('  audience:', JSON.stringify(existingProfile.audience));
    console.log('  bio:', JSON.stringify(existingProfile.bio));
    await prisma.$disconnect();
    return;
  }

  // Create a test profile
  const profile = await prisma.userProfile.create({
    data: {
      workspaceId: workspace.id,
      tone: 'professional',
      postTypes: {
        educational: 40,
        promotional: 20,
        engagement: 25,
        behind_the_scenes: 15,
      },
      audience: {
        age_range: '25-44',
        interests: ['technology', 'productivity', 'entrepreneurship', 'digital marketing'],
        locations: ['United States', 'United Kingdom', 'Canada'],
      },
      bio: {
        industry: 'SaaS',
        company: 'SocialBeam',
        description: 'AI-powered social media management platform for modern businesses.',
        website: 'https://socialbeam.app',
      },
      voiceRules: {
        do: ['Use active voice', 'Keep sentences concise', 'Include data points'],
        dont: ['Use jargon', 'Be overly salesy', 'Use exclamation marks excessively'],
      },
    },
  });

  console.log('Created profile:', profile.id);

  // Mark onboarding as complete
  await prisma.onboardingSession.updateMany({
    where: { userId: workspace.userId },
    data: { status: 'completed', completedAt: new Date() },
  });

  console.log('Onboarding marked as complete');
  await prisma.$disconnect();
}

main().catch(console.error);
