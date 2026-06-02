import { prisma } from './lib/prisma';
import { decryptToken } from './lib/oauth/crypto';

async function main() {
  console.log('=== LinkedIn Account Debug ===\n');

  // Find all LinkedIn connected accounts
  const linkedinAccounts = await prisma.connectedAccount.findMany({
    where: {
      platform: 'linkedin',
    },
    include: {
      Workspace: true,
    },
  });

  console.log(`Found ${linkedinAccounts.length} LinkedIn account(s):\n`);

  for (const account of linkedinAccounts) {
    console.log('--- Account ---');
    console.log('ID:', account.id);
    console.log('Provider:', (account as Record<string, unknown>).provider);
    console.log('Platform User ID:', account.platformUserId);
    console.log('Display Name:', account.displayName);
    console.log('Status:', account.status);
    console.log('Access Token (encrypted, first 50 chars):', account.accessToken ? account.accessToken.substring(0, 50) + '...' : 'NULL');
    console.log('Refresh Token (encrypted, first 50 chars):', account.refreshToken ? account.refreshToken.substring(0, 50) + '...' : 'NULL');
    console.log('Token Expiry:', account.tokenExpiry);
    console.log('Metadata:', JSON.stringify(account.metadata, null, 2));
    console.log('Workspace ID:', account.workspaceId);
    console.log('Workspace Name:', account.Workspace?.name || 'N/A');
    console.log('Created At:', account.createdAt);
    console.log('Updated At:', account.updatedAt);
    console.log('');

    // Try to decrypt the token to see if it's valid
    if (account.accessToken) {
      try {
        const decrypted = decryptToken(account.accessToken);
        console.log('Token decrypted successfully. First 30 chars:', decrypted.substring(0, 30) + '...');
        console.log('Token length:', decrypted.length);
        console.log('Token starts with:', decrypted.substring(0, 10));
      } catch (e) {
        console.log('Token decryption failed:', e);
      }
    }
    console.log('');
  }

  // Check for any LinkedIn-related errors or logs
  const recentLogs = await prisma.activityLog.findMany({
    where: {
      OR: [
        { provider: 'linkedin' },
        { message: { contains: 'linkedin', mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`\n=== Recent LinkedIn Activity Logs (${recentLogs.length}) ===\n`);
  for (const log of recentLogs) {
    console.log(`[${log.createdAt.toISOString()}] ${log.level}: ${log.message}`);
    if (log.metadata) {
      console.log('  Metadata:', JSON.stringify(log.metadata).substring(0, 200));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
