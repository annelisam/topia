import Navigation from '../../components/Navigation';
import ToolsList from './ToolsList';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#e4fe52]">
      <Navigation currentPage="resources" />
      <ToolsList />
    </div>
  );
}
