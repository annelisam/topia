import Navigation from '../../components/Navigation';
import ToolsList from './ToolsList';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#c8e055]">
      <Navigation currentPage="resources" />
      <ToolsList />
    </div>
  );
}
