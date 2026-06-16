import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PLATFORMS } from "@/lib/oauth/platform-icons";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import { publishPost } from "@/lib/publish/orchestrator";
import type { DuePost } from "@/lib/publish/types";
import { checkIdempotencyKey, storeIdempotencyKey, getIdempotencyKey } from "@/lib/idempotency";
import { revalidatePath } from "next/cache";

const composeSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, "Content is required").max(63206),
  platforms: z
    .array(z.enum(PLATFORMS))
    .min(1, "At least one platform is required"),
  scheduledAt: z.string().datetime().optional(),
  action: z.enum(["draft", "publish", "schedule"]).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  immediate: z.boolean().optional(),
  signatureId: z.string().optional(),
  signatureEnabled: z.boolean().optional(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    log.info("api.request.start", {
      method: "POST",
      path: "/api/compose",
      userId: user.id,
    });

    // Idempotency: return cached response if key already processed
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const cached = await checkIdempotencyKey(idempotencyKey, user.id);
      if (cached) {
        log.info("api.compose.idempotency.hit", { userId: user.id });
        return NextResponse.json(cached.response, { status: 200 });
      }
    }

    // Verify connected accounts for requested platforms
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        workspaceId: user.workspaceId,
        platform: { in: PLATFORMS as unknown as string[] },
        status: "connected",
      },
      select: { platform: true },
    });
    const connectedPlatformSet = new Set(connectedAccounts.map((a) => a.platform));

    const body = await req.json();
    const parsed = composeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, content, platforms, scheduledAt, action, mediaUrls, immediate, signatureId, signatureEnabled } = parsed.data;

    // Validate all requested platforms are connected
    const unconnected = platforms.filter((p) => !connectedPlatformSet.has(p));
    if (unconnected.length > 0) {
      return NextResponse.json(
        {
          error: "Platforms not connected",
          platforms: unconnected,
        },
        { status: 400 },
      );
    }

    const status = action === "publish" && immediate ? "PUBLISHING" : action === "publish" ? "SCHEDULED" : action === "schedule" ? "SCHEDULED" : "DRAFT";

    // Get user role
    const userRole = (user as { role?: string })?.role ?? 'FREE_USER';
    const isPremiumOrAdmin = userRole === 'PREMIUM_USER' || userRole === 'ADMIN';

    // Fetch workspace with signature data
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      include: { BrandContext: { select: { defaultSignatureText: true, defaultSignatureUrl: true } }, PostSignature: true }
    });

    // Determine signature to append
    const { formatSignature } = await import('@/lib/compose/signature-formatter');

    // Build per-platform content with signatures
    const platformContents: Record<string, string> = {};
    for (const platform of platforms) {
      let finalContent = content;
      
      if (!isPremiumOrAdmin) {
        // FREE USER: append default signature only if user has not disabled it
        if (signatureEnabled !== false && workspace?.signatureEnabled) {
          const defaultText = workspace?.BrandContext?.defaultSignatureText ?? 'Written with SocialBeam';
          const defaultUrl = workspace?.BrandContext?.defaultSignatureUrl 
            ?? (workspace?.publicHandle ? `https://socialbeam.app/u/${workspace.publicHandle}` : 'https://socialbeam.app');
          const sig = formatSignature({ text: defaultText, url: defaultUrl }, platform as any);
          finalContent = content + sig;
        }
      } else if (signatureEnabled !== false && workspace?.signatureEnabled) {
        // PREMIUM: use selected or default signature
        let sig;
        if (signatureId) {
          const selected = workspace.PostSignature.find(s => s.id === signatureId);
          if (selected) sig = formatSignature({ text: selected.text, url: selected.url ?? undefined }, platform as any);
        } else {
          const defaultSig = workspace.PostSignature.find(s => s.isDefault);
          if (defaultSig) sig = formatSignature({ text: defaultSig.text, url: defaultSig.url ?? undefined }, platform as any);
        }
        if (sig) finalContent = content + sig;
      }
      
      // Validate character limit after appending signature
      const charLimit = PLATFORM_CHAR_LIMITS[platform];
      if (charLimit && finalContent.length > charLimit) {
        return NextResponse.json(
          { error: `Content exceeds ${charLimit} character limit for ${platform}` },
          { status: 400 },
        );
      }
      
      platformContents[platform] = finalContent;
    }

    const post = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: user.workspaceId,
        title,
        content: { text: content } as Prisma.InputJsonValue,
        status,
        aiGenerated: true,
        scheduledAt: scheduledAt != null ? new Date(scheduledAt) : action === "publish" ? new Date() : null,
        PostPlatform: {
          create: platforms.map((platform) => ({
            id: crypto.randomUUID(),
            platform,
            content: platformContents[platform],
            mediaUrls: mediaUrls ?? [],
            status,
          })),
        },
      },
      include: {
        PostPlatform: { select: { id: true, platform: true, content: true, mediaUrls: true } },
      },
    });

    // Revalidate relevant paths after post creation
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/compose");
    revalidatePath("/analytics");

    log.info("api.request.success", {
      postId: post.id,
      status,
      platformCount: platforms.length,
      immediate: immediate ?? false,
    });

    // Store idempotency key if provided
    if (idempotencyKey) {
      const responseData = {
        data: {
          id: post.id,
          title: post.title,
          status: post.status,
          scheduledAt: post.scheduledAt,
          platforms: post.PostPlatform.map(p => ({
            id: p.id,
            platform: p.platform,
          })),
        },
      };
      await storeIdempotencyKey(idempotencyKey, user.id, responseData);
    }

    // If immediate publish, call publishPost synchronously
    if (action === "publish" && immediate) {
      try {
        const duePost: DuePost = {
          id: post.id,
          workspaceId: post.workspaceId,
          scheduledAt: post.scheduledAt ?? new Date(),
          platforms: post.PostPlatform.map(p => ({
            platformId: p.id,
            platform: p.platform as DuePost['platforms'][number]['platform'],
            content: p.content,
            mediaUrls: (p.mediaUrls as string[]) ?? [],
          })),
        };

        log.info("api.immediate.publish.start", { postId: post.id });

        const result = await publishPost(duePost);

        log.info("api.immediate.publish.complete", {
          postId: post.id,
          finalStatus: result.finalStatus,
          successCount: result.results.filter(r => r.success).length,
          failureCount: result.results.filter(r => !r.success).length,
        });

        return NextResponse.json(
          {
            data: {
              id: post.id,
              title: post.title,
              status: result.finalStatus,
              scheduledAt: post.scheduledAt,
              platforms: post.PostPlatform.map(p => ({
                id: p.id,
                platform: p.platform,
              })),
              platformResults: result.results.map(r => ({
                platform: r.platform,
                success: r.success,
                externalId: r.externalId,
                externalUrl: r.externalUrl,
                error: r.error,
              })),
            },
          },
          { status: 200 },
        );
      } catch (publishError) {
        log.error("api.immediate.publish.error", {
          postId: post.id,
          error: String(publishError),
        });

        // Roll back post status from PUBLISHING to FAILED
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            PostPlatform: {
              updateMany: {
                where: { postId: post.id },
                data: { status: "FAILED" },
              },
            },
          },
        }).catch((rollbackErr) => {
          log.error("api.immediate.publish.rollback_failed", {
            postId: post.id,
            error: String(rollbackErr),
          });
        });

        return NextResponse.json(
          {
            data: {
              id: post.id,
              title: post.title,
              status: "FAILED",
              error: "Publish failed",
            },
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        data: {
          id: post.id,
          title: post.title,
          status: post.status,
          scheduledAt: post.scheduledAt,
          platforms: (post as { PostPlatform?: Array<{ id: string; platform: string }> }).PostPlatform?.map((p: { id: string; platform: string }) => ({
            id: p.id,
            platform: p.platform,
          })) ?? [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    const { recordError, checkErrorRate } = await import('@/lib/error-rate-monitor');
    await recordError('compose.route');
    await checkErrorRate(10);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
