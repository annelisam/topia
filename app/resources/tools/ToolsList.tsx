'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import LoadingBar from '../../components/LoadingBar';
import { faviconUrl } from './favicon';
import { fuzzyMatch } from './fuzzy';
import ToolModal from './ToolModal';
import SubmitToolModal from './SubmitToolModal';

interface ToolUser {
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  pricing: string | null;
  url: string | null;
  featured: boolean;
  users?: ToolUser[];
  userCount?: number;
}

const CATEGORIES = [
  'all', '3d', 'ads', 'ai', 'analytics', 'animation', 'app developer', 'brand',
  'code', 'community', 'content creation', 'creator monetization', 'curation',
  'deck creation', 'design', 'development', 'distribution', 'documentation',
  'editing', 'funding', 'image generator', 'inspiration', 'magazine', 'mood board',
  'music', 'podcast', 'production', 'productivity', 'research', 'social platform',
  'survey', 'trading platform', 'web3', 'website builder',
];

const SORT_OPTIONS = [
  { value: 'name_asc',  label: 'A → Z' },
  { value: 'name_desc', label: 'Z → A' },
  { value: 'newest',    label: 'Newest' },
  { value: 'popular',   label: 'Most used' },
];

function parseCategories(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map((c) => c.trim()).filter(Boolean);
}

interface TrendingTool {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  category: string | null;
  score?: number;
}

