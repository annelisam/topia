export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">TOPIA</h1>
          <ul className="flex gap-8 text-sm uppercase">
            <li><a href="/" className="hover:text-white/60 transition">HOME</a></li>
            <li><a href="/about" className="hover:text-white/60 transition">ABOUT</a></li>
            <li><a href="#explore" className="hover:text-white/60 transition">EXPLORE</a></li>
            <li><a href="/resources" className="hover:text-white/60 transition">RESOURCES</a></li>
            <li><a href="#contact" className="hover:text-white/60 transition">CONTACT</a></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="mb-12">
            <div className="text-6xl md:text-8xl font-bold tracking-tight mb-6 animate-pulse">
              TOPIA IS WHAT YOU MAKE IT ~
            </div>
          </div>

          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
            Our mission is to support the future of worldbuilders, visionaries and creative ecosystems for the people.
            OPEN SOURCING RESOURCES, TOOLS, AND CONNECTION. culture before tech. depth before data.
          </p>
        </div>
      </section>

      {/* Manifesto Section */}
      <section id="manifesto" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">TOPIA Is What You Make It</h2>
              <p className="text-white/80 leading-relaxed text-lg">
                The creative world stands at a breaking point. The systems we were told to trust were built to profit
                instead of strengthening humanity. Falling apart under their own weight: extraction over expression,
                ownership over collaboration, data over depth. But creation has never belonged to those systems anyway.
                It belongs to the people.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold">TOPIA exists to build a new</h2>
              <p className="text-white/80 leading-relaxed text-lg">
                A framework where artistry, technology, and humanity move in rhythm. Where the people lead the tech.
                Where artists are the leaders they have always been. Where there is actual depth in the word 'culture.'
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold">This is about designing a new model</h2>
              <p className="text-white/80 leading-relaxed text-lg">
                A breathing network that empowers artists to create worlds, audiences to explore them, and communities
                to sustain them. This is reconstruction, the result of collapse. Through our community, tools, and network,
                we build the bridges the old world never intended to. We make space for purpose to have an address,
                for collaboration to have infrastructure, for creative intention to have a comeback.
              </p>
            </div>

            <div className="space-y-6">
              <p className="text-white/90 leading-relaxed text-xl font-bold">
                TOPIA is a protocol for world builders. A new architecture of creation. Built for and by the curious and creative.
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
