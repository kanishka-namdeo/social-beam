import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const DEMO_EMAIL = 'demo@socialbeam.dev';
const DEMO_PASSWORD = 'demo1234!';
const DEMO_NAME = 'Demo User';

function cuid() {
  return 'c' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const checkResult = await pool.query('SELECT id FROM "User" WHERE email = $1', [DEMO_EMAIL]);
    if (checkResult.rows.length > 0) {
      const userId = checkResult.rows[0].id;
      const wsResult = await pool.query('SELECT id FROM "Workspace" WHERE "userId" = $1 LIMIT 1', [userId]);
      console.log('Demo user already exists:');
      console.log(`  Email: ${DEMO_EMAIL}`);
      console.log(`  Password: ${DEMO_PASSWORD}`);
      console.log(`  User ID: ${userId}`);
      console.log(`  Workspace ID: ${wsResult.rows[0]?.id ?? 'none'}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
    const userId = cuid();
    const workspaceId = cuid();

    await pool.query(
      'INSERT INTO "User" (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [userId, DEMO_EMAIL, DEMO_NAME, hashedPassword]
    );

    await pool.query(
      'INSERT INTO "Workspace" (id, "userId", name, "autonomyLevel", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
      [workspaceId, userId, 'My Workspace', 'suggestions']
    );

    console.log('Demo user created successfully.');
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Workspace ID: ${workspaceId}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