export default function ToolsList() {
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [trending, setTrending] = useState<TrendingTool[]>([]);
  const [newest, setNewest] = useState<TrendingTool[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const initialFetchedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Set of slugs added in the last 30 days (from /api/tools/trending newest)
  const newSlugSet = useMemo(() => new Set(newest.map((t) => t.slug)), [newest]);

  // Reset paging whenever the filter set changes
  useEffect(() => {
    setVisibleCount(24);
  }, [search, selectedCategory, sortBy]);

  // Keyboard shortcut: '/' focuses search (unless an input is already focused)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Single fetch — load everything once, filter & sort client-side for instant feel + fuzzy
  useEffect(() => {
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;
    (async () => {
      try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        setAllTools((data.tools as Tool[]) || []);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Trending + newest
  useEffect(() => {
    fetch('/api/tools/trending')
      .then((r) => r.json())
      .then(({ trending, newest }) => {
        setTrending(trending ?? []);
        setNewest(newest ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!loading && allTools.length > 0) setInitialLoad(false);
  }, [loading, allTools]);

  // Apply category filter + fuzzy search + sort client-side
  const tools = useMemo(() => {
    let list: Tool[] = allTools;

    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter((t) => parseCategories(t.category).some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase())));
    }

    if (search) {
      list = fuzzyMatch(search, list, (t) => [t.name, t.description ?? '', t.category ?? '']);
    }

    if (search) {
      // Fuzzy returns sorted by relevance — preserve order.
      return list;
    }

    switch (sortBy) {
      case 'name_desc': return [...list].sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':    return list; // server already sorted; fall through (no createdAt on client)
      case 'popular':   return [...list].sort((a, b) => (b.userCount ?? 0) - (a.userCount ?? 0));
      default:          return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [allTools, selectedCategory, search, sortBy]);

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <section className="px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="grid grid-cols-1 gap-[3px] border border-bone/[0.08] rounded-lg overflow-hidden">

            {/* ─── ROW 1: Title bar ─── */}
            <div className="bg-lime relative">
              <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[2px] text-obsidian/50 block">tools // toolkit</span>
                  <h1 className="font-basement font-black text-[clamp(28px,5vw,64px)] uppercase leading-[0.9] text-obsidian mt-1">
                    TOOLS
                  </h1>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1">
                  <span className="font-mono text-[12px] text-obsidian/80 leading-snug">software, hardware, platforms.</span>
                  <span className="font-mono text-[12px] text-obsidian/60 leading-snug">what creators use to build worlds.</span>
                </div>
              </div>
            </div>

            {/* ─── ROW 2: Search + sort + count ─── */}
            <div className="bg-obsidian border-t border-b border-bone/[0.06] px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 sticky top-[var(--nav-height,56px)] z-30">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search tools…  press /"
                  className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone placeholder:text-bone/25 px-3 py-1.5 pr-10 rounded-sm outline-none transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[14px] text-bone/40 hover:text-bone transition bg-transparent border-none cursor-pointer w-5 h-5 flex items-center justify-center"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[12px] uppercase tracking-[1px] text-bone/70 px-3 py-1.5 rounded-sm outline-none cursor-pointer transition-colors"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-obsidian text-bone">{opt.label}</option>
                ))}
              </select>
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 md:ml-auto shrink-0">
                {tools.length} tool{tools.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* ─── ROW 3: Category chips ─── */}
            <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-sm whitespace-nowrap transition cursor-pointer ${
                      active
                        ? 'bg-lime text-obsidian font-bold border-transparent'
                        : 'text-bone/40 hover:text-bone/80 bg-transparent border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* ─── ROW 3.5: Trending & new (only when not filtering/searching) ─── */}
            {!search && selectedCategory === 'all' && (trending.length > 0 || newest.length > 0) && (
              <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {trending.length > 0 && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">
                      ◉ trending now
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {trending.slice(0, 6).map((t) => {
                        const fav = faviconUrl(t.url, 32);
                        return (
                          <button
                            key={t.slug}
                            onClick={() => setModalSlug(t.slug)}
                            className="inline-flex items-center gap-2 border border-bone/15 hover:border-lime/50 px-2.5 py-1.5 rounded-sm transition cursor-pointer bg-bone/[0.02]"
                          >
                            {fav && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={fav} alt="" className="w-4 h-4 rounded-sm object-contain" />
                            )}
                            <span className="font-mono text-[11px] text-bone">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {newest.length > 0 && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">
                      ✦ new this month
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {newest.slice(0, 6).map((t) => {
                        const fav = faviconUrl(t.url, 32);
                        return (
                          <button
                            key={t.slug}
                            onClick={() => setModalSlug(t.slug)}
                            className="inline-flex items-center gap-2 border border-bone/15 hover:border-pink/50 px-2.5 py-1.5 rounded-sm transition cursor-pointer bg-bone/[0.02]"
                          >
                            {fav && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={fav} alt="" className="w-4 h-4 rounded-sm object-contain" />
                            )}
                            <span className="font-mono text-[11px] text-bone">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ROW 4: Grid ─── */}
            <div className="bg-obsidian p-4 md:p-6 min-h-[400px]">
              {loading && initialLoad ? (
                <div className="text-center py-16">
                  <LoadingBar text="LOADING TOOLS" />
                </div>
              ) : tools.length === 0 && !loading ? (
                <div className="text-center py-16">
                  <p className="font-mono text-[13px] uppercase tracking-[2px] text-bone/40 mb-4">
                    {search
                      ? `no tools matching "${search}"${selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}`
                      : 'no tools found'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="font-mono text-[11px] uppercase tracking-[2px] text-lime border border-lime/30 hover:bg-lime hover:text-obsidian px-3 py-1.5 rounded-sm bg-transparent cursor-pointer transition"
                      >
                        clear search
                      </button>
                    )}
                    {selectedCategory !== 'all' && (
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/20 hover:border-bone/60 px-3 py-1.5 rounded-sm bg-transparent cursor-pointer transition"
                      >
                        reset category
                      </button>
                    )}
                    <button
                      onClick={() => setSubmitOpen(true)}
                      className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/20 hover:border-bone/60 px-3 py-1.5 rounded-sm bg-transparent cursor-pointer transition"
                    >
                      + submit a tool
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {tools.slice(0, visibleCount).map((tool) => {
                    const categories = parseCategories(tool.category);
                    const favicon = faviconUrl(tool.url, 64);
                    const isNew = newSlugSet.has(tool.slug);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setModalSlug(tool.slug)}
                        className="relative text-left bg-bone/[0.02] hover:bg-bone/[0.06] border border-bone/10 hover:border-lime/40 rounded-md p-4 transition-all flex flex-col gap-3 cursor-pointer"
                      >
                        {isNew && (
                          <span className="absolute top-2 right-2 font-mono text-[8px] uppercase tracking-[2px] bg-pink/15 text-pink border border-pink/30 px-1.5 py-0.5 rounded-sm">
                            ✦ new
                          </span>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-sm border border-bone/10 bg-bone/[0.04] overflow-hidden flex items-center justify-center">
                            {favicon ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={favicon} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="font-basement text-base text-bone/30">{tool.name[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-mono text-[13px] uppercase font-bold text-bone truncate">{tool.name}</h3>
                              {tool.featured && !isNew && (
                                <span className="font-mono text-[9px] uppercase tracking-wider text-lime/80 shrink-0">★</span>
                              )}
                            </div>
                            {tool.pricing && (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-bone/40 mt-0.5 block">{tool.pricing}</span>
                            )}
                          </div>
                        </div>

                        {tool.description && (
                          <p className="font-mono text-[11px] text-bone/60 leading-relaxed line-clamp-2">{tool.description}</p>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-bone/[0.06]">
                          {/* Categories */}
                          <div className="flex flex-wrap gap-1">
                            {categories.slice(0, 2).map((cat) => (
                              <span
                                key={cat}
                                className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-bone/10 text-bone/40 rounded-sm"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                          {/* Users using */}
                          {(tool.userCount ?? 0) > 0 && (
                            <div className="flex items-center -space-x-1.5">
                              {(tool.users || []).slice(0, 3).map((u, i) => (
                                <span
                                  key={i}
                                  className="relative block w-5 h-5 rounded-full border overflow-hidden bg-bone/5"
                                  style={{ borderColor: '#1a1a1a', zIndex: 3 - i }}
                                  title={u.name || u.username || ''}
                                >
                                  {u.avatarUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="w-full h-full flex items-center justify-center font-basement text-[9px] text-bone/40">
                                      {(u.name || u.username || '?')[0]?.toUpperCase()}
                                    </span>
                                  )}
                                </span>
                              ))}
                              {(tool.userCount ?? 0) > 3 && (
                                <span
                                  className="relative w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold bg-bone/10 text-bone/60"
                                  style={{ borderColor: '#1a1a1a', zIndex: 0 }}
                                >
                                  +{(tool.userCount ?? 0) - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Load more */}
              {!loading && tools.length > visibleCount && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30">
                    showing {visibleCount} of {tools.length}
                  </span>
                  <button
                    onClick={() => setVisibleCount((n) => n + 24)}
                    className="font-mono text-[11px] uppercase tracking-[2px] text-bone/70 hover:text-bone border border-bone/20 hover:border-bone/60 px-4 py-2 rounded-sm bg-transparent cursor-pointer transition"
                  >
                    load more →
                  </button>
                  {tools.length > visibleCount + 24 && (
                    <button
                      onClick={() => setVisibleCount(tools.length)}
                      className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone/70 bg-transparent border-none cursor-pointer transition"
                    >
                      show all {tools.length}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ─── ROW 5: Footer / submit CTA ─── */}
            <div className="bg-obsidian border-t border-bone/[0.04] px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/20">topia://tools</span>
              <button
                onClick={() => setSubmitOpen(true)}
                className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 hover:text-lime transition bg-transparent border-none cursor-pointer"
              >
                + submit a tool
              </button>
            </div>
          </div>
        </div>
      </section>

      <ToolModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      <SubmitToolModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={(t) => {
          // Add the new tool to the local list so it shows up immediately
          if (t) setAllTools((prev) => [t, ...prev]);
        }}
      />
    </div>
  );
}
