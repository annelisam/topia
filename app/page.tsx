import Navigation from './components/Navigation';

export default function Home() {
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <Navigation currentPage="home" />

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="mb-8 sm:mb-12">
            <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
              <span className="text-yellow">TOPIA</span> <span className="text-green">IS WHAT</span> <span className="text-pink">YOU MAKE</span> <span className="text-blue">IT</span> <span className="text-orange">~</span>
            </div>
          </div>

          <p className="text-base sm:text-xl md:text-2xl text-off-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
            Our mission is to support the future of worldbuilders, visionaries and creative ecosystems for the people.
            <span className="text-green font-bold"> OPEN SOURCING RESOURCES, TOOLS, AND CONNECTION.</span> <span className="text-yellow">culture before tech. depth before data.</span>
          </p>
        </div>
      </section>

      {/* Manifesto Section */}
      <section id="manifesto" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8 sm:space-y-12">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold">TOPIA Is What You Make It</h2>
              <p className="text-white/80 leading-relaxed text-base sm:text-lg">
                The creative world stands at a breaking point. The systems we were told to trust were built to profit
                instead of strengthening humanity. Falling apart under their own weight: extraction over expression,
                ownership over collaboration, data over depth. But creation has never belonged to those systems anyway.
                It belongs to the people.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold">TOPIA exists to build a new</h2>
              <p className="text-white/80 leading-relaxed text-base sm:text-lg">
                A framework where artistry, technology, and humanity move in rhythm. Where the people lead the tech.
                Where artists are the leaders they have always been. Where there is actual depth in the word 'culture.'
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold">This is about designing a new model</h2>
              <p className="text-white/80 leading-relaxed text-base sm:text-lg">
                A breathing network that empowers artists to create worlds, audiences to explore them, and communities
                to sustain them. This is reconstruction, the result of collapse. Through our community, tools, and network,
                we build the bridges the old world never intended to. We make space for purpose to have an address,
                for collaboration to have infrastructure, for creative intention to have a comeback.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <p className="text-white/90 leading-relaxed text-lg sm:text-xl font-bold">
                TOPIA is a protocol for world builders. A new architecture of creation. Built for and by the curious and creative.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-yellow/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-yellow">Explore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="border-l-4 border-orange bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 transition">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-orange">TOPIA TV</h3>
              <p className="text-off-white/60 text-sm">Artist content and stories</p>
            </div>
            <div className="border-l-4 border-blue bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 transition">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-blue">Worlds</h3>
              <p className="text-off-white/60 text-sm">Creative spaces and projects</p>
            </div>
            <div className="border-l-4 border-green bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 transition">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-green">Catalysts</h3>
              <p className="text-off-white/60 text-sm">People in the network</p>
            </div>
            <div className="border-l-4 border-pink bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 transition">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-pink">Events</h3>
              <p className="text-off-white/60 text-sm">Upcoming gatherings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-green/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-green">Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <a href="/resources/tools" className="border-l-4 border-blue bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 hover:border-blue/80 transition group">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-blue group-hover:underline">Tools & Database</h3>
              <p className="text-off-white/60 text-sm">70+ curated tools for creators</p>
            </a>
            <a href="/resources/grants" className="border-l-4 border-green bg-near-black/50 p-5 sm:p-6 hover:bg-near-black/80 hover:border-green/80 transition group">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-green group-hover:underline">Grants</h3>
              <p className="text-off-white/60 text-sm">67 funding opportunities</p>
            </a>
            <div className="border-l-4 border-off-white/20 bg-near-black/30 p-5 sm:p-6 opacity-50">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-off-white/50">Knowledge Base</h3>
              <p className="text-off-white/40 text-sm">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-8 sm:py-12 px-4 sm:px-6 border-t border-pink/20 mt-12 sm:mt-20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow">TOPIA</div>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
              <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="text-pink hover:text-pink/60 transition">Instagram</a>
              <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="text-blue hover:text-blue/60 transition">Twitter</a>
              <a href="mailto:contact@topia.vision" className="text-green hover:text-green/60 transition">Email</a>
            </div>
          </div>
          <div className="text-center mt-6 sm:mt-8 text-off-white/40 text-xs sm:text-sm">
            © {new Date().getFullYear()} TOPIA. <span className="text-yellow">Culture before tech.</span> <span className="text-green">Depth before data.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
