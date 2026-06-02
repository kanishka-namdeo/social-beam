require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const queries = [
    ['Posts', 'SELECT COUNT(*) FROM "Post" WHERE id LIKE $1', ['demo_post_%']],
    ['PostPlatforms', 'SELECT COUNT(*) FROM "PostPlatform" WHERE "postId" LIKE $1', ['demo_post_%']],
    ['AnalyticsSnapshots', 'SELECT COUNT(*) FROM "AnalyticsSnapshot" WHERE "postId" LIKE $1', ['demo_post_%']],
    ['FollowerSnapshots', 'SELECT COUNT(*) FROM "FollowerSnapshot" WHERE id = $1', ['demo_foll_1']],
  ];
  
  console.log('Demo data verification:');
  console.log('  WorkspaceId used: cb00516d621a641b5ac5e72cf');
  console.log('');
  
  let total = 0;
  for (const [name, query, params] of queries) {
    const { rows } = await pool.query(query, params);
    const count = parseInt(rows[0].count);
    console.log('  ' + name + ': ' + count);
    total += count;
  }
  
  console.log('');
  console.log('  Total records created: ' + total);
  
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
