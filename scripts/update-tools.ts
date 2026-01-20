import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db, tools } from '../lib/db';
import { sql } from 'drizzle-orm';

// Helper function to create slug from text
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse CSV file
function parseCSV(filePath: string): any[] {
  const fileContent = readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

async function updateTools() {
  console.log('🛠️  Updating tools in Vercel Postgres...\n');

  // Step 1: Delete all existing tools
  console.log('🗑️  Clearing existing tools data...');
  await db.execute(sql`DELETE FROM tools`);
  console.log('✅ Existing tools cleared\n');

  // Step 2: Import corrected tools data
  console.log('📥 Importing corrected tools data...');
  const toolsData = parseCSV('/Users/annelisamoody/Downloads/spreadsheets/[MASTER] tools_full_db - CORRECTED_CLEAN.csv');

  let successCount = 0;
  let failCount = 0;

  for (const row of toolsData) {
    try {
      await db.insert(tools).values({
        name: row.Name,
        slug: createSlug(row.Name),
        category: row.Category || null,
        description: row.Description || null,
        pricing: row.Pricing || null,
        url: row.URL || null,
        featured: row.Featured === 'TRUE' || row.Featured === 'true' || false,
        priority: row.Priority ? parseInt(row.Priority) : null,
        easeOfUse: row['Ease of Use'] || null,
        published: true,
      });
      console.log(`  ✓ ${row.Name}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to insert tool: ${row.Name}`, error);
      failCount++;
    }
  }

  console.log(`\n✅ Update completed!`);
  console.log(`   Success: ${successCount} tools`);
  console.log(`   Failed: ${failCount} tools`);
}

async function main() {
  console.log('🚀 Starting tools database update...\n');

  try {
    await updateTools();
    console.log('\n🎉 Database update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

main();
