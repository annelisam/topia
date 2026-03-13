import { config } from 'dotenv';
config({ path: '.env.local' });

import { db, events } from '../lib/db';
import { eq } from 'drizzle-orm';

const monthMap: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseToIso(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = monthMap[match[2]];
  const year = match[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

async function main() {
  const allEvents = await db.select({ id: events.id, date: events.date, dateIso: events.dateIso }).from(events);
  let updated = 0;
  let skipped = 0;

  for (const event of allEvents) {
    if (event.dateIso) { skipped++; continue; }
    if (!event.date) { skipped++; continue; }

    const iso = parseToIso(event.date);
    if (!iso) { console.log(`Could not parse: "${event.date}" (id: ${event.id})`); skipped++; continue; }

    await db.update(events).set({ dateIso: iso }).where(eq(events.id, event.id));
    updated++;
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
