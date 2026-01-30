'use client';

import { useRef, useState, useEffect } from 'react';

export default function DraggableStickyNote() {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Center the note on initial load
  useEffect(() => {
    if (position === null) {
      const centerX = (window.innerWidth - 500) / 2;
      const centerY = (window.innerHeight - 400) / 2;
      setPosition({ x: Math.max(20, centerX), y: Math.max(100, centerY) });
    }
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition(prev => {
        if (!prev) return prev;

        // Constrain to viewport bounds
        const maxX = window.innerWidth - 500;
        const maxY = window.innerHeight - 100;

        return {
          x: Math.max(0, Math.min(maxX, prev.x + deltaX)),
          y: Math.max(0, Math.min(maxY, prev.y + deltaY)),
        };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle window resize to keep note in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return prev;

        const maxX = window.innerWidth - 500;
        const maxY = window.innerHeight - 100;

        return {
          x: Math.max(20, Math.min(maxX, prev.x)),
          y: Math.max(100, Math.min(maxY, prev.y)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleClose = () => {
    setIsMinimized(true);
  };

  const handleReopen = () => {
    setIsMinimized(false);
  };

  if (isMinimized && position) {
    return (
      <div
        className="fixed z-50 p-4 shadow-lg cursor-move select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: '#e4fe52',
          fontFamily: "'Space Mono', monospace",
          width: '500px',
          maxWidth: '90vw',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex justify-between items-start">
          <div className="text-xs uppercase font-bold">TOPIA_NOTE_001</div>
          <button
            onClick={(e) => handleButtonClick(e, handleReopen)}
            className="text-xs uppercase font-bold hover:opacity-70 transition-opacity cursor-pointer"
            style={{ marginTop: '-2px' }}
          >
            OPEN ▢
          </button>
        </div>
      </div>
    );
  }

  if (!position) return null;

  return (
    <div
      ref={noteRef}
      className="fixed z-50 p-4 shadow-lg cursor-move select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#e4fe52',
        fontFamily: "'Space Mono', monospace",
        width: '500px',
        maxWidth: '90vw',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs uppercase font-bold">TOPIA_NOTE_001</div>
        <button
          onClick={(e) => handleButtonClick(e, handleClose)}
          className="text-xs uppercase font-bold hover:opacity-70 transition-opacity cursor-pointer"
          style={{ marginTop: '-2px' }}
        >
          CLOSE ×
        </button>
      </div>
      <div className="text-xs leading-relaxed whitespace-pre-line">
        {`TOPIA IS A CREATIVE EMPOWERMENT ENGINE AND NETWORK, BUILT FOR AND BY THE CURIOUS AND CREATIVE.

IT BEGINS WITH THE QUESTION, "WHAT IF THE CREATIVE COMMUNITY BUILT ITS OWN OPEN SOURCE UNIVERSE, A CONSTELLATION OF WORLDS DESIGNED FOR CONNECTION, COLLABORATION, AND CREATIVE SOVEREIGNTY?"

CONTINUING THE BRIDGE BETWEEN CULTURE AND EMERGING CREATIVE TECH, TOPIA FOSTERS ECOSYSTEMS WHERE ARTISTRY, INNOVATION, AND COMMUNITY THRIVE TOGETHER.

FOR FAR TOO LONG, THE TOOLS AND NETWORKS THAT EMPOWER ARTISTS HAVE BEEN SCATTERED, GATEKEPT OR HIDDEN. TOPIA UNITES CREATIVES IN ONE HOME, ONE SPACE WHERE WE CAN TAKE OUR FIRST ENTRUSTED STEP TOWARD SOVEREIGNTY, AND OUR SUPPORTERS CAN EXPLORE AND BECOME A PART OF THE UNIVERSES WE BUILD.

WITH OUR BEGINNINGS AS A COMMUNITY ZOOM CALL AND EVENT, TOPIA IS ANCHORED BY A CREATIVE GRAPH AND HUB. TOPIA CONNECTS ARTISTS WITH PATRONS, COLLABORATORS, FANS AND COMMUNITIES THROUGH A SUITE OF TOOLS CREATED BY AND APPROVED BY ME/YOU/US. WITH TOPIA TV, AUDIENCES CAN WATCH, LISTEN, AND DISCOVER NEW CREATIVE WORLDS WHILE COMMUNITY EVENTS TIE`}
      </div>
    </div>
  );
}
