'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import LoadingScreen from '../components/LoadingScreen';

export default function AboutPage() {
  const [isLoaded, setIsLoaded] = useState(false);
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
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation currentPage="about" />

      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {/* Hero Section */}
        <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6 sm:mb-8 uppercase" style={{ color: '#1a1a1a' }}>
              ABOUT US
            </h1>
            <p className="font-mono text-[11px] leading-relaxed" style={{ color: '#1a1a1a' }}>
              ■ Our mission is to support the future of worldbuilders, visionaries and creative ecosystems for the people.
              OPEN SOURCING RESOURCES, TOOLS, AND CONNECTION. culture before tech. depth before data.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8 sm:py-12 px-4 sm:px-6 border-t" style={{ borderColor: '#1a1a1a' }}>
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-4 sm:space-y-6 font-mono text-[11px] leading-relaxed" style={{ color: '#1a1a1a' }}>
              <p>
                TOPIA is a creative empowerment engine and network, built for and by the curious and creative.
              </p>

              <p>
                It begins with the question, "what if the creative community built its own open source universe,
                a constellation of worlds designed for connection, collaboration, and creative sovereignty?"
              </p>

              <p>
                Continuing the bridge between culture and emerging creative tech, TOPIA fosters ecosystems where
                artistry, innovation, and community thrive together.
              </p>

              <p>
                For far too long, the tools and networks that empower artists have been scattered, gatekept or hidden.
                TOPIA unites creatives in one home, one space where we can take our first entrusted step toward sovereignty,
                and our supporters can explore and become a part of the universes we build.
              </p>

              <p>
                With our beginnings as a community zoom call and event, TOPIA is anchored by a creative graph and hub.
                TOPIA connects artists with patrons, collaborators, fans and communities through a suite of tools created
                by and approved by me/you/us. With TOPIA TV, audiences can watch, listen, and discover new creative worlds
                while community events tie connections to life — fluidly merging the digital and physical experience.
              </p>

              <p>
                Traditional systems no longer meet the needs of today's artists. TOPIA breaks, rebuilds, and restructures
                this system to create a living network designed for creators to define our own paths, power, and possibilities.
              </p>

              <p className="font-bold">
                For artists, fans, patrons, and partners, TOPIA is more than a platform, it's a movement.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 border-t" style={{ borderColor: '#1a1a1a' }}>
          <div className="container mx-auto max-w-6xl">
            <h2 className="font-mono text-base sm:text-lg font-bold mb-8 sm:mb-12 uppercase" style={{ color: '#1a1a1a' }}>Our Team</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {team.map((member, idx) => (
                <div
                  key={idx}
                  className="border p-5 sm:p-6 hover:opacity-70 transition"
                  style={{ borderColor: '#1a1a1a', backgroundColor: '#f5f0e8' }}
                >
                  <h3 className="font-mono text-[11px] font-bold mb-2 uppercase" style={{ color: '#1a1a1a' }}>{member.name}</h3>
                  <p className="font-mono text-[11px] mb-3" style={{ color: '#1a1a1a', opacity: 0.6 }}>{member.role}</p>
                  <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{member.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t mt-12 sm:mt-20" style={{ borderColor: '#1a1a1a' }}>
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 mb-6 sm:mb-8">
              {/* TOPIA */}
              <div>
                <h3 className="font-mono text-base sm:text-lg font-bold mb-3 sm:mb-4 uppercase" style={{ color: '#1a1a1a' }}>TOPIA</h3>
                <p className="font-mono text-[11px]" style={{ color: '#1a1a1a', opacity: 0.6 }}>
                  Culture before tech. Depth before data.
                </p>
              </div>

              {/* Connect */}
              <div>
                <h3 className="font-mono text-[11px] font-bold mb-3 sm:mb-4 uppercase" style={{ color: '#1a1a1a' }}>CONNECT</h3>
                <ul className="space-y-2 font-mono text-[11px]">
                  <li>
                    <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href="mailto:contact@topia.vision" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>
                      Email
                    </a>
                  </li>
                </ul>
              </div>

              {/* Explore */}
              <div>
                <h3 className="font-mono text-[11px] font-bold mb-3 sm:mb-4 uppercase" style={{ color: '#1a1a1a' }}>EXPLORE</h3>
                <ul className="space-y-2 font-mono text-[11px]">
                  <li><Link href="/about" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>ABOUT</Link></li>
                  <li><Link href="/worlds" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>WORLDS</Link></li>
                  <li><Link href="/resources/grants" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>GRANTS</Link></li>
                  <li><Link href="/resources/tools" className="hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>TOOLS</Link></li>
                </ul>
              </div>
            </div>

            <div className="text-center pt-6 sm:pt-8 border-t font-mono text-[11px]" style={{ borderColor: '#1a1a1a', color: '#1a1a1a', opacity: 0.4 }}>
              © {new Date().getFullYear()} TOPIA. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
