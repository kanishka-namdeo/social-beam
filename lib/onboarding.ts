import {
  isOnboardingComplete as dbIsComplete,
  markSessionComplete as dbMarkComplete,
} from "@/lib/db/onboarding";

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  return dbIsComplete(userId);
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await dbMarkComplete(userId);
}
