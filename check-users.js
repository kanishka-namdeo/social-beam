const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://socialbeam:socialbeam@localhost:5432/socialbeam'
  });

  const result = await pool.query('SELECT id, email, name, "createdAt" FROM "User"');
  console.log('Users in database:', JSON.stringify(result.rows, null, 2));

  await pool.end();
})();
