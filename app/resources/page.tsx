import Link from 'next/link';

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">TOPIA</Link>
          <ul className="flex gap-8 text-sm">
            <li><Link href="/" className="hover:text-white/60 transition">HOME</Link></li>
            <li><Link href="#about" className="hover:text-white/60 transition">ABOUT</Link></li>
            <li><Link href="#explore" className="hover:text-white/60 transition">EXPLORE</Link></li>
            <li><Link href="/resources" className="hover:text-white/60 transition underline">RESOURCES</Link></li>
            <li><Link href="#contact" className="hover:text-white/60 transition">CONTACT</Link></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
            RESOURCES
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Tools, grants, and knowledge to support your creative practice.
          </p>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Tools */}
            <Link href="/resources/tools" className="border border-white/20 p-8 hover:border-white/40 transition group">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold">TOOLS</h2>
                <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
              </div>
              <p className="text-white/60 mb-4">
                Curated database of software, platforms, and resources for creators.
              </p>
              <p className="text-sm text-white/40">70+ tools</p>
            </Link>

            {/* Grants */}
            <Link href="/resources/grants" className="border border-white/20 p-8 hover:border-white/40 transition group">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold">GRANTS</h2>
                <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
              </div>
              <p className="text-white/60 mb-4">
                Funding opportunities, residencies, and fellowships for artists.
              </p>
              <p className="text-sm text-white/40">67 grants</p>
            </Link>

            {/* Knowledge Base - Coming Soon */}
            <div className="border border-white/20 p-8 opacity-50">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold">KNOWLEDGE</h2>
                <span className="text-2xl">→</span>
              </div>
              <p className="text-white/60 mb-4">
                Guides, articles, and insights from the TOPIA community.
              </p>
              <p className="text-sm text-white/40">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Building a Creative Infrastructure</h2>
          <p className="text-white/80 leading-relaxed max-w-2xl mx-auto">
            These resources are carefully curated to support artists, creators, and cultural workers
            in sustaining their practice. We believe in depth before data, culture before tech.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold">TOPIA</div>
            <div className="flex gap-6 text-sm">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition">Instagram</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition">LinkedIn</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition">Twitter</a>
            </div>
          </div>
          <div className="text-center mt-8 text-white/40 text-sm">
            © {new Date().getFullYear()} TOPIA. Culture before tech. Depth before data.
          </div>
        </div>
      </footer>
    </div>
  );
}
