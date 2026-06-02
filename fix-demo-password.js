const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://socialbeam:socialbeam@localhost:5432/socialbeam'
  });

  const email = 'demo@socialbeam.dev';
  const password = 'demo1234!';
  const hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    'UPDATE "User" SET password = $1 WHERE email = $2 RETURNING id, email',
    [hash, email]
  );

  if (result.rows.length > 0) {
    console.log('Password updated for:', result.rows[0]);
  } else {
    console.log('User not found, creating...');
    const userId = 'c' + require('crypto').randomUUID().replace(/-/g, '').slice(0, 24);
    const workspaceId = 'c' + require('crypto').randomUUID().replace(/-/g, '').slice(0, 24);

    await pool.query(
      'INSERT INTO "User" (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [userId, email, 'Demo User', hash]
    );

    await pool.query(
      'INSERT INTO "Workspace" (id, "userId", name, "autonomyLevel", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
      [workspaceId, userId, 'My Workspace', 'suggestions']
    );

    console.log('Created user:', { userId, email, workspaceId });
  }

  await pool.end();
})();
