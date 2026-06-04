/**
 * Extract LinkedIn li_at cookie from database for browser injection.
 * Decrypts the stored sessionCookie for a workspace.
 */
import { createDecipheriv } from "crypto";

const ENCRYPTION_KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX) {
  console.error("ERROR: TOKEN_ENCRYPTION_KEY not set");
  process.exit(1);
}

function decryptToken(encryptedBase64) {
  const key = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const iv = encrypted.subarray(0, 16);
  const authTag = encrypted.subarray(16, 32);
  const ciphertext = encrypted.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const workspaceId = process.argv[2];
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const result = await client.query(
    `SELECT id, "workspaceId", "platformUserId", "sessionCookie", "cookieExpiry" FROM "ConnectedAccount" WHERE platform = $1`,
    ['linkedin']
  );
  
  if (result.rows.length === 0) {
    console.log('No LinkedIn ConnectedAccounts found.');
    await client.end();
    return;
  }
  
  for (const row of result.rows) {
    console.log(`\n=== Account ===`);
    console.log(`ID: ${row.id}`);
    console.log(`Workspace: ${row.workspaceId}`);
    console.log(`Platform User: ${row.platformUserId}`);
    console.log(`Cookie Expiry: ${row.cookieExpiry}`);
    
    if (row.sessionCookie) {
      try {
        const decrypted = decryptToken(row.sessionCookie);
        console.log(`Cookie length: ${decrypted.length}`);
        
        if (!workspaceId || workspaceId === row.workspaceId) {
          console.log(`\nFull decrypted cookie for workspace ${row.workspaceId}:`);
          console.log(decrypted);
        }
      } catch (err) {
        console.log(`Failed to decrypt: ${err.message}`);
      }
    } else {
      console.log('No session cookie stored.');
    }
  }
  
  await client.end();
}

main().catch(console.error);
