const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const testEmail = 'test@socialbeam.app';
  
  // Get user info
  const { rows: userRows } = await pool.query('SELECT id, email, name FROM "User" WHERE email = $1', [testEmail]);
  console.log('User:', userRows[0]);
  
  // Get workspaces
  const { rows: wsRows } = await pool.query('SELECT id, name, "userId" FROM "Workspace" WHERE "userId" = $1', [userRows[0].id]);
  console.log('Workspaces:', wsRows);
  
  if (wsRows.length === 0) {
    const wsId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      'INSERT INTO "Workspace" (id, name, "userId") VALUES ($1, $2, $3)',
      [wsId, 'Test Workspace', userRows[0].id]
    );
    console.log('Created workspace:', wsId);
  }
  
  // Get onboarding session
  const { rows: osRows } = await pool.query('SELECT id, "userId", "currentStep", "completedAt" FROM "OnboardingSession" WHERE "userId" = $1', [userRows[0].id]);
  console.log('OnboardingSession:', osRows);
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
