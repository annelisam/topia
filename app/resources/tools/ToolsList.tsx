'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  pricing: string | null;
  url: string | null;
  featured: boolean;
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
        <h1 className="font-mono text-[11px] mb-4 sm:mb-6 uppercase" style={{ color: '#1a1a1a' }}>
          ALL TOOLS ({tools.length})
        </h1>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[11px] transition lowercase ${
                selectedCategory === category
                  ? ''
                  : 'border hover:opacity-70'
              }`}
              style={selectedCategory === category
                ? { backgroundColor: '#1a1a1a', color: '#f5f0e8' }
                : { borderColor: '#1a1a1a', backgroundColor: '#f5f0e8', color: '#1a1a1a' }
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
          <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>Loading tools...</p>
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>No tools found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((tool) => {
            const categories = parseCategories(tool.category);

            return (
              <div
                key={tool.id}
                className="border p-5 sm:p-6 hover:opacity-70 transition group"
                style={{ borderColor: '#1a1a1a', backgroundColor: '#f5f0e8' }}
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="font-mono text-[11px] uppercase group-hover:underline" style={{ color: '#1a1a1a' }}>
                    {tool.name}
                  </h3>
                  {tool.url ? (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 sm:ml-4 font-mono text-[11px] hover:opacity-60 transition"
                      style={{ color: '#1a1a1a' }}
                    >
                      →
                    </a>
                  ) : (
                    <Link
                      href={`/resources/tools/${tool.slug}`}
                      className="ml-3 sm:ml-4 font-mono text-[11px] hover:opacity-60 transition"
                      style={{ color: '#1a1a1a' }}
                    >
                      →
                    </Link>
                  )}
                </div>
                {tool.description && (
                  <p className="font-mono text-[11px] mb-3 sm:mb-4" style={{ color: '#1a1a1a' }}>{tool.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {categories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 sm:px-3 py-0.5 sm:py-1 border font-mono text-[11px] lowercase"
                      style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
