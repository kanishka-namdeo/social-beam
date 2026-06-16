#!/usr/bin/env node
/**
 * CloakBrowser CDP Bridge
 * 
 * This script is now deprecated. Use the official cloakserve command instead:
 * 
 *   npx cloakbrowser cloakserve --port=9222
 * 
 * Or with Docker:
 *   docker run -d --name cloak -p 127.0.0.1:9222:9222 cloakhq/cloakbrowser cloakserve
 * 
 * The cloakserve command starts a CDP multiplexer that:
 * - Spawns separate Chrome processes per fingerprint seed
 * - Routes CDP connections through a single port
 * - Supports per-connection fingerprinting via query params
 * 
 * Connect from your app:
 *   await chromium.connectOverCDP('http://localhost:9222?fingerprint=12345')
 */

console.log('[cloakbrowser-bridge] This bridge script is deprecated.');
console.log('[cloakbrowser-bridge] Please use: npx cloakbrowser cloakserve --port=9222');
console.log('[cloakbrowser-bridge] Or update your Docker compose to use the cloakserve command.');
process.exit(1);
