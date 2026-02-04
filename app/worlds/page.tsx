'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

interface WorldCard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  country: string | null;
  dateAdded: string | null;
  creatorName: string | null;
  creatorSlug: string | null;
  creatorCountry: string | null;
}

interface World {
  id: string;
  name: string;
  description: string;
  builtBy: string;
  tools?: string[];
  collaborators?: string[];
  image: string;
  orbitIndex: number;
  orbitAngle: number;
  orbitTilt: number;
  orbitRotation: number;
  orbitRadius: number;
}

interface Point3D { x: number; y: number; z: number; }

// ─── Static orbit configs ────────────────────────────────────────────────────
const orbitConfigs = [
  { radius: 0.18, tilt: 8, rotation: 0 },
  { radius: 0.38, tilt: -6, rotation: 30 },
  { radius: 0.28, tilt: 10, rotation: 60 },
  { radius: 0.48, tilt: -4, rotation: 90 },
  { radius: 0.33, tilt: 12, rotation: 120 },
  { radius: 0.16, tilt: -8, rotation: 150 },
  { radius: 0.52, tilt: 6, rotation: 180 },
  { radius: 0.24, tilt: -10, rotation: 210 },
  { radius: 0.42, tilt: 8, rotation: 240 },
  { radius: 0.55, tilt: -5, rotation: 270 },
  { radius: 0.35, tilt: 10, rotation: 300 },
  { radius: 0.45, tilt: -7, rotation: 330 },
];

// ─── Pure math (no closures, no hooks) ───────────────────────────────────────
function rotatePoint(point: Point3D, rotX: number, rotY: number): Point3D {
  const x = point.x * Math.cos(rotY) - point.z * Math.sin(rotY);
  const z = point.x * Math.sin(rotY) + point.z * Math.cos(rotY);
  const y = point.y;
  return {
    x,
    y: y * Math.cos(rotX) - z * Math.sin(rotX),
    z: y * Math.sin(rotX) + z * Math.cos(rotX),
  };
}

function getOrbitPosition(angle: number, radius: number, tilt: number, rotation: number, time: number): Point3D {
  const currentAngle = angle + time * 0.0003 * (1 + radius * 0.5);
  const x = Math.cos(currentAngle) * radius;
  const z = Math.sin(currentAngle) * radius * 0.85;
  // y = 0 before tilt, so tiltedY = -z * sin(tilt)
  const tiltedY = -z * Math.sin(tilt);
  const tiltedZ = z * Math.cos(tilt);
  return {
    x: x * Math.cos(rotation) - tiltedZ * Math.sin(rotation),
    y: tiltedY,
    z: x * Math.sin(rotation) + tiltedZ * Math.cos(rotation),
  };
}

