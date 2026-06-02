import { withPage as withPageShared, shutdown as shutdownShared } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";

type PlaywrightPage = Parameters<typeof withPageShared>[0] extends (fn: infer P) => any ? P : never;

export async function withPage<T>(fn: (page: PlaywrightPage) => Promise<T>): Promise<T> {
  return withPageShared(fn, { stealth: false });
}

export async function shutdownBrowser(): Promise<void> {
  await shutdownShared();
}
