const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const testEmail = 'test@socialbeam.app';
  const testPassword = 'test123456';
  
  // Check if user exists
  const { rows } = await pool.query('SELECT id FROM "User" WHERE email = $1', [testEmail]);
  if (rows.length > 0) {
    console.log('Test user already exists:', testEmail);
    await pool.end();
    return;
  }
  
  const hashedPassword = await bcrypt.hash(testPassword, 12);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  await pool.query(
    'INSERT INTO "User" (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, testEmail, 'Test User', hashedPassword, now, now]
  );
  
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await pool.query(
    'INSERT INTO "Workspace" (id, name, "userId") VALUES ($1, $2, $3)',
    [workspaceId, 'Test Workspace', userId]
  );
  
  console.log('Created test user:', testEmail, 'with password:', testPassword);
  console.log('Created workspace:', workspaceId);
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
