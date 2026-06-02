/**
 * Unified cookie extraction script for all platforms.
 *
 * Usage:
 *   node scripts/extract-cookie.mjs <platform>
 *
 * Supported platforms: linkedin, instagram, x, tiktok, facebook, pinterest, youtube, threads, bluesky
 *
 * This script delegates to the platform-specific extraction scripts.
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PLATFORM_SCRIPTS = {
  linkedin: "extract-linkedin-cookie.mjs",
  instagram: "extract-instagram-cookie.mjs",
  x: "extract-x-cookie.mjs",
  tiktok: "extract-tiktok-cookie.mjs",
  facebook: "extract-facebook-cookie.mjs",
  pinterest: "extract-pinterest-cookie.mjs",
  youtube: "extract-youtube-cookie.mjs",
  threads: "extract-threads-cookie.mjs",
  bluesky: "extract-bluesky-cookie.mjs",
};

const platform = process.argv[2]?.toLowerCase();

if (!platform) {
  console.log("Usage: node scripts/extract-cookie.mjs <platform>\n");
  console.log("Supported platforms:");
  Object.keys(PLATFORM_SCRIPTS).forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}

const script = PLATFORM_SCRIPTS[platform];
if (!script) {
  console.error(`Unknown platform: ${platform}`);
  console.log("Supported platforms:", Object.keys(PLATFORM_SCRIPTS).join(", "));
  process.exit(1);
}

const scriptPath = join(__dirname, script);

console.log(`Extracting cookie for ${platform}...\n`);

const child = spawn("node", [scriptPath], {
  stdio: "inherit",
  cwd: process.cwd(),
});

child.on("close", (code) => {
  process.exit(code);
});
