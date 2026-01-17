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
    <div className="container mx-auto px-6 py-12">
      <div className="flex gap-12">
        {/* Sidebar - Search & Filters */}
        <aside className="w-80 flex-shrink-0">
          <div className="sticky top-6">
            <h2 className="text-2xl font-bold mb-6 uppercase">SEARCH & FILTERS</h2>

            {/* Search */}
            <div className="mb-8">
              <label className="block text-sm font-bold mb-3 uppercase">SEARCH</label>
              <input
                type="text"
                placeholder="Search grants, orgs, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Filter by Tag */}
            <div className="mb-8">
              <label className="block text-sm font-bold mb-3 uppercase">FILTER BY TAG</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm transition lowercase ${
                      selectedTag === tag
                        ? 'bg-black text-white'
                        : 'border border-black hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-bold mb-3 uppercase">SORT BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-black"
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold uppercase">GRANTS</h1>
            <p className="text-sm uppercase">
              SHOWING {grants.length} GRANT{grants.length !== 1 ? 'S' : ''}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading grants...</p>
            </div>
          ) : grants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No grants found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grants.map((grant) => {
                const amount = formatAmount(grant);
                const tags = parseTags(grant.tags);

                return (
                  <div
                    key={grant.id}
                    className="border border-black rounded-lg p-6 hover:shadow-lg transition group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2 uppercase group-hover:underline">
                          {grant.grantName}
                        </h3>
                        {grant.shortDescription && (
                          <p className="text-sm mb-3">{grant.shortDescription}</p>
                        )}
                        <p className="text-sm mb-4">
                          {amount && <span>{amount} · </span>}
                          {grant.orgName && <span>{grant.orgName} · </span>}
                          {grant.region && <span>{grant.region} · </span>}
                          {grant.deadlineDate && <span>DEADLINE: {grant.deadlineDate}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {grant.status && (
                            <span className="px-3 py-1 border border-black rounded-full text-xs lowercase">
                              {grant.status}
                            </span>
                          )}
                          {tags.slice(0, 5).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 border border-black rounded-full text-xs lowercase"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Link
                        href={`/resources/grants/${grant.slug}`}
                        className="ml-4 text-2xl hover:opacity-60 transition"
                      >
                        →
                      </Link>
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
