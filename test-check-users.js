const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({ take: 5 });
  console.log(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, workspaceId: u.workspaceId })), null, 2));
  
  // Check if any have userProfile
  for (const u of users) {
    const profile = await p.userProfile.findUnique({ where: { workspaceId: u.workspaceId } });
    console.log(`User ${u.email}: profile=${!!profile}`);
  }
  
  await p.$disconnect();
}

main().catch(console.error);
