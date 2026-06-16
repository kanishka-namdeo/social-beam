import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Load env
const envLines = readFileSync('.env', 'utf-8').split('\n');
for (const line of envLines) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0 && !key.startsWith('#')) {
    process.env[key.trim()] = rest.join('=').trim();
  }
}

// Import prisma after env load
const { prisma } = await import('./lib/prisma.js');

const accounts = await prisma.connectedAccount.findMany({
  select: { id: true, workspaceId: true, platform: true, platformUserId: true, status: true, sessionCookie: true, cookieExpiry: true }
});
console.log(JSON.stringify(accounts, null, 2));
await prisma.$disconnect();
