'use client';

import { useState, useCallback } from 'react';
import PageShell from '../components/PageShell';

const CATEGORIES = ['All', 'Featured', 'Live', 'Series', 'Replays'];
const CAT_COLOR: Record<string, { dot: string; text: string; bg: string; textOn: string; border: string }> = {
  Featured: { dot: 'bg-lime',   text: 'text-lime',   bg: 'bg-lime',   textOn: 'text-obsidian', border: 'border-l-lime' },
  Live:     { dot: 'bg-pink',   text: 'text-pink',   bg: 'bg-pink',   textOn: 'text-bone',     border: 'border-l-pink' },
  Series:   { dot: 'bg-blue',   text: 'text-blue',   bg: 'bg-blue',   textOn: 'text-bone',     border: 'border-l-blue' },
  Replays:  { dot: 'bg-orange', text: 'text-orange', bg: 'bg-orange', textOn: 'text-bone',     border: 'border-l-orange' },
};

const TIME_SLOTS = ['8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'];

// Placeholder content — wire to real data later
const tvContent = [
  { title: 'Building Worlds: A Documentary',   category: 'Featured', duration: '42:00',   thumbnail: '/gif/spiral.gif' },
  { title: 'DACIRKUS Live at Topia',           category: 'Live',     duration: '1:24:00', thumbnail: '/gif/surreal.gif' },
  { title: 'Tash55: Sonic Landscapes',         category: 'Series',   duration: '28:00',   thumbnail: '/gif/Topian-Gif.gif' },
  { title: 'The Creator Economy Explained',    category: 'Featured', duration: '18:00',   thumbnail: '/gif/spiral.gif' },
  { title: 'Fridays at the Park: Episode 12',  category: 'Replays',  duration: '55:00',   thumbnail: '/gif/surreal.gif' },
  { title: 'How to Build Your First World',    category: 'Series',   duration: '15:00',   thumbnail: '/gif/Topian-Gif.gif' },
  { title: 'Utopian Futures: Live Panel',      category: 'Replays',  duration: '1:05:00', thumbnail: '/gif/spiral.gif' },
  { title: 'HLMT CTY: Behind the Drop',        category: 'Featured', duration: '22:00',   thumbnail: '/gif/surreal.gif' },
];

type TVItem = typeof tvContent[number];

