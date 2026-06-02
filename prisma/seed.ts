import { PrismaClient, PostStatus, ConfidenceLevel } from "@/app/generated/prisma";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function seedData(wsId: string, now: Date) {
  // Check if posts already exist
  const postCount = await prisma.post.count({ where: { workspaceId: wsId } });
  if (postCount > 0) {
    console.log(`Found ${postCount} posts. Skipping seed.`);
    return;
  }

  // Published posts
  const post1 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "New Summer Cold Brew Launch",
      content: { text: "Our summer cold brew is here!", media: [{ type: "image", url: "/images/summer-cold-brew.jpg" }] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.HIGH,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Summer just got a whole lot cooler. Our new Cold Brew collection drops today. Come taste the season. #ColdBrew #SummerVibes", mediaUrls: ["/images/summer-cold-brew.jpg"], status: PostStatus.PUBLISHED, externalId: "ig_post_001" },
          { id: crypto.randomUUID(), platform: "x", content: "Our new summer cold brew collection is live! Drop by and grab yours. #ColdBrew", status: PostStatus.PUBLISHED, externalId: "x_post_001" },
          { id: crypto.randomUUID(), platform: "linkedin", content: "We're excited to announce our summer cold brew collection — crafted from single-origin beans, cold-steeped for 24 hours. Visit us today.", status: PostStatus.PUBLISHED, externalId: "li_post_001" },
        ],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Barista Behind the Scenes",
      content: { text: "Behind every great cup is a passionate barista", media: [{ type: "video", url: "/videos/barista-bts.mp4" }] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.MEDIUM,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Meet Sarah — our lead barista who's been perfecting latte art for 5 years. Every cup tells a story. Behind every great cup is a passionate barista. #BaristaLife #CoffeeArt", mediaUrls: ["/videos/barista-bts.mp4"], status: PostStatus.PUBLISHED, externalId: "ig_post_002" },
        ],
      },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Weekend Brunch Special Announcement",
      content: { text: "This weekend only — Avocado Toast + Coffee combo", media: [] },
      status: PostStatus.PUBLISHED,
      confidence: ConfidenceLevel.HIGH,
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "This weekend only: Avocado Toast + Any Coffee for $12. Tag your brunch buddy below. #WeekendBrunch #AvocadoToast", status: PostStatus.PUBLISHED, externalId: "ig_post_003" },
          { id: crypto.randomUUID(), platform: "facebook", content: "Join us this weekend for our special brunch combo! Avocado Toast + Any Coffee for just $12. See you there!", status: PostStatus.PUBLISHED, externalId: "fb_post_001" },
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
      content: { text: "Monday motivation with coffee", media: [{ type: "image", url: "/images/monday-motivation.jpg" }] },
      status: PostStatus.SCHEDULED,
      confidence: ConfidenceLevel.HIGH,
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Monday motivation: Life begins after coffee. What's your Monday goal? #MondayMotivation #CoffeeQuote", mediaUrls: ["/images/monday-motivation.jpg"], status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "linkedin", content: "Monday motivation from the Brew & Bean team: Every great day starts with a great cup of coffee. What are you working towards this week?", status: PostStatus.SCHEDULED },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "New Location Opening",
      content: { text: "We're opening our 3rd location downtown!", media: [] },
      status: PostStatus.SCHEDULED,
      confidence: ConfidenceLevel.MEDIUM,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Big news! Brew & Bean #3 is opening downtown next month. Follow us for the grand date. New location, same great coffee.", status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "facebook", content: "We're expanding! Our third Brew & Bean location is opening downtown. Stay tuned for the grand opening date!", status: PostStatus.SCHEDULED },
          { id: crypto.randomUUID(), platform: "linkedin", content: "We're thrilled to announce our third Brew & Bean location, opening in the heart of downtown. This expansion reflects the incredible support from our community.", status: PostStatus.SCHEDULED },
        ],
      },
    },
  });

  // Draft post
  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Coffee Bean Origin Story",
      content: { text: "From farm to cup — the journey of our Ethiopian Yirgacheffe", media: [{ type: "carousel", url: "/images/bean-origin-1.jpg" }] },
      status: PostStatus.DRAFT,
      confidence: ConfidenceLevel.LOW,
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "From farm to cup: Our Ethiopian Yirgacheffe beans are sourced directly from smallholder farmers in the Yirgacheffe region...", mediaUrls: ["/images/bean-origin-1.jpg", "/images/bean-origin-2.jpg"], status: PostStatus.DRAFT },
        ],
      },
    },
  });

  // Failed post
  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Flash Sale — Today Only",
      content: { text: "Flash sale! 50% off all pastries today!", media: [] },
      status: PostStatus.FAILED,
      confidence: ConfidenceLevel.MEDIUM,
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "Flash sale! 50% off all pastries today only. Don't miss out! #FlashSale #CoffeeAndPastries", status: PostStatus.FAILED, error: "Rate limit exceeded by Instagram API" },
        ],
      },
    },
  });

  // Publishing post
  await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      title: "Customer Spotlight: Best Latte Art",
      content: { text: "This week's best customer latte art", media: [{ type: "image", url: "/images/latte-art-spotlight.jpg" }] },
      status: PostStatus.PUBLISHING,
      confidence: ConfidenceLevel.HIGH,
      PostPlatform: {
        create: [
          { id: crypto.randomUUID(), platform: "instagram", content: "This week's latte art spotlight goes to @jane_doe for this stunning rosetta! Keep tagging us in your coffee moments.", mediaUrls: ["/images/latte-art-spotlight.jpg"], status: PostStatus.PUBLISHING },
        ],
      },
    },
  });

  // Analytics Snapshots
  await prisma.analyticsSnapshot.createMany({
    data: [
      { id: crypto.randomUUID(), postId: post1.id, platform: "instagram", likes: 342, comments: 28, shares: 15, impressions: 4520, engagementRate: 0.085, snapshotAt: now },
      { id: crypto.randomUUID(), postId: post1.id, platform: "x", likes: 89, comments: 12, shares: 23, impressions: 2100, engagementRate: 0.059, snapshotAt: now },
      { id: crypto.randomUUID(), postId: post1.id, platform: "linkedin", likes: 156, comments: 19, shares: 8, impressions: 3200, engagementRate: 0.057, snapshotAt: now },
      { id: crypto.randomUUID(), postId: post2.id, platform: "instagram", likes: 521, comments: 45, shares: 32, impressions: 6200, engagementRate: 0.096, snapshotAt: now },
      { id: crypto.randomUUID(), postId: post3.id, platform: "instagram", likes: 278, comments: 31, shares: 19, impressions: 3800, engagementRate: 0.086, snapshotAt: now },
      { id: crypto.randomUUID(), postId: post3.id, platform: "facebook", likes: 145, comments: 22, shares: 12, impressions: 2800, engagementRate: 0.064, snapshotAt: now },
    ],
  });

  console.log("Seed data created successfully.");
}

