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
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header with Category Filters */}
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 uppercase">
          ALL TOOLS ({tools.length})
        </h1>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition lowercase ${
                selectedCategory === category
                  ? 'bg-black text-white'
                  : 'border border-black bg-white hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 text-sm">Loading tools...</p>
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 text-sm">No tools found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((tool) => {
            const categories = parseCategories(tool.category);

            return (
              <div
                key={tool.id}
                className="bg-white border border-black rounded-lg p-5 sm:p-6 hover:shadow-lg transition group"
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold uppercase group-hover:underline">
                    {tool.name}
                  </h3>
                  {tool.url ? (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 sm:ml-4 text-xl sm:text-2xl hover:opacity-60 transition"
                    >
                      →
                    </a>
                  ) : (
                    <Link
                      href={`/resources/tools/${tool.slug}`}
                      className="ml-3 sm:ml-4 text-xl sm:text-2xl hover:opacity-60 transition"
                    >
                      →
                    </Link>
                  )}
                </div>
                {tool.description && (
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4">{tool.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {categories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 sm:px-3 py-0.5 sm:py-1 border border-black rounded-full text-xs lowercase"
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
