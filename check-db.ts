import { PrismaClient } from "@/app/generated/prisma";
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

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const workspaces = await prisma.workspace.findMany({ select: { id: true, userId: true, name: true } });
  console.log("WORKSPACES:", JSON.stringify(workspaces, null, 2));

  const profiles = await prisma.userProfile.findMany({ select: { id: true, workspaceId: true } });
  console.log("PROFILES:", JSON.stringify(profiles, null, 2));

  const posts = await prisma.post.count();
  console.log("POSTS COUNT:", posts);

  const connectedAccounts = await prisma.connectedAccount.findMany({ select: { id: true, workspaceId: true, platform: true, status: true } });
  console.log("CONNECTED ACCOUNTS:", JSON.stringify(connectedAccounts, null, 2));

  // Check if the demo user has a profile
  const demoUser = users.find(u => u.email === 'user@test.com');
  if (demoUser) {
    const demoWorkspace = workspaces.find(w => w.userId === demoUser.id);
    if (demoWorkspace) {
      const profile = profiles.find(p => p.workspaceId === demoWorkspace.id);
      if (!profile) {
        console.log(`Demo user workspace ${demoWorkspace.id} has NO profile - creating one...`);
        await prisma.userProfile.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId: demoWorkspace.id,
            bio: {
              name: "Brew & Bean Coffee Co.",
              businessType: "B2C",
              industry: "Food & Beverage — Specialty Coffee",
              goals: ["Increase brand awareness", "Drive foot traffic to locations"],
              audienceDescription: "Urban professionals aged 25-40",
            },
            tone: "casual",
            postTypes: { text: 20, image: 45, video: 25, carousel: 10 },
            imageAnalysis: {
              categories: ["product photography", "lifestyle"],
              dominantThemes: ["warm tones", "minimalist aesthetic"],
              imageFrequency: 0.8,
            },
            audience: {
              demographics: { ageRange: "25-40", gender: "mixed", location: "Urban US" },
              interests: ["specialty coffee", "remote work"],
              painPoints: ["finding quality coffee shops"],
            },
          },
        });
        console.log("Profile created successfully!");
      } else {
        console.log("Demo user already has a profile.");
      }
    }
  }
}

main().then(() => prisma.$disconnect());
