const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://socialbeam:socialbeam@localhost:5432/socialbeam'
  });

  const result = await pool.query('SELECT id, email, password FROM "User" WHERE email = $1', ['demo@socialbeam.dev']);
  const user = result.rows[0];
  if (!user) {
    console.log('User not found');
    await pool.end();
    return;
  }

  console.log('User ID:', user.id);
  console.log('Password hash prefix:', user.password.substring(0, 20) + '...');

  const testPassword = 'demo1234!';
  const isValid = await bcrypt.compare(testPassword, user.password);
  console.log('Password valid:', isValid);

  // Also try with the testuser2 password
  const testPassword2 = 'testpassword123';
  const user2Result = await pool.query('SELECT id, email, password FROM "User" WHERE email = $1', ['testuser2@socialbeam.io']);
  const user2 = user2Result.rows[0];
  if (user2) {
    const isValid2 = await bcrypt.compare(testPassword2, user2.password);
    console.log('testuser2 password valid:', isValid2);
  }

  await pool.end();
})();
