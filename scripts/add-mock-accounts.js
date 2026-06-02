const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const testEmail = 'test@socialbeam.app';
  const { rows: userRows } = await pool.query('SELECT id FROM "User" WHERE email = $1', [testEmail]);
  const userId = userRows[0].id;
  
  const { rows: wsRows } = await pool.query('SELECT id FROM "Workspace" WHERE "userId" = $1', [userId]);
  const workspaceId = wsRows[0].id;
  
  console.log('Workspace ID:', workspaceId);
  
  // Check if accounts already exist
  const { rows: existing } = await pool.query(
    'SELECT platform FROM "ConnectedAccount" WHERE "workspaceId" = $1',
    [workspaceId]
  );
  
  if (existing.length > 0) {
    console.log('Connected accounts already exist:', existing);
    await pool.end();
    return;
  }
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Add mock connected accounts for testing
  const accounts = [
    { platform: 'instagram', platformUserId: 'test_ig_user', username: 'testuser_ig' },
    { platform: 'x', platformUserId: 'test_x_user', username: 'testuser_x' },
    { platform: 'linkedin', platformUserId: 'test_li_user', username: 'Test User' },
    { platform: 'facebook', platformUserId: 'test_fb_user', username: 'Test User FB' },
  ];
  
  for (const acc of accounts) {
    const id = `ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      `INSERT INTO "ConnectedAccount" 
       (id, "workspaceId", platform, "platformUserId", "platformUsername", "accessToken", "refreshToken", status, "tokenExpiry") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        workspaceId,
        acc.platform,
        acc.platformUserId,
        acc.username,
        'encrypted_test_token',
        'encrypted_refresh_token',
        'connected',
        futureDate
      ]
    );
    console.log('Added connected account:', acc.platform);
  }
  
  console.log('All mock accounts added successfully');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
