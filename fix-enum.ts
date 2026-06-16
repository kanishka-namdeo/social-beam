import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://socialbeam:socialbeam@localhost:5432/socialbeam'
});

async function fixEnum() {
  try {
    await client.connect();
    
    // Check current enum values
    const result = await client.query(`
      SELECT unnest(enum_range(NULL::"ActivityType")) AS value
    `);
    
    console.log('Current ActivityType values:', result.rows.map(r => r.value));
    
    // Add LINKEDIN_IMPORT if it doesn't exist
    const hasLinkedinImport = result.rows.some(r => r.value === 'LINKEDIN_IMPORT');
    
    if (!hasLinkedinImport) {
      console.log('Adding LINKEDIN_IMPORT to ActivityType enum...');
      await client.query(`
        ALTER TYPE "ActivityType" ADD VALUE 'LINKEDIN_IMPORT'
      `);
      console.log('✓ Added LINKEDIN_IMPORT');
    } else {
      console.log('✓ LINKEDIN_IMPORT already exists');
    }
    
    // Verify
    const verifyResult = await client.query(`
      SELECT unnest(enum_range(NULL::"ActivityType")) AS value
    `);
    console.log('\nFinal ActivityType values:', verifyResult.rows.map(r => r.value));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixEnum();
