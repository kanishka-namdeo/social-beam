import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendPushNotification } from "./push-sender";

export interface CreateNotificationInput {
  userId: string;
  type: "info" | "success" | "warning" | "error";
  category:
    | "post_publish"
    | "engagement"
    | "system"
    | "billing"
    | "ai_insight"
    | "connection"
    | "brand"
    | "custom";
  title: string;
  description?: string;
  actionUrl?: string;
  workspaceId?: string;
}

type NotificationType = CreateNotificationInput["type"];
type NotificationCategory = CreateNotificationInput["category"];

interface CategoryChannelPrefs {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

const DEFAULT_CATEGORY_PREFERENCES: Record<string, CategoryChannelPrefs> = {
  post_publish: { in_app: true, email: true, push: false },
  engagement: { in_app: true, email: false, push: false },
  system: { in_app: true, email: true, push: false },
  billing: { in_app: true, email: true, push: true },
  ai_insight: { in_app: true, email: false, push: false },
  connection: { in_app: true, email: false, push: false },
  brand: { in_app: true, email: false, push: false },
};

export async function shouldSendNotification(
  userId: string,
  category: string,
  channel: "in_app" | "email" | "push"
): Promise<boolean> {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      return DEFAULT_CATEGORY_PREFERENCES[category]?.[channel] ?? true;
    }

    if (channel === "in_app" && !preference.inAppEnabled) return false;
    if (channel === "email" && !preference.emailEnabled) return false;
    if (channel === "push" && !preference.pushEnabled) return false;

    const categories = preference.categories as unknown as Record<
      string,
      CategoryChannelPrefs
    >;
    const categoryPref = categories?.[category];

    if (categoryPref) {
      return categoryPref[channel] ?? true;
    }

    return true;
  } catch (error) {
    logger.error("Failed to check notification preferences", {
      userId,
      category,
      channel,
      error: String(error),
    });
    return true;
  }
}

export async function createNotification(
  input: CreateNotificationInput
) {
  const { userId, type, category, title, description, actionUrl, workspaceId } =
    input;

  logger.info("notification.dispatch.create", {
    userId,
    category,
    title,
    type,
  });

  const notification = await prisma.notification.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      type,
      category,
      title,
      description,
      actionUrl,
      workspaceId,
    },
  });

  const [shouldEmail, shouldPush] = await Promise.all([
    shouldSendNotification(userId, category, "email"),
    shouldSendNotification(userId, category, "push"),
  ]);

  if (shouldEmail) {
    logger.info("notification.dispatch.email_pending", {
      userId,
      notificationId: notification.id,
      category,
    });
    // TODO: Queue email via Resend when email integration is wired
  }

  if (shouldPush) {
    logger.info("notification.dispatch.push_pending", {
      userId,
      notificationId: notification.id,
      category,
    });
    try {
      await sendPushNotification(userId, {
        title,
        body: description ?? "",
        url: actionUrl,
        category,
        type,
      });
    } catch (pushErr) {
      logger.error("notification.dispatch.push_failed", {
        userId,
        notificationId: notification.id,
        error: String(pushErr),
      });
    }
  }

  return notification;
}
