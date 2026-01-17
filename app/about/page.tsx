import Link from 'next/link';

export default function AboutPage() {
  const team = [
    {
      name: "Latashá",
      role: "Co-Founder // Chief Executive Officer",
      description: "Artist. Performer. Creative Technologist.",
    },
    {
      name: "Jahmel Reynolds",
      role: "Co-Founder // Chief Creative Officer",
      description: "Filmmaker. Worldbuilder. Creative Technologist.",
    },
    {
      name: "Jada Beasley",
      role: "Co-Founder // Chief Marketing Officer",
      description: "Strategist. Digital Architect. Creative.",
    },
    {
      name: "Annelisa Moody",
      role: "Co-Founder // Chief Product Officer",
      description: "Designer. DJ. Creative Technologist.",
    },
    {
      name: "Dae McMorris",
      role: "Project Manager",
      description: "Community-builder. Creative. Digital Culture Enthusiast.",
    },
    {
      name: "Kesaun Austin",
      role: "Business Manager",
      description: "Business Architect. Investor. Technologist.",
    },
    {
      name: "CY Lee",
      role: "Executive Producer",
      description: "Patron of Culture in Web3.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">TOPIA</Link>
          <ul className="flex gap-8 text-sm">
            <li><Link href="/" className="hover:text-white/60 transition">HOME</Link></li>
            <li><Link href="/about" className="hover:text-white/60 transition underline">ABOUT</Link></li>
            <li><Link href="/explore" className="hover:text-white/60 transition">EXPLORE</Link></li>
            <li><Link href="/resources" className="hover:text-white/60 transition">RESOURCES</Link></li>
            <li><Link href="/contact" className="hover:text-white/60 transition">CONTACT</Link></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
            ABOUT US
          </h1>
          <p className="text-xl leading-relaxed">
            ■ Our mission is to support the future of worldbuilders, visionaries and creative ecosystems for the people.
            OPEN SOURCING RESOURCES, TOOLS, AND CONNECTION. culture before tech. depth before data.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-6 text-white/90 leading-relaxed">
            <p className="text-lg">
              TOPIA is a creative empowerment engine and network, built for and by the curious and creative.
            </p>

            <p className="text-lg">
              It begins with the question, "what if the creative community built its own open source universe,
              a constellation of worlds designed for connection, collaboration, and creative sovereignty?"
            </p>

            <p className="text-lg">
              Continuing the bridge between culture and emerging creative tech, TOPIA fosters ecosystems where
              artistry, innovation, and community thrive together.
            </p>

            <p className="text-lg">
              For far too long, the tools and networks that empower artists have been scattered, gatekept or hidden.
              TOPIA unites creatives in one home, one space where we can take our first entrusted step toward sovereignty,
              and our supporters can explore and become a part of the universes we build.
            </p>

            <p className="text-lg">
              With our beginnings as a community zoom call and event, TOPIA is anchored by a creative graph and hub.
              TOPIA connects artists with patrons, collaborators, fans and communities through a suite of tools created
              by and approved by me/you/us. With TOPIA TV, audiences can watch, listen, and discover new creative worlds
              while community events tie connections to life — fluidly merging the digital and physical experience.
            </p>

            <p className="text-lg">
              Traditional systems no longer meet the needs of today's artists. TOPIA breaks, rebuilds, and restructures
              this system to create a living network designed for creators to define our own paths, power, and possibilities.
            </p>

            <p className="text-lg font-bold">
              For artists, fans, patrons, and partners, TOPIA is more than a platform, it's a movement.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold mb-12 uppercase">Our Team</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, idx) => (
              <div
                key={idx}
                className="border border-white/20 p-6 hover:border-white/40 transition"
              >
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-sm text-white/60 mb-3">{member.role}</p>
                <p className="text-sm text-white/80">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 mt-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12 mb-8">
            {/* TOPIA */}
            <div>
              <h3 className="text-2xl font-bold mb-4">TOPIA</h3>
              <p className="text-white/60 text-sm">
                Culture before tech. Depth before data.
              </p>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-sm font-bold mb-4 uppercase">CONNECT</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@topia.vision" className="hover:text-white/60 transition">
                    EMAIL: contact@topia.vision
                  </a>
                </li>
              </ul>
            </div>

            {/* Explore */}
            <div>
              <h3 className="text-sm font-bold mb-4 uppercase">EXPLORE</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white/60 transition">ABOUT</Link></li>
                <li><Link href="/tv" className="hover:text-white/60 transition">TOPIA TV</Link></li>
                <li><Link href="/events" className="hover:text-white/60 transition">EVENTS</Link></li>
                <li><Link href="/resources" className="hover:text-white/60 transition">RESOURCES</Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-white/10 text-white/40 text-sm">
            © {new Date().getFullYear()} TOPIA. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
