import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const posts = await prisma.post.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      confidence: true,
      scheduledAt: true,
      publishedAt: true,
      platforms: {
        select: {
          platform: true,
          status: true,
          error: true,
        },
      },
    },
  });

  return NextResponse.json({ posts });
}
