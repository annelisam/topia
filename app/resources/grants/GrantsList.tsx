'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all tags');
  const [sortBy, setSortBy] = useState('deadline-asc');

  useEffect(() => {
    fetchGrants();
  }, [search, selectedTag, sortBy]);

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
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

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24 sm:pt-28">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
        {/* Sidebar - Search & Filters */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-6">
            <h2 className="font-mono text-[11px] mb-4 sm:mb-6 uppercase" style={{ color: '#1a1a1a' }}>SEARCH & FILTERS</h2>

            {/* Search */}
            <div className="mb-6 sm:mb-8">
              <label className="block font-mono text-[11px] mb-2 sm:mb-3 uppercase" style={{ color: '#1a1a1a' }}>SEARCH</label>
              <input
                type="text"
                placeholder="Search grants, orgs, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[11px] border focus:outline-none focus:ring-2"
                style={{ borderColor: '#1a1a1a', backgroundColor: '#f5f0e8', color: '#1a1a1a' }}
              />
            </div>

            {/* Filter by Tag */}
            <div className="mb-6 sm:mb-8">
              <label className="block font-mono text-[11px] mb-2 sm:mb-3 uppercase" style={{ color: '#1a1a1a' }}>FILTER BY TAG</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[11px] transition lowercase ${
                      selectedTag === tag
                        ? ''
                        : 'border hover:opacity-70'
                    }`}
                    style={selectedTag === tag
                      ? { backgroundColor: '#1a1a1a', color: '#f5f0e8' }
                      : { borderColor: '#1a1a1a', backgroundColor: '#f5f0e8', color: '#1a1a1a' }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block font-mono text-[11px] mb-2 sm:mb-3 uppercase" style={{ color: '#1a1a1a' }}>SORT BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 font-mono text-[11px] border focus:outline-none focus:ring-2"
                style={{ borderColor: '#1a1a1a', backgroundColor: '#f5f0e8', color: '#1a1a1a' }}
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
            <h1 className="font-mono text-[11px] uppercase" style={{ color: '#1a1a1a' }}>GRANTS</h1>
            <p className="font-mono text-[11px] uppercase" style={{ color: '#1a1a1a' }}>
              SHOWING {grants.length} GRANT{grants.length !== 1 ? 'S' : ''}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>Loading grants...</p>
            </div>
          ) : grants.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>No grants found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {grants.map((grant) => {
                const amount = formatAmount(grant);
                const tags = parseTags(grant.tags);

                return (
                  <div
                    key={grant.id}
                    className="border p-4 sm:p-6 hover:opacity-70 transition group"
                    style={{ borderColor: '#1a1a1a', backgroundColor: '#f5f0e8' }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-mono text-[11px] mb-2 uppercase group-hover:underline" style={{ color: '#1a1a1a' }}>
                          {grant.grantName}
                        </h3>
                        {grant.shortDescription && (
                          <p className="font-mono text-[11px] mb-2 sm:mb-3" style={{ color: '#1a1a1a' }}>{grant.shortDescription}</p>
                        )}
                        <p className="font-mono text-[11px] mb-3 sm:mb-4" style={{ color: '#1a1a1a' }}>
                          {amount && <span className="inline-block mr-1">{amount} ·</span>}
                          {grant.orgName && <span className="inline-block mr-1">{grant.orgName} ·</span>}
                          {grant.region && <span className="inline-block mr-1">{grant.region} ·</span>}
                          {grant.deadlineDate && <span className="inline-block">DEADLINE: {grant.deadlineDate}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {grant.status && (
                            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 border font-mono text-[11px] lowercase" style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}>
                              {grant.status}
                            </span>
                          )}
                          {tags.slice(0, 5).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 sm:px-3 py-0.5 sm:py-1 border font-mono text-[11px] lowercase"
                              style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
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
                          className="flex-shrink-0 ml-2 sm:ml-4 font-mono text-[11px] hover:opacity-60 transition"
                          style={{ color: '#1a1a1a' }}
                        >
                          →
                        </a>
                      ) : (
                        <Link
                          href={`/resources/grants/${grant.slug}`}
                          className="flex-shrink-0 ml-2 sm:ml-4 font-mono text-[11px] hover:opacity-60 transition"
                          style={{ color: '#1a1a1a' }}
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
    </div>
  );
}
