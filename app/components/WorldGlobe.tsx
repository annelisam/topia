'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  url?: string | null;
}

interface SphereItem extends ProjectItem {
  theta: number;
  phi: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface WorldGlobeProps {
  projects: ProjectItem[];
  onSelectProject?: (project: ProjectItem | null) => void;
  selectedProjectSlug?: string | null;
}

function rotatePoint(p: Point3D, rx: number, ry: number): Point3D {
  const x = p.x * Math.cos(ry) - p.z * Math.sin(ry);
  const z = p.x * Math.sin(ry) + p.z * Math.cos(ry);
  return {
    x,
    y: p.y * Math.cos(rx) - z * Math.sin(rx),
    z: p.y * Math.sin(rx) + z * Math.cos(rx),
  };
}

function s2c(theta: number, phi: number, r: number): Point3D {
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

export default function WorldGlobe({
  projects,
  onSelectProject,
  selectedProjectSlug,
}: WorldGlobeProps) {
  const items = useMemo(() => {
    const gr = (1 + Math.sqrt(5)) / 2;
    return projects.map((proj, i) => ({
      ...proj,
      theta: (2 * Math.PI * i) / gr,
      phi: Math.acos(1 - (2 * (i + 0.5)) / projects.length),
    }));
  }, [projects]);

  const [buttonPositions, setButtonPositions] = useState<{ item: SphereItem; x: number; y: number; z: number; scale: number; radius: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const isHoveringButtonRef = useRef(false);
  const itemsRef = useRef(items);

  useEffect(() => { itemsRef.current = items; }, [items]);

  const rotateToItem = useCallback((item: SphereItem) => {
    const p = s2c(item.theta, item.phi, 1);
    const ry = -Math.atan2(p.x, p.z);
    const rz = p.x * Math.sin(ry) + p.z * Math.cos(ry);
    targetRotationRef.current = { x: Math.atan2(p.y, rz), y: ry };
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DENSITY = 10;
    const STEP = 4;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    window.addEventListener('resize', resize);

    const animate = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      // Use nearly the full container — 46% gives a big globe
      const radius = Math.min(w, h) * 0.46;

      if (targetRotationRef.current && !isDraggingRef.current) {
        const t = targetRotationRef.current;
        const dx = t.x - rotationRef.current.x;
        const dy = t.y - rotationRef.current.y;
        rotationRef.current.x += dx * 0.08;
        rotationRef.current.y += dy * 0.08;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) targetRotationRef.current = null;
      }

      // No auto-rotate — user drags to rotate
      if (!isDraggingRef.current && !targetRotationRef.current) {
        rotationRef.current.x += velocityRef.current.x;
        rotationRef.current.y += velocityRef.current.y;
        velocityRef.current.x *= 0.93;
        velocityRef.current.y *= 0.93;
      }

      const rx = rotationRef.current.x;
      const ry = rotationRef.current.y;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      // Read foreground for wireframe color
      const style = getComputedStyle(container);
      const fg = style.getPropertyValue('--foreground').trim() || '#1a1a1a';
      let wireR = 26, wireG = 26, wireB = 26;
      if (fg.startsWith('#')) {
        const hex = fg.replace('#', '');
        if (hex.length === 6) {
          wireR = parseInt(hex.slice(0, 2), 16);
          wireG = parseInt(hex.slice(2, 4), 16);
          wireB = parseInt(hex.slice(4, 6), 16);
        }
      }

      // Latitude lines
      for (let lat = DENSITY; lat < 180; lat += DENSITY) {
        const phi = (lat * Math.PI) / 180;
        ctx.beginPath();
        for (let lon = 0; lon <= 360; lon += STEP) {
          const p = rotatePoint(s2c((lon * Math.PI) / 180, phi, radius), rx, ry);
          if (lon === 0) ctx.moveTo(cx + p.x, cy - p.y);
          else ctx.lineTo(cx + p.x, cy - p.y);
        }
        const tp = rotatePoint(s2c(0, phi, radius), rx, ry);
        ctx.strokeStyle = `rgba(${wireR},${wireG},${wireB},${0.06 + ((tp.z + radius) / (2 * radius)) * 0.25})`;
        ctx.stroke();
      }

      // Longitude lines
      for (let lon = 0; lon < 360; lon += DENSITY) {
        const theta = (lon * Math.PI) / 180;
        ctx.beginPath();
        for (let lat = 0; lat <= 180; lat += STEP) {
          const p = rotatePoint(s2c(theta, (lat * Math.PI) / 180, radius), rx, ry);
          if (lat === 0) ctx.moveTo(cx + p.x, cy - p.y);
          else ctx.lineTo(cx + p.x, cy - p.y);
        }
        const tp = rotatePoint(s2c(theta, Math.PI / 2, radius), rx, ry);
        ctx.strokeStyle = `rgba(${wireR},${wireG},${wireB},${0.06 + ((tp.z + radius) / (2 * radius)) * 0.25})`;
        ctx.stroke();
      }

      const positions = itemsRef.current.map((item) => {
        const p = rotatePoint(s2c(item.theta, item.phi, radius), rx, ry);
        return {
          item,
          x: cx + p.x,
          y: cy - p.y,
          z: p.z,
          scale: 0.8 + (p.z + radius) / (2 * radius) * 0.3,
          radius,
        };
      });
      positions.sort((a, b) => a.z - b.z);
      setButtonPositions(positions);

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    isDraggingRef.current = true;
    targetRotationRef.current = null;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    rotationRef.current.y += dx * 0.004;
    rotationRef.current.x += dy * 0.004;
    velocityRef.current = {
      x: velocityRef.current.x * 0.5 + dy * 0.0015,
      y: velocityRef.current.y * 0.5 + dx * 0.0015,
    };
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      targetRotationRef.current = null;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { x: 0, y: 0 };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMouseRef.current.x;
    const dy = e.touches[0].clientY - lastMouseRef.current.y;
    rotationRef.current.y += dx * 0.004;
    rotationRef.current.x += dy * 0.004;
    velocityRef.current = {
      x: velocityRef.current.x * 0.5 + dy * 0.0015,
      y: velocityRef.current.y * 0.5 + dx * 0.0015,
    };
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(() => { isDraggingRef.current = false; }, []);

  return (
    <div
      ref={containerRef}
      className="relative select-none w-full h-full touch-none overflow-hidden"
      style={{ cursor: 'grab', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { isDraggingRef.current = false; }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" style={{ willChange: 'transform' }} />

      {buttonPositions.map(({ item, x, y, z, scale, radius }) => {
        const opacity = 0.1 + ((z + radius) / (2 * radius)) * 0.9;
        const isFront = z > 0;
        const isSelected = selectedProjectSlug === item.slug;

        return (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isFront) {
                if (isSelected) onSelectProject?.(null);
                else { onSelectProject?.(item); rotateToItem(item as SphereItem); }
              } else {
                rotateToItem(item as SphereItem);
              }
            }}
            className="absolute whitespace-nowrap cursor-pointer rounded-full font-bold tracking-wider"
            style={{
              fontFamily: "'GT Zirkon', var(--font-space-mono), monospace",
              fontSize: '11px',
              padding: '6px 14px',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              backgroundColor: isSelected ? 'var(--foreground)' : 'var(--color-yellow)',
              color: isSelected ? 'var(--background)' : '#1a1a1a',
              border: isSelected ? '2px solid var(--foreground)' : '1.5px solid rgba(0,0,0,0.1)',
              opacity,
              zIndex: Math.floor(((z + radius) / (2 * radius)) * 30),
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              isHoveringButtonRef.current = true;
              e.currentTarget.style.transform = `translate(-50%, -50%) scale(${scale * 1.1})`;
            }}
            onMouseLeave={(e) => {
              isHoveringButtonRef.current = false;
              e.currentTarget.style.transform = `translate(-50%, -50%) scale(${scale})`;
            }}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
