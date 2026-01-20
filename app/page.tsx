import Navigation from './components/Navigation';
import DraggableManifesto from './components/DraggableManifesto';

export default function Home() {
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <Navigation currentPage="home" />

      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight mb-8 sm:mb-12 leading-tight text-off-white" style={{ fontFamily: "'pf-pixelscript', sans-serif" }}>
            Topia is what you make it
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-off-white/80 max-w-3xl leading-relaxed">
            Our mission is to support the future of worldbuilders, visionaries and creative ecosystems for the people. Open sourcing resources, tools, and connection.
          </p>

          <p className="text-base sm:text-lg text-off-white/60 mt-6 italic">
            culture before tech. depth before data.
          </p>
        </div>
      </section>

      {/* Manifesto Section */}
      <DraggableManifesto />

      {/* Explore Section */}
      <section id="explore" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 sm:mb-16 text-off-white">Explore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white">TOPIA TV</h3>
              <p className="text-off-white/60 text-sm sm:text-base">Artist content and stories</p>
            </div>
            <div className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white">Worlds</h3>
              <p className="text-off-white/60 text-sm sm:text-base">Creative spaces and projects</p>
            </div>
            <div className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white">Catalysts</h3>
              <p className="text-off-white/60 text-sm sm:text-base">People in the network</p>
            </div>
            <div className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white">Events</h3>
              <p className="text-off-white/60 text-sm sm:text-base">Upcoming gatherings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 sm:mb-16 text-off-white">Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <a href="/resources/tools" className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition group">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white group-hover:underline">Tools & Database</h3>
              <p className="text-off-white/60 text-sm sm:text-base">70+ curated tools for creators</p>
            </a>
            <a href="/resources/grants" className="border border-white/20 p-6 sm:p-8 hover:border-white/40 transition group">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white group-hover:underline">Grants</h3>
              <p className="text-off-white/60 text-sm sm:text-base">67 funding opportunities</p>
            </a>
            <div className="border border-white/10 p-6 sm:p-8 opacity-50">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-off-white/50">Knowledge Base</h3>
              <p className="text-off-white/40 text-sm sm:text-base">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/10 mt-16 sm:mt-24">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
            <div className="text-2xl sm:text-3xl font-bold text-off-white">TOPIA</div>
            <div className="flex gap-6 sm:gap-8 text-sm">
              <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="text-off-white/60 hover:text-off-white transition">Instagram</a>
              <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="text-off-white/60 hover:text-off-white transition">Twitter</a>
              <a href="mailto:contact@topia.vision" className="text-off-white/60 hover:text-off-white transition">Email</a>
            </div>
          </div>
          <div className="text-center mt-8 sm:mt-10 text-off-white/40 text-xs sm:text-sm">
            © {new Date().getFullYear()} TOPIA. Culture before tech. Depth before data.
          </div>
        </div>
      </footer>
    </div>
  );
}
