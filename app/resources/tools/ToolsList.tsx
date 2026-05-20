'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LoadingBar from '../../components/LoadingBar';
import { faviconUrl } from './favicon';
import ToolModal from './ToolModal';

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

export default function ToolsList() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch
  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (sortBy !== 'name_asc' && sortBy !== 'popular') params.append('sort', sortBy);
        const response = await fetch(`/api/tools?${params}`);
        const data = await response.json();
        let list: Tool[] = data.tools || [];
        if (sortBy === 'popular') {
          list = [...list].sort((a, b) => (b.userCount ?? 0) - (a.userCount ?? 0));
        }
        setTools(list);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, [selectedCategory, debouncedSearch, sortBy]);

  useEffect(() => {
    if (!loading && tools.length > 0) setInitialLoad(false);
  }, [loading, tools]);

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
            <div className="bg-obsidian border-t border-b border-bone/[0.06] px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search tools…"
                className="flex-1 bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone placeholder:text-bone/25 px-3 py-1.5 rounded-sm outline-none transition-colors"
              />
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

            {/* ─── ROW 4: Grid ─── */}
            <div className="bg-obsidian p-4 md:p-6 min-h-[400px]">
              {loading && initialLoad ? (
                <div className="text-center py-16">
                  <LoadingBar text="LOADING TOOLS" />
                </div>
              ) : tools.length === 0 && !loading ? (
                <div className="text-center py-16">
                  <p className="font-mono text-[13px] uppercase tracking-[2px] text-bone/40">
                    {debouncedSearch
                      ? `no tools matching "${debouncedSearch}"${selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}.`
                      : 'no tools found.'}
                  </p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {tools.map((tool) => {
                    const categories = parseCategories(tool.category);
                    const favicon = faviconUrl(tool.url, 64);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setModalSlug(tool.slug)}
                        className="text-left bg-bone/[0.02] hover:bg-bone/[0.06] border border-bone/10 hover:border-lime/40 rounded-md p-4 transition-all flex flex-col gap-3 cursor-pointer"
                      >
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
                              {tool.featured && (
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
            </div>

            {/* ─── ROW 5: Footer / submit CTA ─── */}
            <div className="bg-obsidian border-t border-bone/[0.04] px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/20">topia://tools</span>
              <Link
                href="/dashboard/submit-tool"
                className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 hover:text-lime transition no-underline"
              >
                + submit a tool
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ToolModal slug={modalSlug} onClose={() => setModalSlug(null)} />
    </div>
  );
}
