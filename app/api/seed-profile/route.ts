import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return Response.json({ error: 'No workspace found' }, { status: 404 });
    }

    const existingProfile = await prisma.userProfile.findUnique({
      where: { workspaceId: workspace.id },
    });

    if (existingProfile) {
      return Response.json({
        message: 'Profile already exists',
        profile: {
          tone: existingProfile.tone,
          postTypes: existingProfile.postTypes,
          audience: existingProfile.audience,
          bio: existingProfile.bio,
        },
      });
    }

    const profile = await prisma.userProfile.create({
      data: {
        id: randomUUID(),
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
        imageAnalysis: {
          do: ['Use active voice', 'Keep sentences concise', 'Include data points'],
          dont: ['Use jargon', 'Be overly salesy', 'Use exclamation marks excessively'],
        },
      },
    });

    // Mark onboarding complete
    await prisma.onboardingSession.updateMany({
      where: { userId: workspace.userId },
      data: { status: 'completed', completedAt: new Date() },
    });

    return Response.json({
      message: 'Profile created',
      profile: {
        tone: profile.tone,
        postTypes: profile.postTypes,
        audience: profile.audience,
        bio: profile.bio,
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
