import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { newsletterSignups, users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { name, email, roles, source } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = typeof name === 'string' && name.trim() ? name.trim() : null;
    const rolesCsv = Array.isArray(roles) && roles.length ? roles.join(',') : null;
    const cleanSource = typeof source === 'string' && source.trim() ? source.trim() : null;

    // Persist the signup + attribute it to a profile if the email matches an
    // existing user. Deduped by email — a repeat signup updates the row instead
    // of erroring. Best-effort: a DB hiccup shouldn't break the signup UX.
    try {
      const [match] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${cleanEmail}`)
        .limit(1);

      await db
        .insert(newsletterSignups)
        .values({
          email: cleanEmail,
          name: cleanName,
          source: cleanSource,
          roles: rolesCsv,
          userId: match?.id ?? null,
        })
        .onConflictDoUpdate({
          target: newsletterSignups.email,
          set: {
            // keep prior values when the new payload omits them
            name: sql`coalesce(excluded.name, ${newsletterSignups.name})`,
            source: sql`coalesce(excluded.source, ${newsletterSignups.source})`,
            roles: sql`coalesce(excluded.roles, ${newsletterSignups.roles})`,
            userId: sql`coalesce(excluded.user_id, ${newsletterSignups.userId})`,
            updatedAt: new Date(),
          },
        });
    } catch (dbErr) {
      console.error('[waitlist] persist failed:', dbErr);
    }

    // TODO: Wire up Mailchimp integration here
    // Example:
    // const res = await fetch(`https://${DC}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `apikey ${MAILCHIMP_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email_address: email,
    //     status: 'subscribed',
    //     merge_fields: { FNAME: name, ROLE: (roles || []).join(', ') },
    //   }),
    // });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
