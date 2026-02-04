import { db, creators, worlds } from '../lib/db';

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const creatorsData = [
  { name: 'LATASHÁ', slug: 'latasha', country: 'US', websiteUrl: null, description: 'Music, immersion and creative evolution.' },
  { name: 'JAH', slug: 'jah', country: 'US', websiteUrl: null, description: 'Transmedia universe builder.' },
  { name: 'TK and Claire Mirran', slug: 'tk-and-claire-mirran', country: 'US', websiteUrl: null, description: 'Sci-fi fantasy world creators.' },
  { name: 'Forrest Mortifee', slug: 'forrest-mortifee', country: 'US', websiteUrl: null, description: 'Storyteller and visionary thinker.' },
  { name: 'Crux and Stonez', slug: 'crux-and-stonez', country: 'US', websiteUrl: null, description: 'Creative wellness producers.' },
  { name: 'Sierra Imari', slug: 'sierra-imari', country: 'US', websiteUrl: null, description: 'Game designer and artist.' },
  { name: 'Isaiah Sturge', slug: 'isaiah-sturge', country: 'US', websiteUrl: null, description: 'Production studio for games, animations, and film.' },
  { name: 'The Park', slug: 'the-park', country: 'US', websiteUrl: null, description: 'Community gathering space.' },
  { name: 'Black Dave', slug: 'black-dave', country: 'US', websiteUrl: null, description: 'Universe builder and thought collector.' },
  { name: 'Sound of Fractures', slug: 'sound-of-fractures', country: 'US', websiteUrl: null, description: 'Artist-owned music collective.' },
  { name: 'Lafayette Stokley', slug: 'lafayette-stokley', country: 'US', websiteUrl: null, description: 'Community hub builder for independent artists.' },
  // From screenshot
  { name: 'Studio Kryss', slug: 'studio-kryss', country: 'SE', websiteUrl: 'instagram.com/studio.kryss', description: 'Swedish art studio.' },
  { name: 'Paul Matteo Wesser', slug: 'paul-matteo-wesser', country: 'DE', websiteUrl: 'paulmatteowesser.com', description: 'German-based designer and sculptor.' },
  { name: 'Jiyong Lee', slug: 'jiyong-lee', country: 'US', websiteUrl: 'jiyonglee.com', description: 'Artist and ceramicist.' },
  { name: 'Rein Reitsma', slug: 'rein-reitsma', country: 'NL', websiteUrl: 'reinreitsma.nl', description: 'Dutch artist and designer.' },
  { name: 'Soft Baroque', slug: 'soft-baroque', country: 'GB', websiteUrl: 'softbaroque.com', description: 'Design studio blending classical and digital aesthetics.' },
  { name: 'Lily Clark', slug: 'lily-clark', country: 'US', websiteUrl: 'lily-clark.com', description: 'Artist and sculptor.' },
];

