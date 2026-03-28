'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LoadingBar from '../../components/LoadingBar';

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
  'survey', 'trading platform', 'web3', 'website builder'
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'newest', label: 'Newest first' },
];

export default function ToolsList() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showCategories, setShowCategories] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Debounce search input by 300ms
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch tools when filters change
  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') {
          params.append('category', selectedCategory);
        }
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        if (sortBy !== 'name_asc') {
          params.append('sort', sortBy);
        }

        const response = await fetch(`/api/tools?${params}`);
        const data = await response.json();
        setTools(data.tools || []);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [selectedCategory, debouncedSearch, sortBy]);

  // Track whether this is the first load (show LoadingBar) vs filter change (show previous results dimmed)
  useEffect(() => {
    if (!loading && tools.length > 0) setInitialLoad(false);
  }, [loading, tools]);

  const parseCategories = (categoryString: string | null) => {
    if (!categoryString) return [];
    return categoryString.split(',').map(cat => cat.trim()).filter(Boolean);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24 sm:pt-28">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
        {/* Sidebar - Search & Filters */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-6">
            {/* Search */}
            <div className="mb-6 sm:mb-8">
              <label className="block font-mono text-[13px] mb-2 sm:mb-3 uppercase" style={{ color: 'var(--foreground)' }}>SEARCH</label>
              <input
                type="text"
                placeholder="Search tools, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[13px] border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>

            {/* Filter by Category */}
            <div className="mb-6 sm:mb-8">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-2 font-mono text-[13px] mb-2 sm:mb-3 uppercase hover:opacity-70 transition"
                style={{ color: 'var(--foreground)' }}
              >
                <span className="font-mono text-[13px]" style={{ width: '1em', display: 'inline-block' }}>{showCategories ? '−' : '+'}</span>
                FILTER BY CATEGORY
                {selectedCategory !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] lowercase" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                    {selectedCategory}
                  </span>
                )}
              </button>
              {showCategories && (
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[13px] transition lowercase rounded-full ${
                        selectedCategory === category
                          ? ''
                          : 'border hover:opacity-70'
                      }`}
                      style={selectedCategory === category
                        ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                        : { borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
                      }
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort By */}
            <div>
              <label className="block font-mono text-[13px] mb-2 sm:mb-3 uppercase" style={{ color: 'var(--foreground)' }}>SORT BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[13px] border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content - Tools Grid */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6 sm:mb-8">
            <h1 className="font-mono text-[13px] uppercase" style={{ color: 'var(--foreground)' }}>TOOLS</h1>
            <p className="font-mono text-[13px] uppercase" style={{ color: 'var(--foreground)' }}>
              SHOWING {tools.length} TOOL{tools.length !== 1 ? 'S' : ''}
            </p>
          </div>

          {loading && initialLoad ? (
            <div className="text-center py-8 sm:py-12">
              <LoadingBar text="LOADING TOOLS" />
            </div>
          ) : tools.length === 0 && !loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
                {debouncedSearch
                  ? `No tools matching "${debouncedSearch}"${selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}.`
                  : 'No tools found. Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              {tools.map((tool) => {
                const categories = parseCategories(tool.category);

                return (
                  <div
                    key={tool.id}
                    className="border p-5 sm:p-6 rounded-2xl transition-colors duration-200 group flex flex-col"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                  >
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <h3 className="font-mono text-[16px] sm:text-[18px] font-bold uppercase group-hover:underline" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
                        {tool.name}
                      </h3>
                      {tool.url ? (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 sm:ml-4 font-mono text-[13px] hover:opacity-60 transition"
                          style={{ color: 'var(--foreground)' }}
                        >
                          →
                        </a>
                      ) : (
                        <Link
                          href={`/resources/tools/${tool.slug}`}
                          className="ml-3 sm:ml-4 font-mono text-[13px] hover:opacity-60 transition"
                          style={{ color: 'var(--foreground)' }}
                        >
                          →
                        </Link>
                      )}
                    </div>
                    {tool.description && (
                      <p className="font-mono text-[13px] mb-3 sm:mb-4" style={{ color: 'var(--foreground)' }}>{tool.description}</p>
                    )}
                    <div className="flex-grow" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {categories.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 sm:px-3 py-0.5 sm:py-1 border rounded-full font-mono text-[13px] lowercase"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      {/* User avatars */}
                      {(tool.userCount ?? 0) > 0 && (
                        <div className="flex items-center -space-x-1.5 ml-2">
                          {(tool.users || []).slice(0, 4).map((u, i) => (
                            u.username ? (
                              <Link
                                key={u.username}
                                href={`/profile/${u.username}`}
                                className="relative block w-6 h-6 rounded-full border overflow-hidden transition hover:z-10 hover:scale-110"
                                style={{ borderColor: 'var(--background)', zIndex: 4 - i }}
                                title={u.name || u.username}
                              >
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.name || u.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-mono text-[9px] font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                                    {(u.name || u.username || '?')[0]?.toUpperCase()}
                                  </div>
                                )}
                              </Link>
                            ) : (
                              <div
                                key={i}
                                className="relative w-6 h-6 rounded-full border overflow-hidden"
                                style={{ borderColor: 'var(--background)', zIndex: 4 - i }}
                              >
                                <div className="w-full h-full flex items-center justify-center font-mono text-[9px] font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                                  {(u.name || '?')[0]?.toUpperCase()}
                                </div>
                              </div>
                            )
                          ))}
                          {(tool.userCount ?? 0) > 4 && (
                            <div
                              className="relative w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[8px] font-bold"
                              style={{ borderColor: 'var(--background)', backgroundColor: 'var(--foreground)', color: 'var(--background)', zIndex: 0 }}
                            >
                              +{(tool.userCount ?? 0) - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
