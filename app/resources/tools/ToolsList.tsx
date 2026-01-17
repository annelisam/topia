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
    <div className="container mx-auto px-6 py-12">
      {/* Header with Category Filters */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6 uppercase">
          ALL TOOLS ({tools.length})
        </h1>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm transition uppercase ${
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
        <div className="text-center py-12">
          <p className="text-gray-500">Loading tools...</p>
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No tools found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const categories = parseCategories(tool.category);

            return (
              <div
                key={tool.id}
                className="bg-white border border-black rounded-lg p-6 hover:shadow-lg transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold uppercase group-hover:underline">
                    {tool.name}
                  </h3>
                  {tool.url ? (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-2xl hover:opacity-60 transition"
                    >
                      →
                    </a>
                  ) : (
                    <Link
                      href={`/resources/tools/${tool.slug}`}
                      className="ml-4 text-2xl hover:opacity-60 transition"
                    >
                      →
                    </Link>
                  )}
                </div>
                {tool.description && (
                  <p className="text-sm mb-4">{tool.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {tool.pricing && (
                    <span className="px-3 py-1 border border-black rounded-full text-xs uppercase">
                      {tool.pricing}
                    </span>
                  )}
                  {categories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 border border-black rounded-full text-xs"
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
