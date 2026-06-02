import dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('SELECT id, email, password FROM "User" WHERE email = $1', ['browsertester2026@test.com']);
  console.log('User found:', !!res.rows[0]);
  if (res.rows[0]) {
    const hash = res.rows[0].password;
    console.log('Hash prefix:', hash.substring(0, 10));
    const testPasswords = ['test123456', 'password123', 'Test1234!', 'browsertest', 'browser123', 'test'];
    for (const pw of testPasswords) {
      const isValid = await bcrypt.compare(pw, hash);
      console.log(`${pw}:`, isValid);
      if (isValid) break;
    }
    // If none worked, set a known password
    const newHash = await bcrypt.hash('browsertest123', 12);
    await pool.query('UPDATE "User" SET password = $1 WHERE email = $2', [newHash, 'browsertester2026@test.com']);
    console.log('Password reset to: browsertest123');
  }
  await pool.end();
}
main().catch(console.error);
