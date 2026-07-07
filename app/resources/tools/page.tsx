import type { Metadata } from 'next';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import { getToolsList } from '@/lib/tools/list';
import ToolsList from './ToolsList';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tools | TOPIA',
  description: 'Software, hardware, platforms — what creators use to build worlds.',
  alternates: { canonical: 'https://topia.vision/resources/tools' },
};

export default async function ToolsPage() {
  const initialTools = await getToolsList();

  // LoadingScreen is an opaque once-per-session overlay — content renders at
  // full opacity beneath it (no fade wrapper), so first paint isn't gated.
  return (
    <PageShell>
      <LoadingScreen />
      <ToolsList initialTools={initialTools.map((t) => ({ ...t, featured: t.featured ?? false }))} />
    </PageShell>
  );
}
