import Navigation from '../../components/Navigation';
import GrantsList from './GrantsList';

export default function GrantsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="resources" />
      <GrantsList />
    </div>
  );
}