function buildWorlds(apiWorlds: any[]): World[] {
  return apiWorlds.map((w, i) => {
    const c = orbitConfigs[i % orbitConfigs.length];
    return {
      id: w.slug,
      name: w.title,
      description: w.description || '',
      builtBy: w.creatorName || '',
      tools: w.tools ? w.tools.split(',').map((s: string) => s.trim()) : [],
      collaborators: w.collaborators ? w.collaborators.split(',').map((s: string) => s.trim()) : [],
      image: w.imageUrl || '',
      orbitIndex: i,
      orbitAngle: (i * 0.618 * Math.PI * 2) % (Math.PI * 2),
      orbitTilt: c.tilt * (Math.PI / 180),
      orbitRotation: c.rotation * (Math.PI / 180),
      orbitRadius: c.radius,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorldsPage() {
  // ── refs that the animation loop reads directly (no re-renders) ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const worldsRef = useRef<World[]>([]);
  const worldCardMapRef = useRef<Map<string, WorldCard>>(new Map());
  const isHoveringRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const configRef = useRef({ zoom: 1.0, speed: 1.0 });
  // label DOM nodes – we move them imperatively, no React state per frame
  const labelRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dataLoadedRef = useRef(false);

  // ── React state (only for things that actually need a re-render) ──
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // 0 → 1
  const [config, setConfig] = useState({ zoom: 1.0, speed: 1.0 });
  const [selectedWorldCard, setSelectedWorldCard] = useState<WorldCard | null>(null);
  const [allWorlds, setAllWorlds] = useState<WorldCard[]>([]);
  const [worldKeys, setWorldKeys] = useState<string[]>([]); // just the ids, for rendering label buttons

  // keep configRef in sync
  useEffect(() => { configRef.current = config; }, [config]);
  // keep selectedIdRef in sync
  useEffect(() => { selectedIdRef.current = selectedWorldCard?.id ?? null; }, [selectedWorldCard]);

  // ── Fetch + animated loader ──────────────────────────────────────
  useEffect(() => {
    let progress = 0;
    let dataReady = false;

    // Animate bar: fills to ~80% quickly while waiting, then holds
    const interval = setInterval(() => {
      if (dataReady) {
        // Data is in — race to 100
        progress += 0.08 + Math.random() * 0.12;
      } else {
        // Still waiting — fill toward 80% with diminishing increments
        const remaining = 0.8 - progress;
        progress += remaining * (0.12 + Math.random() * 0.08);
      }

      if (progress >= 1) {
        progress = 1;
        setLoadProgress(1);
        clearInterval(interval);
        // Small pause so user sees the full bar before galaxy pops in
        setTimeout(() => setIsLoaded(true), 180);
        return;
      }
      setLoadProgress(progress);
    }, 60);

    // Fetch worlds — when done, flip the flag so bar races to 100
    fetch('/api/worlds')
      .then(res => res.json())
      .then(data => {
        const apiWorlds = data.worlds || [];
        worldsRef.current = buildWorlds(apiWorlds);
        const cards = apiWorlds.map((w: any) => ({
          id: w.slug, title: w.title, slug: w.slug,
          description: w.description, category: w.category,
          imageUrl: w.imageUrl, country: w.country,
          dateAdded: w.dateAdded, creatorName: w.creatorName,
          creatorSlug: w.creatorSlug, creatorCountry: w.creatorCountry,
        }));
        const map = new Map<string, WorldCard>();
        cards.forEach((c: WorldCard) => map.set(c.id, c));
        worldCardMapRef.current = map;
        setAllWorlds(cards);
        setWorldKeys(cards.map((c: WorldCard) => c.id));
        dataLoadedRef.current = true;
        dataReady = true; // bar will now race to 100
      })
      .catch(err => console.error('Failed to fetch worlds:', err));

    return () => clearInterval(interval);
  }, []);

  // ── Animation loop – runs once, reads everything via refs ────────
  useEffect(() => {
    if (!isLoaded) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    window.addEventListener('resize', resize);

    const animate = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const aspectRatio = width / height;
      const baseScale = aspectRatio > 1.2 ? width * 0.82 : height * 0.75;
      const scale = baseScale * configRef.current.zoom;
      const speed = configRef.current.speed;

      // auto-rotate
      if (!isHoveringRef.current && !isDraggingRef.current) {
        rotationRef.current.y += 0.0015 * speed;
      }
      // momentum decay
      if (!isDraggingRef.current) {
        rotationRef.current.x += velocityRef.current.x;
        rotationRef.current.y += velocityRef.current.y;
        velocityRef.current.x *= 0.92;
        velocityRef.current.y *= 0.92;
      }
      timeRef.current += speed;

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;
      const time = timeRef.current;
      const worlds = worldsRef.current;
      const selectedId = selectedIdRef.current;

      // ── clear
      ctx.clearRect(0, 0, width, height);

      // ── draw orbit paths (batch by opacity bucket to minimise strokeStyle changes)
      // Pre-compute all orbit segments with their screen positions + depths
      const uniqueOrbits = new Map<string, { radius: number; tilt: number; rotation: number }>();
      worlds.forEach(w => {
        const key = `${w.orbitRadius.toFixed(2)}-${w.orbitTilt.toFixed(2)}-${w.orbitRotation.toFixed(2)}`;
        if (!uniqueOrbits.has(key)) uniqueOrbits.set(key, { radius: w.orbitRadius, tilt: w.orbitTilt, rotation: w.orbitRotation });
      });

      // Draw each orbit as a single path with uniform opacity (average depth)
      // This collapses 64 stroke() calls per orbit → 1 stroke() call per orbit
      uniqueOrbits.forEach(({ radius, tilt, rotation }) => {
        ctx.beginPath();
        let totalDepth = 0;
        const segments = 48; // reduced from 64 – imperceptible difference
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const pos = getOrbitPosition(angle, radius, tilt, rotation, 0);
          const rot = rotatePoint(pos, rotX, rotY);
          totalDepth += (rot.z + 1) / 2;
          if (i === 0) ctx.moveTo(centerX + rot.x * scale, centerY - rot.y * scale);
          else ctx.lineTo(centerX + rot.x * scale, centerY - rot.y * scale);
        }
        const avgOpacity = 0.1 + (totalDepth / (segments + 1)) * 0.25;
        ctx.strokeStyle = `rgba(26,26,26,${avgOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // ── draw planet dots
      worlds.forEach(world => {
        const pos = getOrbitPosition(world.orbitAngle, world.orbitRadius, world.orbitTilt, world.orbitRotation, time);
        const rot = rotatePoint(pos, rotX, rotY);
        const screenX = centerX + rot.x * scale;
        const screenY = centerY - rot.y * scale;
        const depth = (rot.z + 1) / 2;
        const isSelected = world.id === selectedId;

        ctx.beginPath();
        ctx.arc(screenX, screenY, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(26,26,26,1)' : `rgba(26,26,26,${0.3 + depth * 0.7})`;
        ctx.fill();
      });

      // ── move label buttons imperatively (zero React re-renders)
      worlds.forEach(world => {
        const pos = getOrbitPosition(world.orbitAngle, world.orbitRadius, world.orbitTilt, world.orbitRotation, time);
        const rot = rotatePoint(pos, rotX, rotY);
        const screenX = centerX + rot.x * scale;
        const screenY = centerY - rot.y * scale;
        const depth = rot.z;
        const buttonScale = 0.8 + (depth + 1) * 0.2;
        const isSelected = world.id === selectedId;
        const displayScale = isSelected ? buttonScale * 1.15 : buttonScale;
        const opacity = isSelected ? 1 : 0.3 + ((depth + 1) / 2) * 0.7;
        const zIndex = isSelected ? 500 : Math.floor((depth + 1) * 100);

        const el = labelRefs.current.get(world.id);
        if (!el) return;
        el.style.transform = `translate3d(${screenX}px,${screenY + 12}px,0) translate(-50%,0) scale(${displayScale})`;
        el.style.opacity = String(opacity);
        el.style.zIndex = String(zIndex);
        el.style.backgroundColor = isSelected ? '#1a1a1a' : 'rgba(26,26,26,0.7)';
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isLoaded]); // only dep: isLoaded — loop runs forever after, reads everything via refs

  // ── Mouse / touch handlers ────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    isDraggingRef.current = true;
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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#f5f0e8' }}>
      <Navigation currentPage="worlds" />

      {/* Galaxy viewport */}
      <div className="relative w-full overflow-hidden" style={{ height: '100vh' }}>

        {/* Loader – animated bar until data arrives + bar finishes */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
          style={{ zIndex: 100, opacity: isLoaded ? 0 : 1, pointerEvents: isLoaded ? 'none' : 'auto' }}
        >
          <div className="text-center font-mono text-sm" style={{ color: '#1a1a1a' }}>
            <div>LOADING WORLDS</div>
            <div className="mt-3 tracking-widest">
              {'█'.repeat(Math.floor(loadProgress * 16))}{'░'.repeat(16 - Math.floor(loadProgress * 16))}
            </div>
          </div>
        </div>

        {/* Galaxy container */}
        <div
          ref={containerRef}
          className={`relative select-none touch-none ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          style={{ width: '100%', height: '100%', cursor: 'grab', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseEnter={() => { isHoveringRef.current = true; }}
          onMouseLeave={() => { isHoveringRef.current = false; isDraggingRef.current = false; }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas ref={canvasRef} className="absolute inset-0 touch-none" style={{ willChange: 'transform' }} />

          {/* Label buttons – rendered once per world key, moved imperatively */}
          {worldKeys.map((id) => {
            const world = worldsRef.current.find(w => w.id === id);
            if (!world) return null;
            return (
              <button
                key={id}
                ref={(el) => { if (el) labelRefs.current.set(id, el); else labelRefs.current.delete(id); }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedWorldCard?.id === id) {
                    setSelectedWorldCard(null);
                  } else {
                    setSelectedWorldCard(worldCardMapRef.current.get(id) ?? null);
                  }
                }}
                className="absolute font-mono text-[9px] sm:text-[10px] px-2 py-1 whitespace-nowrap cursor-pointer touch-manipulation"
                style={{
                  left: 0, top: 0,
                  transform: 'translate3d(0,0,0)',
                  transformOrigin: 'center top',
                  color: '#f5f0e8',
                  pointerEvents: 'auto',
                  willChange: 'transform',
                }}
              >
                {world.name}
              </button>
            );
          })}
        </div>

        {/* Controls Panel */}
        <div
          className={`absolute bottom-5 left-5 font-mono text-[9px] sm:text-[11px] p-2 sm:p-3 border z-50 transition-all duration-500 ${isLoaded && !selectedWorldCard ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ color: '#1a1a1a', backgroundColor: '#f5f0e8', borderColor: '#1a1a1a' }}
        >
          <label className="flex items-center justify-between gap-3 mb-2">
            SIZE
            <input type="range" min="30" max="120" value={config.zoom * 100}
              onChange={(e) => setConfig(prev => ({ ...prev, zoom: parseInt(e.target.value) / 100 }))}
              className="w-20 h-0.5 appearance-none cursor-pointer" style={{ background: '#1a1a1a', accentColor: '#1a1a1a' }} />
          </label>
          <label className="flex items-center justify-between gap-3">
            SPEED
            <input type="range" min="0" max="200" value={config.speed * 100}
              onChange={(e) => setConfig(prev => ({ ...prev, speed: parseInt(e.target.value) / 100 }))}
              className="w-20 h-0.5 appearance-none cursor-pointer" style={{ background: '#1a1a1a', accentColor: '#1a1a1a' }} />
          </label>
        </div>
      </div>

      {/* ── ALL WORLDS GRID ── */}
      <section style={{ backgroundColor: '#f5f0e8' }}>
        <div className="flex justify-center py-5">
          {selectedWorldCard ? (
            <div className="flex items-center gap-2 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <span>{selectedWorldCard.title}</span>
              <button onClick={() => setSelectedWorldCard(null)} className="hover:opacity-60 transition text-[13px] leading-none" aria-label="Clear selection">×</button>
            </div>
          ) : (
            <span className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>ALL WORLDS</span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid #1a1a1a', borderLeft: '1px solid #1a1a1a' }}>
          {(selectedWorldCard ? [selectedWorldCard] : allWorlds).map((world) => (
            <Link
              key={world.id}
              href={`/worlds/${world.slug}`}
              onClick={(e) => { if (!selectedWorldCard) { e.preventDefault(); setSelectedWorldCard(world); } }}
              className="group block relative"
              style={{ borderRight: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', backgroundColor: '#f5f0e8' }}
            >
              <div className="w-full overflow-hidden" style={{ aspectRatio: '1', backgroundColor: '#d9d4cc' }}>
                {world.imageUrl && <img src={world.imageUrl} alt={world.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-3 sm:p-4 flex justify-between items-end" style={{ minHeight: '80px' }}>
                <h3 className="font-mono text-[15px] sm:text-[18px] font-bold uppercase leading-tight" style={{ color: '#1a1a1a' }}>{world.title}</h3>
                <span className="font-mono text-[18px] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" style={{ color: '#1a1a1a' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
