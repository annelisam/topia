'use client';

import { useRef, useState, useEffect } from 'react';

export default function DraggableStickyNote() {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile and center the note on initial load
  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    setIsMinimized(mobile); // Start minimized on mobile

    if (position === null) {
      const noteWidth = mobile ? window.innerWidth - 40 : 500;
      const centerX = (window.innerWidth - noteWidth) / 2;
      const centerY = mobile ? 80 : (window.innerHeight - 400) / 2;
      setPosition({ x: Math.max(20, centerX), y: Math.max(80, centerY) });
    }
  }, [position]);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      setPosition(prev => {
        if (!prev) return prev;

        // Constrain to viewport bounds - responsive width
        const noteWidth = isMobile ? window.innerWidth - 40 : 500;
        const maxX = window.innerWidth - noteWidth;
        const maxY = window.innerHeight - 100;

        return {
          x: Math.max(20, Math.min(maxX, prev.x + deltaX)),
          y: Math.max(60, Math.min(maxY, prev.y + deltaY)),
        };
      });

      setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragStart, isMobile]);

  // Handle window resize to keep note in bounds and update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);

      setPosition(prev => {
        if (!prev) return prev;

        const noteWidth = mobile ? window.innerWidth - 40 : 500;
        const maxX = window.innerWidth - noteWidth;
        const maxY = window.innerHeight - 100;

        return {
          x: Math.max(20, Math.min(maxX, prev.x)),
          y: Math.max(60, Math.min(maxY, prev.y)),
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
  };

  const handleClose = () => {
    setIsMinimized(true);
  };

  const handleReopen = () => {
    setIsMinimized(false);
  };

  const handleMinimizedMouseDown = (e: React.MouseEvent) => {
    // Only start dragging, don't open
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMinimizedTouchStart = (e: React.TouchEvent) => {
    // Only start dragging, don't open
    if (e.touches.length > 0) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  if (isMinimized && position) {
    return (
      <div
        className="fixed z-50 shadow-lg cursor-move select-none touch-manipulation"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: '#e4fe52',
          fontFamily: "'Space Mono', monospace",
          width: isMobile ? `${window.innerWidth - 40}px` : '500px',
          padding: isMobile ? '12px' : '16px',
        }}
        onMouseDown={handleMinimizedMouseDown}
        onTouchStart={handleMinimizedTouchStart}
      >
        <div className="flex justify-between items-start">
          <div className={`uppercase font-bold ${isMobile ? 'text-[10px]' : 'text-xs'}`}>TOPIA_NOTE_001</div>
          <button
            onClick={(e) => handleButtonClick(e, handleReopen)}
            className={`uppercase font-bold hover:opacity-70 transition-opacity cursor-pointer ${isMobile ? 'text-[10px]' : 'text-xs'}`}
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
      className="fixed z-50 shadow-lg cursor-move select-none touch-manipulation"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#e4fe52',
        fontFamily: "'Space Mono', monospace",
        width: isMobile ? `${window.innerWidth - 40}px` : '500px',
        padding: isMobile ? '12px' : '16px',
        maxHeight: isMobile ? '70vh' : 'auto',
        overflowY: isMobile ? 'auto' : 'visible',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="flex justify-between items-start mb-2">
        <div className={`uppercase font-bold ${isMobile ? 'text-[10px]' : 'text-xs'}`}>TOPIA_NOTE_001</div>
        <button
          onClick={(e) => handleButtonClick(e, handleClose)}
          className={`uppercase font-bold hover:opacity-70 transition-opacity cursor-pointer ${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ marginTop: '-2px' }}
        >
          CLOSE ×
        </button>
      </div>
      <div className={`leading-relaxed whitespace-pre-line ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
        {`TOPIA IS A CREATIVE EMPOWERMENT ENGINE AND NETWORK, BUILT FOR AND BY THE CURIOUS AND CREATIVE.

IT BEGINS WITH THE QUESTION, "WHAT IF THE CREATIVE COMMUNITY BUILT ITS OWN OPEN SOURCE UNIVERSE, A CONSTELLATION OF WORLDS DESIGNED FOR CONNECTION, COLLABORATION, AND CREATIVE SOVEREIGNTY?"

CONTINUING THE BRIDGE BETWEEN CULTURE AND EMERGING CREATIVE TECH, TOPIA FOSTERS ECOSYSTEMS WHERE ARTISTRY, INNOVATION, AND COMMUNITY THRIVE TOGETHER.

FOR FAR TOO LONG, THE TOOLS AND NETWORKS THAT EMPOWER ARTISTS HAVE BEEN SCATTERED, GATEKEPT OR HIDDEN. TOPIA UNITES CREATIVES IN ONE HOME, ONE SPACE WHERE WE CAN TAKE OUR FIRST ENTRUSTED STEP TOWARD SOVEREIGNTY, AND OUR SUPPORTERS CAN EXPLORE AND BECOME A PART OF THE UNIVERSES WE BUILD.

WITH OUR BEGINNINGS AS A COMMUNITY ZOOM CALL AND EVENT, TOPIA IS ANCHORED BY A CREATIVE GRAPH AND HUB. TOPIA CONNECTS ARTISTS WITH PATRONS, COLLABORATORS, FANS AND COMMUNITIES THROUGH A SUITE OF TOOLS CREATED BY AND APPROVED BY ME/YOU/US. WITH TOPIA TV, AUDIENCES CAN WATCH, LISTEN, AND DISCOVER NEW CREATIVE WORLDS WHILE COMMUNITY EVENTS TIE`}
      </div>
    </div>
  );
}
