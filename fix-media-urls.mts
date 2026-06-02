import { PrismaClient } from '@/app/generated/prisma';
import { Pool } from 'pg';

async function main() {
  // Create a direct database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query('SELECT id, "publicUrl" FROM "MediaAsset"');
    console.log(`Found ${result.rows.length} media assets`);

    let fixed = 0;
    for (const row of result.rows) {
      const publicUrl = row.publicUrl;
      const id = row.id;
      
      if (publicUrl.includes('//file') || !publicUrl.match(/\/api\/media\/[^/]+\/file$/)) {
        const newPublicUrl = `/api/media/${id}/file`;
        await pool.query('UPDATE "MediaAsset" SET "publicUrl" = $1 WHERE id = $2', [newPublicUrl, id]);
        console.log(`Fixed: ${id} - Old: "${publicUrl}" -> New: "${newPublicUrl}"`);
        fixed++;
      } else {
        console.log(`OK: ${id} - "${publicUrl}"`);
      }
    }

    console.log(`\nFixed ${fixed} out of ${result.rows.length} assets`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