const worldsData = [
  {
    title: 'TASH55',
    slug: 'tash55',
    creatorSlug: 'latasha',
    category: 'Music',
    country: 'US',
    description: 'A living creative studio where music, immersion and evolution blur into one ongoing odyssey of self actualization.',
    tools: 'In Process, Adobe Photoshop, Adobe Premiere, Ableton Live, Splice, Higgsfield AI',
    collaborators: 'Cy Lee, Jahmel Reynolds',
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'HLMT CTY',
    slug: 'hlmt-cty',
    creatorSlug: 'jah',
    category: 'Film',
    country: 'US',
    description: 'A transmedia universe that explores the culture and identity of a futuristic metropolis rebuilt after a catastrophic outbreak.',
    tools: 'In Process, Adobe Suite, Higgsfield AI, Midjourney, Runway, Nano Banana',
    collaborators: 'Cy Lee, Jahmel Reynolds, Segnon Tiewul, Latashá',
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'ETERNAL GARDENS',
    slug: 'eternal-gardens',
    creatorSlug: 'tk-and-claire-mirran',
    category: 'Film',
    country: 'US',
    description: 'A sci-fi fantasy epic about a mystical seed with the power to spawn infinite worlds.',
    tools: 'In Process, Adobe Suite, Unreal Engine',
    collaborators: 'Cy Lee',
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'UTOPIAN FUTURIST',
    slug: 'utopian-futurist',
    creatorSlug: 'forrest-mortifee',
    category: 'Writing',
    country: 'US',
    description: 'Exploring the intersection of art, identity, and time. Personal storytelling with visionary thinking to reimagine humanity\'s collective evolution.',
    tools: 'Substack',
    collaborators: 'Cy Lee, Yuri Rybak',
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'FORBIDDEN FRUIT',
    slug: 'forbidden-fruit',
    creatorSlug: 'crux-and-stonez',
    category: 'Wellness',
    country: 'US',
    description: 'Creative wellness hub producing immersive experiences for art lovers.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'ZODIAC GAMES',
    slug: 'zodiac-games',
    creatorSlug: 'sierra-imari',
    category: 'Games',
    country: 'US',
    description: 'Your sign is showing.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'DACIRKUS',
    slug: 'dacirkus',
    creatorSlug: 'isaiah-sturge',
    category: 'Film',
    country: 'US',
    description: 'Where analog soul meets digital vision. Production studio for games, animations, and film.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'FRIDAYS AT THE PARK',
    slug: 'fridays-at-the-park',
    creatorSlug: 'the-park',
    category: 'Community',
    country: 'US',
    description: 'If you know you know.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'YARDS',
    slug: 'yards',
    creatorSlug: 'black-dave',
    category: 'Writing',
    country: 'US',
    description: 'A collection of thoughts building a universe.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'SCENES',
    slug: 'scenes',
    creatorSlug: 'sound-of-fractures',
    category: 'Music',
    country: 'US',
    description: 'An experiment in what music can be beyond streams—artist-owned, participatory, and built on real connection.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'NETWORK ARCHIVES',
    slug: 'network-archives',
    creatorSlug: 'sound-of-fractures',
    category: 'Music',
    country: 'US',
    description: 'A label dedicated to documenting and exploring the hidden threads that shape new cultural movements.',
    tools: null,
    collaborators: 'Cy Lee, Jade',
    dateAdded: 'Dec 13, 2025',
  },
  {
    title: 'SUCH IS LIFE UNIVERSITY',
    slug: 'such-is-life',
    creatorSlug: 'lafayette-stokley',
    category: 'Community',
    country: 'US',
    description: 'An all-encompassing hub for independent artists to connect, collaborate, create, and build community.',
    tools: null,
    collaborators: null,
    dateAdded: 'Oct 16, 2025',
  },
  // From screenshot
  {
    title: 'Studio Kryss',
    slug: 'studio-kryss',
    creatorSlug: 'studio-kryss',
    category: 'Art',
    country: 'SE',
    description: 'An immersive art installation exploring texture, form, and the boundaries between digital and physical space.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'Paul Matteo Wesser',
    slug: 'paul-matteo-wesser',
    creatorSlug: 'paul-matteo-wesser',
    category: 'Art',
    country: 'DE',
    description: 'Sculptural furniture and design objects that merge raw materiality with functional elegance.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'Jiyong Lee',
    slug: 'jiyong-lee',
    creatorSlug: 'jiyong-lee',
    category: 'Art',
    country: 'US',
    description: 'Ceramic and mixed-media works exploring color, light, and optical perception.',
    tools: null,
    collaborators: null,
    dateAdded: 'Feb 01, 2026',
  },
  {
    title: 'Rein Reitsma',
    slug: 'rein-reitsma',
    creatorSlug: 'rein-reitsma',
    category: 'Art',
    country: 'NL',
    description: 'Textile and rope-based sculptural works that play with tension, color, and organic form.',
    tools: null,
    collaborators: null,
    dateAdded: 'Dec 13, 2025',
  },
  {
    title: 'Soft Baroque',
    slug: 'soft-baroque',
    creatorSlug: 'soft-baroque',
    category: 'Art',
    country: 'GB',
    description: 'Digital sculptures and furniture designs that reinterpret classical baroque forms through a contemporary lens.',
    tools: null,
    collaborators: null,
    dateAdded: 'Dec 13, 2025',
  },
  {
    title: 'Lily Clark',
    slug: 'lily-clark',
    creatorSlug: 'lily-clark',
    category: 'Art',
    country: 'US',
    description: 'Ceramic planters and sculptural vessels shaped by landscape, geology, and natural ritual.',
    tools: null,
    collaborators: null,
    dateAdded: 'Oct 16, 2025',
  },
];

async function main() {
  console.log('🌍 Seeding creators and worlds...\n');

  // Insert creators and collect their IDs
  const creatorIdMap = new Map<string, string>();

  for (const creator of creatorsData) {
    try {
      const result = await db.insert(creators).values({
        name: creator.name,
        slug: creator.slug,
        description: creator.description,
        websiteUrl: creator.websiteUrl,
        country: creator.country,
        published: true,
      }).returning({ id: creators.id });

      creatorIdMap.set(creator.slug, result[0].id);
      console.log(`  ✓ Creator: ${creator.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert creator: ${creator.name}`, error);
    }
  }

  console.log(`\n✅ Inserted ${creatorIdMap.size} creators\n`);

  // Insert worlds
  let worldCount = 0;
  for (const world of worldsData) {
    try {
      const creatorId = creatorIdMap.get(world.creatorSlug);
      if (!creatorId) {
        console.error(`  ✗ No creator found for slug: ${world.creatorSlug}`);
        continue;
      }

      await db.insert(worlds).values({
        title: world.title,
        slug: world.slug,
        description: world.description,
        creatorId: creatorId,
        category: world.category,
        country: world.country,
        tools: world.tools,
        collaborators: world.collaborators,
        dateAdded: world.dateAdded,
        published: true,
      });

      worldCount++;
      console.log(`  ✓ World: ${world.title}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert world: ${world.title}`, error);
    }
  }

  console.log(`\n✅ Inserted ${worldCount} worlds`);
  console.log('🎉 Seed complete!\n');
  process.exit(0);
}

main();
