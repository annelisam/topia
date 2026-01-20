'use client';

import { useState, useRef, useEffect } from 'react';

const LOADING_LINES = [
  "INITIALIZING TOPIA PROTOCOL...",
  "LOADING MANIFESTO DATA...",
  "ESTABLISHING CONNECTION...",
  "DECRYPTING FILES...",
  "READY."
];

const manifestoPages = [
  {
    title: "TOPIA_MANIFESTO_001",
    content: [
      "TOPIA IS WHAT YOU MAKE IT",
      "",
      "THE CREATIVE WORLD STANDS AT A BREAKING POINT.",
      "",
      "THE SYSTEMS WE WERE TOLD TO TRUST WERE BUILT TO PROFIT INSTEAD OF STRENGTHENING HUMANITY.",
      "",
      "FALLING APART UNDER THEIR OWN WEIGHT: EXTRACTION OVER EXPRESSION, OWNERSHIP OVER COLLABORATION, DATA OVER DEPTH.",
      "",
      "BUT CREATION HAS NEVER BELONGED TO THOSE SYSTEMS ANYWAY.",
      "",
      "IT BELONGS TO THE PEOPLE."
    ]
  },
  {
    title: "TOPIA_MANIFESTO_002",
    content: [
      "TOPIA EXISTS TO BUILD A NEW FRAMEWORK WHERE ARTISTRY, TECHNOLOGY, AND HUMANITY MOVE IN RHYTHM.",
      "",
      "WHERE THE PEOPLE LEAD THE TECH.",
      "",
      "WHERE ARTISTS ARE THE LEADERS THEY HAVE ALWAYS BEEN.",
      "",
      "WHERE THERE IS ACTUAL DEPTH IN THE WORD 'CULTURE.'"
    ]
  },
  {
    title: "TOPIA_MANIFESTO_003",
    content: [
      "THIS IS ABOUT DESIGNING A NEW MODEL.",
      "",
      "A BREATHING NETWORK THAT EMPOWERS ARTISTS TO CREATE WORLDS, AUDIENCES TO EXPLORE THEM, AND COMMUNITIES TO SUSTAIN THEM.",
      "",
      "THIS IS RECONSTRUCTION, THE RESULT OF COLLAPSE.",
      "",
      "THROUGH OUR COMMUNITY, TOOLS, AND NETWORK, WE BUILD THE BRIDGES THE OLD WORLD NEVER INTENDED TO.",
      "",
      "WE MAKE SPACE FOR PURPOSE TO HAVE AN ADDRESS, FOR COLLABORATION TO HAVE INFRASTRUCTURE, FOR CREATIVE INTENTION TO HAVE A COMEBACK."
    ]
  },
  {
    title: "TOPIA_MANIFESTO_004",
    content: [
      "TOPIA IS A PROTOCOL FOR WORLD BUILDERS.",
      "",
      "A NEW ARCHITECTURE OF CREATION.",
      "",
      "BUILT FOR AND BY THE CURIOUS AND CREATIVE."
    ]
  }
];

export default function DraggableManifesto() {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current || !sectionRef.current || !containerRef.current) return;

    const sectionRect = sectionRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    let newX = e.clientX - dragRef.current.startX;
    let newY = e.clientY - dragRef.current.startY;

    // Constrain to section bounds
    newX = Math.max(sectionRect.left, Math.min(newX, sectionRect.right - containerRect.width));
    newY = Math.max(sectionRect.top, Math.min(newY, sectionRect.bottom - containerRect.height));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  // Loading animation effect
  useEffect(() => {
    if (loadingProgress < LOADING_LINES.length) {
      const timer = setTimeout(() => {
        setLoadingProgress(loadingProgress + 1);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const nextPage = () => {
    if (currentPage < manifestoPages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <section ref={sectionRef} className="relative py-16 sm:py-24 px-4 sm:px-6 min-h-screen border-t border-white/10">
      <div
        ref={containerRef}
        className="absolute bg-off-white text-near-black rounded-lg shadow-2xl p-8 select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '600px',
          maxWidth: '90vw',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1000
        }}
        onMouseDown={handleMouseDown}
      >
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col justify-center font-mono">
            <div className="space-y-2">
              {LOADING_LINES.slice(0, loadingProgress).map((line, index) => (
                <div key={index} className="text-sm text-near-black">
                  <span className="text-green-600">&gt;</span> {line}
                  {index === loadingProgress - 1 && (
                    <span className="inline-block w-2 h-4 bg-near-black ml-1 animate-pulse"></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-8 font-mono">
              {manifestoPages[currentPage].title}
            </div>

            <div className="space-y-2 mb-12 min-h-[300px] flex flex-col justify-center">
              {manifestoPages[currentPage].content.map((line, index) => (
                <p
                  key={index}
                  className={`font-mono ${
                    index === 0 ? 'text-2xl font-bold text-center' : 'text-sm leading-relaxed text-center'
                  } ${line === '' ? 'h-1' : ''}`}
                >
                  {line}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="px-4 py-2 border border-near-black text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-near-black hover:text-off-white transition"
                >
                  Prev
                </button>
                <button
                  onClick={nextPage}
                  disabled={currentPage === manifestoPages.length - 1}
                  className="px-4 py-2 border border-near-black text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-near-black hover:text-off-white transition"
                >
                  Next
                </button>
              </div>

              <div className="flex gap-2">
                {manifestoPages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentPage ? 'bg-near-black' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>

              <div className="text-xs text-gray-500 font-mono">
                {currentPage + 1} / {manifestoPages.length}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
