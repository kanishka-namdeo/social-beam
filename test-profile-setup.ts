import { prisma } from "./lib/prisma.ts";

async function main() {
  const workspace = await prisma.workspace.findFirst({
    include: { user: true },
  });
  
  if (!workspace) {
    console.log('No workspace found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Workspace:', workspace.id, workspace.name);
  console.log('User:', workspace.user.id, workspace.user.email);
  
  const existingProfile = await prisma.userProfile.findUnique({
    where: { workspaceId: workspace.id },
  });
  
  if (existingProfile) {
    console.log('Profile already exists:', JSON.stringify(existingProfile, null, 2));
  } else {
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
    
    await prisma.onboardingSession.updateMany({
      where: { userId: workspace.userId },
      data: { status: 'completed', completedAt: new Date() },
    });
    
    console.log('Onboarding marked as complete');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
