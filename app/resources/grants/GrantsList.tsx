'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Skeleton } from '../../components/Skeleton';

const SubmitGrantModal = dynamic(() => import('./SubmitGrantModal'), { ssr: false });

interface Grant {
  id: string;
  grantName: string;
  slug: string;
  shortDescription: string | null;
  amountMin: number | null;
  amountMax: number | null;
  currency: string | null;
  tags: string | null;
  eligibility: string | null;
  deadlineDate: string | null;
  orgName: string | null;
  region: string | null;
  status: string | null;
  link: string | null;
}

const COMMON_TAGS = [
  'all tags', 'art', 'artists', 'arts-org', 'base', 'black', 'creators',
  'crypto', 'dao', 'fellowship', 'femme', 'film', 'grant', 'interactive',
  'international', 'mentorship', 'music', 'nft', 'photography', 'poc',
  'public-goods', 'queer', 'residency', 'social', 'trans', 'visual arts', 'women'
];

export default function GrantsList() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all tags');
  const [sortBy, setSortBy] = useState('deadline-asc');
  const [submitOpen, setSubmitOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Debounce search input by 300ms
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    fetchGrants();
  }, [debouncedSearch, selectedTag, sortBy]);

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedTag && selectedTag !== 'all tags') params.append('tag', selectedTag);
      params.append('sortBy', sortBy);

      const response = await fetch(`/api/grants?${params}`);
      const data = await response.json();
      setGrants(data.grants || []);
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track whether this is the first load vs filter change
  useEffect(() => {
    if (!loading && grants.length > 0) setInitialLoad(false);
  }, [loading, grants]);

  const formatAmount = (grant: Grant) => {
    if (!grant.amountMin && !grant.amountMax) return null;

    const currency = grant.currency || 'USD';
    if (grant.amountMin && grant.amountMax) {
      return `${currency} ${grant.amountMin.toLocaleString()} - ${grant.amountMax.toLocaleString()}`;
    } else if (grant.amountMax) {
      return `${currency} ${grant.amountMax.toLocaleString()}`;
    } else if (grant.amountMin) {
      return `${currency} ${grant.amountMin.toLocaleString()}`;
    }
    return null;
  };

  const parseTags = (tagsString: string | null) => {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
  };

  const isGrantClosed = (grant: Grant) => {
    // An explicit Closed status wins — some programs are discontinued even
    // though their deadline reads "Rolling" or "Varies".
    if ((grant.status ?? '').toLowerCase().includes('closed')) return true;
    if (!grant.deadlineDate) return false;
    try {
      const deadline = new Date(grant.deadlineDate);
      if (isNaN(deadline.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadline < today;
    } catch {
      return false;
    }
  };

  // Sort: current grants first, then closed
  const sortedGrants = [...grants].sort((a, b) => {
    const aClosed = isGrantClosed(a);
    const bClosed = isGrantClosed(b);
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    return 0; // preserve API sort order within each group
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24 sm:pt-28">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
        {/* Sidebar - Search & Filters */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-6">
            {/* <h3 className="font-mono text-[13px] mb-4 sm:mb-6 uppercase" style={{ color: 'var(--foreground)' }}>SEARCH & FILTERS</h3> */}

            {/* Search */}
            <div className="mb-6 sm:mb-8">
              <label className="block font-mono text-[13px] mb-2 sm:mb-3 uppercase" style={{ color: 'var(--foreground)' }}>SEARCH</label>
              <input
                type="text"
                placeholder="Search grants, orgs, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[13px] border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>

            {/* Filter by Tag */}
            <div className="mb-6 sm:mb-8">
              <label className="block font-mono text-[13px] mb-2 sm:mb-3 uppercase" style={{ color: 'var(--foreground)' }}>FILTER BY TAG</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[13px] transition lowercase rounded-full ${
                      selectedTag === tag
                        ? ''
                        : 'border hover:opacity-70'
                    }`}
                    style={selectedTag === tag
                      ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                      : { borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="grants-sort" className="block font-mono text-[13px] mb-2 sm:mb-3 uppercase" style={{ color: 'var(--foreground)' }}>SORT BY</label>
              <select
                id="grants-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[13px] border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              >
                <option value="deadline-asc">Deadline (soonest first)</option>
                <option value="deadline-desc">Deadline (latest first)</option>
                <option value="amount-desc">Amount (highest first)</option>
                <option value="amount-asc">Amount (lowest first)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content - Grants List */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6 sm:mb-8">
            <h1 className="font-mono text-[13px] uppercase" style={{ color: 'var(--foreground)' }}>GRANTS</h1>
            <div className="flex items-center gap-4">
              <p className="font-mono text-[13px] uppercase" style={{ color: 'var(--foreground)' }}>
                SHOWING {grants.length} GRANT{grants.length !== 1 ? 'S' : ''}
              </p>
              <button
                onClick={() => setSubmitOpen(true)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[13px] uppercase rounded-full hover:opacity-80 transition cursor-pointer border-none"
                style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
              >
                SUBMIT GRANT
              </button>
            </div>
          </div>

          {loading && initialLoad ? (
            <div className="space-y-3 sm:space-y-4" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border p-4 sm:p-6 rounded-2xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                  <Skeleton className="h-4 w-1/3 mb-3" />
                  <Skeleton className="h-3 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : grants.length === 0 && !loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>No grants found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className={`space-y-3 sm:space-y-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              {sortedGrants.map((grant) => {
                const amount = formatAmount(grant);
                const tags = parseTags(grant.tags);
                const closed = isGrantClosed(grant);

                return (
                  <div
                    key={grant.id}
                    className={`border p-4 sm:p-6 rounded-2xl transition-colors duration-200 group ${closed ? 'opacity-60' : ''}`}
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                    onMouseEnter={(e) => { if (!closed) e.currentTarget.style.backgroundColor = 'var(--surface-hover)'; }}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-mono text-[13px] uppercase group-hover:underline" style={{ color: 'var(--foreground)' }}>
                            {grant.grantName}
                          </h3>
                          {closed && (
                            <span
                              className="px-2 py-0.5 rounded-full font-mono text-[13px] uppercase font-bold tracking-wide flex-shrink-0"
                              style={{ backgroundColor: '#C63A1E', color: '#fff' }}
                            >
                              CLOSED
                            </span>
                          )}
                        </div>
                        {grant.shortDescription && (
                          <p className="font-mono text-[13px] mb-2 sm:mb-3" style={{ color: 'var(--foreground)' }}>{grant.shortDescription}</p>
                        )}
                        <p className="font-mono text-[13px] mb-3 sm:mb-4" style={{ color: 'var(--foreground)' }}>
                          {amount && <span className="inline-block mr-1">{amount} ·</span>}
                          {grant.orgName && <span className="inline-block mr-1">{grant.orgName} ·</span>}
                          {grant.region && <span className="inline-block mr-1">{grant.region} ·</span>}
                          {grant.deadlineDate && <span className="inline-block">DEADLINE: {grant.deadlineDate}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {tags.slice(0, 5).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 sm:px-3 py-0.5 sm:py-1 border rounded-full font-mono text-[13px] lowercase"
                              style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {grant.link ? (
                        <a
                          href={grant.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 ml-2 sm:ml-4 font-mono text-[13px] hover:opacity-60 transition"
                          style={{ color: 'var(--foreground)' }}
                        >
                          →
                        </a>
                      ) : (
                        <Link
                          href={`/resources/grants/${grant.slug}`}
                          className="flex-shrink-0 ml-2 sm:ml-4 font-mono text-[13px] hover:opacity-60 transition"
                          style={{ color: 'var(--foreground)' }}
                        >
                          →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <SubmitGrantModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => fetchGrants()}
      />
    </div>
  );
}
