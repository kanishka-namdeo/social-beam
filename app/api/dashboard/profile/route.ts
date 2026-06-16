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

  const profile = await prisma.userProfile.findUnique({ where: { workspaceId } });

  if (!profile) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      tone: profile.tone,
      postTypes: profile.postTypes as Record<string, unknown> | null,
      audience: profile.audience as Record<string, unknown> | null,
      bio: profile.bio as Record<string, unknown> | null,
    },
  });
}
