import type { Metadata } from 'next';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import { getGrantsList } from '@/lib/grants/list';
import GrantsList from './GrantsList';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Grants | TOPIA',
  description: 'Funding opportunities for artists and creators — grants, fellowships, and residencies.',
  alternates: { canonical: 'https://topia.vision/resources/grants' },
};

export default async function GrantsPage() {
  const initialGrants = await getGrantsList();

  // LoadingScreen is an opaque once-per-session overlay — content renders at
  // full opacity beneath it (no fade wrapper), so first paint isn't gated.
  return (
    <PageShell>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        <LoadingScreen />
        <GrantsList initialGrants={initialGrants} />
      </div>
    </PageShell>
  );
}
