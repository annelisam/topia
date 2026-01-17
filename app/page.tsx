export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">TOPIA</h1>
          <ul className="flex gap-8 text-sm">
            <li><a href="#explore" className="hover:text-white/60 transition">EXPLORE</a></li>
            <li><a href="#resources" className="hover:text-white/60 transition">RESOURCES</a></li>
            <li><a href="#about" className="hover:text-white/60 transition">ABOUT</a></li>
            <li><a href="#contact" className="hover:text-white/60 transition">CONTACT</a></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-12">
            <div className="text-6xl md:text-8xl font-bold tracking-tight mb-6 animate-pulse">
              TOPIA IS WHAT YOU MAKE IT
            </div>
          </div>

          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            A breathing network for artists, audiences, and communities to create, explore, and sustain collaborative worlds.
          </p>
        </div>
      </section>

      {/* Manifesto Section */}
      <section id="about" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Culture Before Tech</h2>
              <p className="text-white/80 leading-relaxed">
                We reject extractive systems in favor of collaborative, artist-led models.
                TOPIA is a platform for creative reconstruction where the people lead the tech
                and artists serve as leaders.
              </p>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Depth Before Data</h2>
              <p className="text-white/80 leading-relaxed">
                Building a new creative infrastructure that prioritizes meaningful connections
                and sustainable collaboration over profit-driven extraction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold mb-12">Explore</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="border border-white/20 p-6 hover:border-white/40 transition">
              <h3 className="text-xl font-bold mb-2">TOPIA TV</h3>
              <p className="text-white/60 text-sm">Artist content and stories</p>
            </div>
            <div className="border border-white/20 p-6 hover:border-white/40 transition">
              <h3 className="text-xl font-bold mb-2">Worlds</h3>
              <p className="text-white/60 text-sm">Creative spaces and projects</p>
            </div>
            <div className="border border-white/20 p-6 hover:border-white/40 transition">
              <h3 className="text-xl font-bold mb-2">Catalysts</h3>
              <p className="text-white/60 text-sm">People in the network</p>
            </div>
            <div className="border border-white/20 p-6 hover:border-white/40 transition">
              <h3 className="text-xl font-bold mb-2">Events</h3>
              <p className="text-white/60 text-sm">Upcoming gatherings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold mb-12">Resources</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <a href="/resources/tools" className="border border-white/20 p-6 hover:border-white/40 transition group">
              <h3 className="text-xl font-bold mb-2 group-hover:underline">Tools & Database</h3>
              <p className="text-white/60 text-sm">70+ curated tools for creators</p>
            </a>
            <a href="/resources/grants" className="border border-white/20 p-6 hover:border-white/40 transition group">
              <h3 className="text-xl font-bold mb-2 group-hover:underline">Grants</h3>
              <p className="text-white/60 text-sm">67 funding opportunities</p>
            </a>
            <div className="border border-white/20 p-6 opacity-50">
              <h3 className="text-xl font-bold mb-2">Knowledge Base</h3>
              <p className="text-white/60 text-sm">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-6 border-t border-white/10 mt-20">
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
