import { PrismaClient, PostStatus, ConfidenceLevel } from "@/app/generated/prisma";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@test.com" }, include: { Workspace: true } });
  if (!adminUser || !adminUser.Workspace[0]) {
    console.error("Admin user or workspace not found");
    process.exit(1);
  }
  const wsId = adminUser.Workspace[0].id;
  console.log("Using workspace:", wsId);

  const now = new Date();

  // Create some connected accounts
  await prisma.connectedAccount.createMany({
    data: [
      { id: crypto.randomUUID(), workspaceId: wsId, platform: "instagram", platformUserId: "brewbean_ig", accessToken: "encrypted", refreshToken: "encrypted", status: "connected" },
      { id: crypto.randomUUID(), workspaceId: wsId, platform: "x", platformUserId: "brewbean_x", accessToken: "encrypted", refreshToken: "encrypted", status: "connected" },
      { id: crypto.randomUUID(), workspaceId: wsId, platform: "linkedin", platformUserId: "brewbean_li", accessToken: "encrypted", refreshToken: "encrypted", status: "connected" },
    ],
    skipDuplicates: true,
  });

  // Create a user profile
  const existingProfile = await prisma.userProfile.findUnique({ where: { workspaceId: wsId } });
  if (!existingProfile) {
    await prisma.userProfile.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: wsId,
        bio: { name: "Brew & Bean Coffee Co.", businessType: "B2C", industry: "Food & Beverage", goals: ["Increase brand awareness"], audienceDescription: "Urban professionals" },
        tone: "professional",
        postTypes: { text: 20, image: 45, video: 25, carousel: 10 },
        imageAnalysis: { categories: ["product"], dominantThemes: ["warm tones"], imageFrequency: 0.8 },
        audience: { demographics: { ageRange: "25-40", gender: "mixed", location: "Urban US" }, interests: ["coffee"], painPoints: ["quality"] },
      },
    });
  }

  // Delete existing posts for this workspace
  const existingPosts = await prisma.post.findMany({ where: { workspaceId: wsId } });
  for (const post of existingPosts) {
    await prisma.postPlatform.deleteMany({ where: { postId: post.id } });
    await prisma.post.delete({ where: { id: post.id } });
  }

  // Create published posts
  const post1 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "New Summer Cold Brew Launch",
      content: { text: "Our summer cold brew is here!", media: [] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.HIGH,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Summer cold brew!", mediaUrls: [], status: PostStatus.PUBLISHED, externalId: "ig_001" },
          { id: crypto.randomUUID(), platform: "x", content: "Cold brew is live!", status: PostStatus.PUBLISHED, externalId: "x_001" },
          { id: crypto.randomUUID(), platform: "linkedin", content: "Excited to announce our summer collection.", status: PostStatus.PUBLISHED, externalId: "li_001" },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Behind the Scenes: Barista Morning Routine",
      content: { text: "Behind every great cup is a passionate barista", media: [] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.MEDIUM,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Meet our lead barista!", mediaUrls: [], status: PostStatus.PUBLISHED, externalId: "ig_002" },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Weekend Brunch Special — Avocado Toast + Coffee Combo for $12",
      content: { text: "This weekend only", media: [] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.HIGH,
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Weekend brunch!", status: PostStatus.PUBLISHED, externalId: "ig_003" },
          { id: crypto.randomUUID(), platform: "facebook", content: "Join us this weekend!", status: PostStatus.PUBLISHED, externalId: "fb_001" },
        ],
      },
    },
  });

  // Scheduled posts
  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Monday Motivation Quote",
      content: { text: "Monday motivation with coffee", media: [] },
      status: PostStatus.SCHEDULED,
      confidence: ConfidenceLevel.HIGH,
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Monday motivation!", mediaUrls: [], status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "linkedin", content: "Monday motivation from the team!", status: PostStatus.SCHEDULED },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "New Location Opening Downtown",
      content: { text: "We're opening our 3rd location!", media: [] },
      status: PostStatus.SCHEDULED,
      confidence: ConfidenceLevel.MEDIUM,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Big news!", status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "facebook", content: "We're expanding!", status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "linkedin", content: "Thrilled to announce our third location.", status: PostStatus.SCHEDULED },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Coffee Bean Origin Story — Ethiopian Yirgacheffe Journey from Farm to Cup",
      content: { text: "From farm to cup", media: [] },
      status: PostStatus.DRAFT,
      confidence: ConfidenceLevel.LOW,
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Farm to cup story", status: PostStatus.DRAFT },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Flash Sale — Today Only",
      content: { text: "50% off all pastries", media: [] },
      status: PostStatus.FAILED,
      confidence: ConfidenceLevel.MEDIUM,
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Flash sale!", status: PostStatus.FAILED, error: "Rate limit exceeded by Instagram API" },
        ],
      },
    },
  });

  console.log("Test data seeded successfully!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