export default function TVPage() {
  const [tvMode, setTvMode] = useState<'collective' | 'my-channel'>('collective');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeVideo, setActiveVideo] = useState<TVItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = (activeCategory === 'All' ? tvContent : tvContent.filter((t) => t.category === activeCategory))
    .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleHover = useCallback((item: TVItem | null) => { setActiveVideo(item); }, []);
  const c = activeVideo ? CAT_COLOR[activeVideo.category] || CAT_COLOR.Featured : null;
  const userHandle = '@you';

  return (
    <PageShell>
      <section className="min-h-screen bg-[#f5f0e8] px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-[var(--content-max)] mx-auto min-h-[700px] md:h-[calc(100vh-var(--nav-height)-48px)]">
          <div className="h-full grid grid-rows-[auto_auto_1fr] grid-cols-1 md:grid-cols-[2fr_1fr] gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden bg-bone/20">

            {/* ROW 1 — Header */}
            <div className="p-4 flex flex-col justify-between transition-colors duration-300" style={{ backgroundColor: 'var(--accent, #e4fe52)' }}>
              <span className="font-mono text-[9px] uppercase tracking-[2px] opacity-50" style={{ color: 'var(--accent-text, #1a1a1a)' }}>tv // watch</span>
              <h1 className="font-basement font-black text-[clamp(24px,3vw,36px)] leading-[0.85] uppercase mt-1" style={{ color: 'var(--accent-text, #1a1a1a)' }}>TOPIA TV.</h1>
            </div>
            <div className="bg-obsidian px-4 py-3 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setTvMode('collective')}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 transition-all bg-transparent border-none cursor-pointer ${tvMode === 'collective' ? 'text-bone bg-bone/15' : 'text-bone/30 hover:text-bone/50'}`}>
                  Collective
                </button>
                <button onClick={() => setTvMode('my-channel')}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 transition-all bg-transparent border-none cursor-pointer ${tvMode === 'my-channel' ? 'text-bone bg-bone/15' : 'text-bone/30 hover:text-bone/50'}`}>
                  My Channel
                </button>
              </div>
              <span className="font-mono text-[12px] text-bone/40 tracking-wider">
                {tvMode === 'my-channel' ? (
                  <span className="text-bone/20">{userHandle}&apos;s channel</span>
                ) : activeVideo ? (
                  <><span className="text-bone/20">now playing:</span> <span className={`font-bold ${c?.text}`}>{activeVideo.title}</span></>
                ) : <span className="text-bone/20">select a program</span>}
              </span>
            </div>

            {/* ROW 2 — Category tabs + Search */}
            <div className="md:col-span-2 bg-obsidian border-t border-b border-bone/[0.04] px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {CATEGORIES.map((cat) => {
                  const cc = cat !== 'All' ? CAT_COLOR[cat] : null;
                  const isActive = activeCategory === cat;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 transition-all bg-transparent border-none cursor-pointer ${isActive ? `${cc ? cc.text : 'text-bone'} bg-bone/15` : 'text-bone/50 hover:text-bone'}`}>
                      {cat}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search..."
                  className="font-mono text-[11px] bg-transparent border border-bone/[0.06] focus:border-bone/20 text-bone/60 placeholder:text-bone/15 px-2.5 py-1 rounded outline-none w-28 focus:w-40 transition-all"
                />
                <span className="font-mono text-[9px] text-bone/15 hidden md:inline shrink-0">{filtered.length} programs</span>
              </div>
            </div>

            {/* ROW 3 — Main: TV (left) + Guide (right) */}

            {/* THE TV */}
            <div className="bg-obsidian p-4 md:p-6 flex items-center justify-center min-h-[300px]">
              <div className="relative w-full h-full rounded-lg overflow-hidden" style={{ border: '3px solid #2a2a2a', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}>
                <div className="relative w-full h-full rounded overflow-hidden bg-[#111]">
                  {activeVideo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={activeVideo.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src="/brand/vhs-loop.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  )}

                  <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.08]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
                  <div className="absolute inset-0 pointer-events-none z-[3]" style={{ background: 'linear-gradient(135deg, rgba(245,240,232,0.03) 0%, transparent 50%, transparent 100%)' }} />
                  <div className="absolute inset-0 pointer-events-none z-[4]" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }} />

                  <div className="absolute top-3 left-3 z-[5]">
                    {activeVideo && (
                      <div className={`${c?.bg} px-2 py-1 rounded-sm`}>
                        <span className={`font-mono text-[10px] font-bold uppercase ${c?.textOn}`}>{activeVideo.category}</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-[5] bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4">
                    {activeVideo ? (
                      <>
                        <div className="flex items-end justify-between mb-3">
                          <div>
                            <h2 className="font-basement font-black text-[clamp(24px,2.5vw,32px)] uppercase text-bone leading-[0.9]">{activeVideo.title}</h2>
                          </div>
                          <button className={`${c?.bg} px-4 py-2 rounded-sm shrink-0 ml-4 hover:opacity-80 transition-opacity border-none cursor-pointer`}>
                            <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${c?.textOn}`}>watch →</span>
                          </button>
                        </div>

                        <div className="w-full h-[3px] bg-bone/20 rounded-full mb-3 group cursor-pointer">
                          <div className="h-full rounded-full bg-bone" style={{ width: '35%' }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button className="text-bone hover:text-bone transition-colors bg-transparent border-none cursor-pointer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3L2 12l10.5 9V3zm11 0L13 12l10.5 9V3z"/></svg>
                            </button>
                            <button className="w-8 h-8 rounded-full border border-bone hover:border-bone flex items-center justify-center transition-colors bg-transparent cursor-pointer">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-bone ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </button>
                            <button className="text-bone hover:text-bone transition-colors bg-transparent border-none cursor-pointer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 3v18L22 12 11.5 3zm-11 0v18L11 12 .5 3z"/></svg>
                            </button>
                            <span className="font-mono text-[10px] text-bone">12:34 / {activeVideo.duration}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <button className="text-bone hover:text-bone transition-colors bg-transparent border-none cursor-pointer">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
                              </button>
                              <div className="w-12 h-[2px] bg-bone/30 rounded-full">
                                <div className="w-[60%] h-full bg-bone rounded-full" />
                              </div>
                            </div>
                            <button className="text-bone hover:text-bone transition-colors bg-transparent border-none cursor-pointer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <span className="font-basement font-black text-[clamp(24px,2vw,28px)] uppercase text-bone/60">NOW STREAMING</span>
                        <span className="font-mono text-[10px] text-bone/25 block mt-1">select a program from the guide →</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 z-10">
                  <div className={`w-2 h-1 rounded-t-sm ${activeVideo ? 'bg-lime' : 'bg-red-500'} opacity-60`} />
                </div>
              </div>
            </div>

            {/* TV GUIDE */}
            <div className="relative bg-obsidian overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,240,232,0.1) transparent' }}>
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />

              <div className="relative z-10 px-3 py-2 border-b border-bone/[0.06]">
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25">tv guide // {filtered.length} programs</span>
              </div>

              <div className="relative z-10">
                {filtered.map((item, i) => {
                  const ic = CAT_COLOR[item.category] || CAT_COLOR.Featured;
                  const isActive = activeVideo?.title === item.title;
                  const timeSlot = TIME_SLOTS[i % TIME_SLOTS.length];
                  return (
                    <div
                      key={item.title}
                      className={`flex items-stretch border-b border-bone/[0.04] cursor-pointer transition-all duration-150 ${isActive ? 'bg-bone/[0.06]' : 'hover:bg-bone/[0.03]'}`}
                      onMouseEnter={() => handleHover(item)}
                      onMouseLeave={() => handleHover(null)}
                    >
                      <div className={`w-1 shrink-0 ${ic.dot}`} />

                      <div className="w-16 shrink-0 px-2 py-3 flex items-center border-r border-bone/[0.04]">
                        <span className={`font-mono text-[10px] ${isActive ? 'text-bone/70' : 'text-bone/25'} transition-colors`}>{timeSlot}</span>
                      </div>

                      <div className="flex-1 px-3 py-3 min-w-0">
                        <span className={`font-mono text-[12px] font-bold block truncate ${isActive ? ic.text : 'text-bone'} transition-colors`}>{item.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[9px] text-bone/30">{item.category}</span>
                          <span className="font-mono text-[9px] text-bone/20">·</span>
                          <span className="font-mono text-[9px] text-bone/30">{item.duration}</span>
                        </div>
                      </div>

                      <div className="w-16 h-12 shrink-0 overflow-hidden my-1 mr-2 rounded-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative z-10 px-3 py-2 border-t border-bone/[0.06]">
                <span className="font-mono text-[9px] text-bone/15 uppercase tracking-wider">topia://tv</span>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PageShell>
  );
}
