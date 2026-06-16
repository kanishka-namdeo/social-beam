import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "push-sender" });

let vapidConfigured = false;

function ensureVapidConfig() {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:notifications@socialbeam.app",
    publicKey,
    privateKey,
  );

  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  category: string;
  type: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  ensureVapidConfig();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    log.debug("push.no_subscriptions", { userId });
    return;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    category: payload.category,
    type: payload.type,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, body, {
        TTL: 86400,
        urgency: "normal",
      });
    }),
  );

  let successCount = 0;
  const expiredEndpoints: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      successCount++;
    } else {
      const err = result.reason;
      const statusCode = err?.statusCode ?? err?.status;

      if (statusCode === 404 || statusCode === 410) {
        expiredEndpoints.push(subscriptions[i].endpoint);
      } else {
        log.warn("push.send_failed", {
          userId,
          endpoint: subscriptions[i].endpoint,
          error: String(err),
        });
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
    log.info("push.expired_subscriptions_cleaned", {
      userId,
      count: expiredEndpoints.length,
    });
  }

  log.info("push.batch_complete", {
    userId,
    totalSubscriptions: subscriptions.length,
    successCount,
    failedCount: results.length - successCount,
  });
}
