import { prisma } from "@/lib/prisma";

async function main() {
  const result = await prisma.redditTrendingPost.deleteMany({ where: {} });
  console.log("Deleted", result.count, "posts");
  await prisma.$disconnect();
}

main().catch(console.error);