async function main() {
  console.log("Seeding database...");

  const workspace = await prisma.workspace.findFirst();
  const now = new Date();

  if (!workspace) {
    console.log("No workspace found — creating one.");
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: "demo@socialbeam.app",
        name: "Demo User",
        password: "$2b$10$hashedpasswordplaceholder",
        Workspace: {
          create: {
            id: crypto.randomUUID(),
            name: "Demo Workspace",
          },
        },
      },
      include: { Workspace: true },
    });
    const ws = user.Workspace[0];

    await prisma.userProfile.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: ws.id,
        bio: {
          name: "Brew & Bean Coffee Co.",
          businessType: "B2C",
          industry: "Food & Beverage — Specialty Coffee",
          goals: ["Increase brand awareness", "Drive foot traffic to locations", "Launch new seasonal drinks"],
          audienceDescription: "Urban professionals aged 25-40, coffee enthusiasts, remote workers",
        },
        tone: "casual",
        postTypes: { text: 20, image: 45, video: 25, carousel: 10 },
        imageAnalysis: {
          categories: ["product photography", "lifestyle", "behind-the-scenes"],
          dominantThemes: ["warm tones", "minimalist aesthetic", "natural light"],
          imageFrequency: 0.8,
        },
        audience: {
          demographics: { ageRange: "25-40", gender: "mixed", location: "Urban US" },
          interests: ["specialty coffee", "remote work", "sustainability", "local businesses"],
          painPoints: ["finding quality coffee shops", "sustainable sourcing"],
        },
      },
    });

    await prisma.connectedAccount.createMany({
      data: [
        { id: crypto.randomUUID(), workspaceId: ws.id, platform: "instagram", platformUserId: "brewbean_ig", accessToken: "encrypted_token", refreshToken: "encrypted_refresh", status: "connected" },
        { id: crypto.randomUUID(), workspaceId: ws.id, platform: "x", platformUserId: "brewbean_x", accessToken: "encrypted_token", refreshToken: "encrypted_refresh", status: "connected" },
        { id: crypto.randomUUID(), workspaceId: ws.id, platform: "linkedin", platformUserId: "brewbean_li", accessToken: "encrypted_token", refreshToken: "encrypted_refresh", status: "connected" },
      ],
    });

    await seedData(ws.id, now);
  } else {
    console.log("Workspace already exists.");
    await seedData(workspace.id, now);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
