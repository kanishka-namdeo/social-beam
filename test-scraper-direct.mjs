import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import { scrapeLinkedInComments } from './lib/inbox/scrapers/linkedin-scraper.js';

console.log('=== Testing LinkedIn Scraper Directly ===\n');

const comments = await scrapeLinkedInComments();

console.log(`\nScraped ${comments.length} comments`);
for (const c of comments.slice(0, 10)) {
  console.log(`  ${c.authorName}: ${c.content.substring(0, 80)}...`);
}

await prisma.$disconnect();
