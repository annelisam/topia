'use client';

import { useState, useCallback } from 'react';
import PageShell from '../components/PageShell';
import GlitchType from '../components/ui/GlitchType';

export default function ContactPage() {
  const [showLinks, setShowLinks] = useState(false);

  const handleDone = useCallback(() => {
    setTimeout(() => setShowLinks(true), 400);
  }, []);

  return (
    <PageShell>
      <section className="min-h-screen px-4 md:px-6 py-4 md:py-6" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="max-w-5xl mx-auto min-h-[600px] md:h-[calc(100vh-var(--nav-height,80px)-48px)]">
          <div className="h-full grid grid-rows-[auto_1fr] grid-cols-1 md:grid-cols-[1fr_1fr] gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden">

            {/* Header — accent block left, dark metadata right */}
            <div
              className="p-5 md:p-6 flex flex-col justify-between transition-colors duration-300"
              style={{ backgroundColor: 'var(--accent, #e4fe52)' }}
            >
              <span
                className="font-mono text-[7px] uppercase tracking-[2px] opacity-50"
                style={{ color: 'var(--accent-text, #1a1a1a)' }}
              >
                contact // connect
              </span>
              <h1
                className="font-basement font-black text-[clamp(32px,5vw,64px)] leading-[0.85] uppercase mt-2"
                style={{ color: 'var(--accent-text, #1a1a1a)' }}
              >
                CONNECT.
              </h1>
            </div>
            <div className="bg-obsidian border-l border-bone/[0.04] p-4 flex flex-col justify-end">
              <span className="font-mono text-[8px] text-bone">
                we&apos;re here. let&apos;s talk.
              </span>
              <span className="font-mono text-[7px] text-bone mt-2">
                culture before tech. depth before data.
              </span>
            </div>

            {/* Left — animated hero text */}
            <div className="bg-obsidian p-8 md:p-12 flex flex-col justify-center relative">
              {/* Crosshatch */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)',
                }}
              />
              <div className="relative z-10">
                <div className="font-mono text-[clamp(28px,5vw,56px)] leading-[1.4] text-bone">
                  <GlitchType text="reach out." onComplete={handleDone} speed={80} />
                </div>
                <p className="font-mono text-[11px] text-bone mt-6 max-w-sm leading-relaxed">
                  whether you&apos;re building a world, looking for collaborators, or just
                  want to connect — we&apos;re listening.
                </p>
              </div>
            </div>

            {/* Right — contact links */}
            <div className="bg-obsidian border-l border-bone/[0.04] p-6 md:p-8 flex flex-col justify-center">
              <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone block mb-6">
                channels
              </span>
              <div
                className={`space-y-4 transition-all duration-700 ${
                  showLinks ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <a
                  href="mailto:hello@topia.vision"
                  className="block px-5 py-4 border border-bone/[0.06] hover:border-lime hover:bg-lime/5 transition-all duration-300 group no-underline rounded-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] text-bone group-hover:text-lime transition-colors">
                      hello@topia.vision
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-bone">
                      email
                    </span>
                  </div>
                </a>
                <a
                  href="https://instagram.com/topia.vision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-4 border border-bone/[0.06] hover:border-pink hover:bg-pink/5 transition-all duration-300 group no-underline rounded-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] text-bone group-hover:text-pink transition-colors">
                      @topia.vision
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-bone">
                      instagram
                    </span>
                  </div>
                </a>
                <a
                  href="https://twitter.com/TopiaTV"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-4 border border-bone/[0.06] hover:border-blue hover:bg-blue/5 transition-all duration-300 group no-underline rounded-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] text-bone group-hover:text-blue transition-colors">
                      @TopiaTV
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-bone">
                      twitter
                    </span>
                  </div>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PageShell>
  );
}
