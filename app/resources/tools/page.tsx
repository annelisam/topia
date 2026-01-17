import Link from 'next/link';
import ToolsList from './ToolsList';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#c8e055]">
      {/* Header */}
      <header className="border-b border-black">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">TOPIA</Link>
          <ul className="flex gap-8 text-sm uppercase">
            <li><Link href="/" className="hover:opacity-60 transition">HOME</Link></li>
            <li><Link href="/about" className="hover:opacity-60 transition">ABOUT</Link></li>
            <li><Link href="/explore" className="hover:opacity-60 transition">EXPLORE</Link></li>
            <li><Link href="/resources" className="hover:opacity-60 transition underline">RESOURCES</Link></li>
            <li><Link href="/contact" className="hover:opacity-60 transition">CONTACT</Link></li>
          </ul>
        </nav>
      </header>

      <ToolsList />
    </div>
  );
}
