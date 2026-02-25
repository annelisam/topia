'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function ToolsList() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTools();
  }, [selectedCategory]);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
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

  const parseCategories = (categoryString: string | null) => {
    if (!categoryString) return [];
    return categoryString.split(',').map(cat => cat.trim()).filter(Boolean);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24 sm:pt-28">
      {/* Header with Category Filters */}
      <div className="mb-8 sm:mb-12">
        <h1 className="font-mono text-[13px] mb-4 sm:mb-6 uppercase" style={{ color: 'var(--foreground)' }}>
          ALL TOOLS ({tools.length})
        </h1>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[13px] transition lowercase ${
                selectedCategory === category
                  ? ''
                  : 'border hover:opacity-70'
              }`}
              style={selectedCategory === category
                ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                : { borderColor: 'var(--foreground)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
              }
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="text-center py-8 sm:py-12">
          <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>Loading tools...</p>
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>No tools found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((tool) => {
            const categories = parseCategories(tool.category);

            return (
              <div
                key={tool.id}
                className="border p-5 sm:p-6 hover:opacity-70 transition group flex flex-col"
                style={{ borderColor: 'var(--foreground)', backgroundColor: 'var(--background)' }}
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
                        className="px-2.5 sm:px-3 py-0.5 sm:py-1 border font-mono text-[13px] lowercase"
                        style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)' }}
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
    </div>
  );
}
