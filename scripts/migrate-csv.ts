import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db, events, grants, tools } from '../lib/db';

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

async function migrateEvents() {
  console.log('📅 Migrating events...');

  const eventsData = parseCSV('/Users/annelisamoody/Downloads/[MASTER] events_db - Sheet1.csv');

  for (const row of eventsData) {
    try {
      await db.insert(events).values({
        eventName: row.event_name,
        slug: createSlug(row.event_name),
        date: row.date || null,
        startTime: row.start_time || null,
        city: row.city || null,
        link: row.link || null,
        imageUrl: row.img_url || null,
        published: true,
      });
      console.log(`  ✓ ${row.event_name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert event: ${row.event_name}`, error);
    }
  }

  console.log(`✅ Imported ${eventsData.length} events\n`);
}

async function migrateGrants() {
  console.log('💰 Migrating grants...');

  const grantsData = parseCSV('/Users/annelisamoody/Downloads/[MASTER] grants_db - Sheet1.csv');

  for (const row of grantsData) {
    try {
      await db.insert(grants).values({
        grantName: row.grant_name,
        slug: createSlug(row.grant_name),
        shortDescription: row.short_description || null,
        amountMin: row.amount_min ? parseInt(row.amount_min) : null,
        amountMax: row.amount_max ? parseInt(row.amount_max) : null,
        currency: row.currency || 'USD',
        tags: row.tags || null,
        eligibility: row.eligibility || null,
        deadlineType: row.deadline_type || null,
        deadlineDate: row.deadline_date || null,
        link: row.link || null,
        region: row.region || null,
        category: row.category || null,
        frequency: row.frequency || null,
        orgName: row.org_name || null,
        status: row.status || null,
        notes: row.notes || null,
        source: row.source || null,
        published: true,
      });
      console.log(`  ✓ ${row.grant_name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert grant: ${row.grant_name}`, error);
    }
  }

  console.log(`✅ Imported ${grantsData.length} grants\n`);
}

async function migrateTools() {
  console.log('🛠️  Migrating tools...');

  const toolsData = parseCSV('/Users/annelisamoody/Downloads/[MASTER] tools_full_db - tools_full_db.csv');

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
    } catch (error) {
      console.error(`  ✗ Failed to insert tool: ${row.Name}`, error);
    }
  }

  console.log(`✅ Imported ${toolsData.length} tools\n`);
}

async function main() {
  console.log('🚀 Starting CSV migration to Vercel Postgres...\n');

  try {
    await migrateEvents();
    await migrateGrants();
    await migrateTools();

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
