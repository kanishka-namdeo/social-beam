const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const testEmail = 'test@socialbeam.app';
  
  const { rows } = await pool.query('SELECT id FROM "User" WHERE email = $1', [testEmail]);
  if (rows.length === 0) {
    console.log('User not found');
    await pool.end();
    return;
  }
  const userId = rows[0].id;
  
  const now = new Date();
  await pool.query(
    `INSERT INTO "OnboardingSession" (id, "userId", "currentStep", "completedAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("userId") DO UPDATE SET "currentStep" = $3, "completedAt" = $4`,
    [`onboard_${Date.now()}`, userId, 'completion', now, now]
  );
  
  console.log('Marked onboarding as complete for user:', userId);
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
