'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────
interface World {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  imageUrl: string;
  country: string;
  creatorName: string;
}

interface ToolUser {
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface Tool {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  featured: boolean;
  url: string;
  userCount: number;
  users: ToolUser[];
}

interface Event {
  id: number;
  eventName: string;
  slug: string;
  description: string;
  date: string;
  dateIso: string;
  city: string;
  imageUrl: string;
  rsvpCount: number;
  startTime: string;
}

// ─── Binary Rain Canvas (Matrix-style) ──────────────────────────
function BinaryRain({ height = 200 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth * 2); // 2x for retina
    let h = (canvas.height = height * 2);
    canvas.style.width = canvas.offsetWidth + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(2, 2);

    const fontSize = 12;
    const colW = fontSize + 2;
    const cols = Math.ceil((w / 2) / colW);
    const trailLen = 12;

    // Each column: current head position + buffer of previous chars
    const columns: { y: number; speed: number; chars: string[] }[] = [];
    for (let i = 0; i < cols; i++) {
      const chars: string[] = [];
      for (let j = 0; j < trailLen; j++) {
        chars.push(Math.random() > 0.5 ? '1' : '0');
      }
      columns.push({
        y: Math.random() * -(h / 2) / fontSize,
        speed: 0.4 + Math.random() * 0.8,
        chars,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w / 2, h / 2);
      const fg = getComputedStyle(canvas).color;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < cols; i++) {
        const col = columns[i];

        // Draw trail characters with decreasing opacity
        for (let j = 0; j < trailLen; j++) {
          const charY = (col.y - j) * fontSize;
          if (charY < 0 || charY > h / 2) continue;

          const alpha = (1 - j / trailLen) * 0.12;
          ctx.fillStyle = fg
            .replace(')', `, ${alpha})`)
            .replace('rgb(', 'rgba(');
          ctx.fillText(col.chars[j], i * colW, charY);
        }

        // Advance
        col.y += col.speed;

        // Randomly mutate a trail char
        if (Math.random() > 0.9) {
          const idx = Math.floor(Math.random() * trailLen);
          col.chars[idx] = Math.random() > 0.5 ? '1' : '0';
        }

        // Reset when fully past bottom
        if ((col.y - trailLen) * fontSize > h / 2) {
          col.y = Math.random() * -10;
          col.speed = 0.4 + Math.random() * 0.8;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth * 2;
      h = canvas.height = height * 2;
      ctx.scale(2, 2);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full pointer-events-none"
      style={{ height, color: 'var(--foreground)', background: 'transparent' }}
    />
  );
}

// ─── Mini Wireframe Sphere ───────────────────────────────────────
function MiniSphere({ size = 48 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = size * 2; // retina
    canvas.width = s;
    canvas.height = s;
    ctx.scale(2, 2);

    let angle = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const fg = getComputedStyle(canvas).color;
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;

      ctx.strokeStyle = fg.replace(')', ', 0.3)').replace('rgb(', 'rgba(');
      ctx.lineWidth = 0.5;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Latitude lines
      for (let lat = -2; lat <= 2; lat++) {
        const y = cy + (lat / 3) * r;
        const rx = Math.sqrt(r * r - (lat / 3 * r) ** 2);
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, rx * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating longitude lines
      for (let lon = 0; lon < 3; lon++) {
        const a = angle + (lon * Math.PI) / 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(Math.cos(a)) * r, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      angle += 0.008;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className="inline-block flex-shrink-0"
      style={{ width: size, height: size, color: 'var(--foreground)' }}
    />
  );
}

// ─── Scroll Reveal (staggered cinematic) ─────────────────────────
function ScrollReveal({
  children,
  className = '',
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hiddenClass =
    direction === 'left'
      ? 'opacity-0 -translate-x-16'
      : direction === 'right'
        ? 'opacity-0 translate-x-16'
        : 'opacity-0 translate-y-20';

  return (
    <div
      ref={ref}
      className={`transition-all duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : hiddenClass
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Orbital Carousel (click-drag only) ──────────────────────────
function OrbitalCarousel({
  children,
  radius = 320,
}: {
  children: React.ReactNode[];
  radius?: number;
}) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animRef = useRef<number>(0);
  const totalDragDist = useRef(0);

  const count = children.length;
  const angleStep = 360 / count;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const r = isMobile ? Math.min(radius, 160) : radius;

  useEffect(() => {
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = now - prev;
      prev = now;
      if (!isDragging && Math.abs(velocity) > 0.005) {
        setRotation((rot) => rot + velocity * dt);
        setVelocity((v) => v * 0.96);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isDragging, velocity]);

  const startDrag = (clientX: number) => {
    setIsDragging(true);
    setHasDragged(false);
    setVelocity(0);
    setDragStart(clientX);
    setDragRotation(rotation);
    totalDragDist.current = 0;
    lastX.current = clientX;
    lastTime.current = performance.now();
  };

  const moveDrag = (clientX: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart;
    totalDragDist.current += Math.abs(clientX - lastX.current);
    if (totalDragDist.current > 8) setHasDragged(true);
    setRotation(dragRotation + dx * 0.3);
    const now = performance.now();
    const dtMs = now - lastTime.current;
    if (dtMs > 0) setVelocity(((clientX - lastX.current) / dtMs) * 0.3);
    lastX.current = clientX;
    lastTime.current = now;
  };

  return (
    <div
      className="relative mx-auto select-none cursor-grab active:cursor-grabbing"
      style={{
        width: r * 2 + (isMobile ? 100 : 200),
        height: isMobile ? 340 : 420,
        perspective: 1200,
        maxWidth: '100vw',
        touchAction: 'pan-y',
      }}
      onMouseDown={(e) => startDrag(e.clientX)}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => { if (isDragging) setIsDragging(false); }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
      onTouchEnd={() => setIsDragging(false)}
      onClickCapture={(e) => {
        if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children.map((child, i) => {
          const angle = (angleStep * i + rotation) % 360;
          const rad = (angle * Math.PI) / 180;
          const x = Math.sin(rad) * r;
          const z = Math.cos(rad) * r;
          const depthNorm = (z + r) / (2 * r);
          const scale = 0.55 + 0.45 * depthNorm;
          const opacity = 0.2 + 0.8 * depthNorm;
          const blur = depthNorm > 0.85 ? 0 : (1 - depthNorm) * 5;

          return (
            <div
              key={i}
              className="absolute"
              style={{
                transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
                opacity,
                filter: blur > 0.1 ? `blur(${blur}px)` : 'none',
                zIndex: Math.round(z + r),
                willChange: 'transform, opacity, filter',
                pointerEvents: z > 0 ? 'auto' : 'none',
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Draggable 2-row ticker for Tools ────────────────────────────
function ToolsTicker({ tools }: { tools: Tool[] }) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const totalDrag = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      if (!isDragging && Math.abs(velocity) > 0.3) {
        setOffset((o) => o + velocity);
        setVelocity((v) => v * 0.95);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isDragging, velocity]);

  const startDrag = (clientX: number) => {
    setIsDragging(true);
    setHasDragged(false);
    setVelocity(0);
    dragStartX.current = clientX;
    dragStartOffset.current = offset;
    totalDrag.current = 0;
    lastX.current = clientX;
    lastTime.current = performance.now();
  };

  const moveDrag = (clientX: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartX.current;
    totalDrag.current += Math.abs(clientX - lastX.current);
    if (totalDrag.current > 8) setHasDragged(true);
    setOffset(dragStartOffset.current + dx);
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) setVelocity(((clientX - lastX.current) / dt) * 12);
    lastX.current = clientX;
    lastTime.current = now;
  };

  const mid = Math.ceil(tools.length / 2);
  const row1 = tools.slice(0, mid);
  const row2 = tools.slice(mid);
  const loop = (arr: Tool[]) => [...arr, ...arr, ...arr, ...arr, ...arr];
  const cardW = 336;
  const wrap = (val: number, width: number) => {
    if (width <= 0) return 0;
    return ((val % width) + width) % width - width * 2;
  };
  const pos1 = wrap(offset, row1.length * cardW);
  const pos2 = wrap(-offset * 0.8, row2.length * cardW);

  return (
    <div
      className="overflow-hidden py-4 select-none cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => startDrag(e.clientX)}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => { if (isDragging) setIsDragging(false); }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
      onTouchEnd={() => setIsDragging(false)}
      onClickCapture={(e) => {
        if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
      }}
    >
      <div
        className="flex gap-4 mb-5"
        style={{ transform: `translateX(${pos1}px)`, willChange: 'transform' }}
      >
        {loop(row1).map((tool, i) => (
          <ToolTickerCard key={`r1-${i}`} tool={tool} />
        ))}
      </div>
      <div
        className="flex gap-4"
        style={{ transform: `translateX(${pos2}px)`, willChange: 'transform' }}
      >
        {loop(row2).map((tool, i) => (
          <ToolTickerCard key={`r2-${i}`} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function ToolTickerCard({ tool }: { tool: Tool }) {
  const firstTag = tool.category.split(',')[0]?.trim();
  return (
    <Link
      href={`/resources/tools/${tool.slug}`}
      className="block group flex-shrink-0"
      draggable={false}
    >
      <div
        className="w-[260px] md:w-[320px] p-4 md:p-5 transition-all duration-300 group-hover:translate-y-[-4px]"
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: 20,
          background: 'var(--surface)',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div
            className="uppercase tracking-wide font-bold text-sm"
            style={{ fontFamily: "'Basement Grotesque', sans-serif" }}
          >
            {tool.name}
          </div>
          {tool.featured && (
            <span
              className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              ★
            </span>
          )}
        </div>
        <p
          className="text-xs line-clamp-2 leading-relaxed mb-4"
          style={{ color: 'var(--muted)' }}
        >
          {tool.description}
        </p>
        <div className="flex items-center justify-between">
          {firstTag && (
            <span
              className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ border: '1px solid var(--border-color)', color: 'var(--muted)' }}
            >
              {firstTag}
            </span>
          )}
          {tool.users && tool.users.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {tool.users.slice(0, 4).map((user, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[8px] uppercase font-bold"
                    style={{
                      border: '2px solid var(--surface)',
                      background: user.avatarUrl ? 'transparent' : 'var(--foreground)',
                      color: 'var(--background)',
                    }}
                    title={user.name || user.username || ''}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.name || user.username || '?')[0]
                    )}
                  </div>
                ))}
              </div>
              {tool.userCount > 4 && (
                <span className="text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
                  +{tool.userCount - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── World Card ──────────────────────────────────────────────────
function WorldCard({ world }: { world: World }) {
  return (
    <Link href={`/worlds/${world.slug}`} className="block group" draggable={false}>
      <div
        className="w-[240px] md:w-[280px] overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]"
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: 20,
          background: 'var(--surface)',
        }}
      >
        <div className="relative h-[160px] md:h-[200px] overflow-hidden">
          {world.imageUrl ? (
            <img
              src={world.imageUrl}
              alt={world.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ background: 'var(--surface-hover)' }}
            >
              ◆
            </div>
          )}
          <div
            className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full"
            style={{ background: 'var(--color-yellow)', color: '#1a1a1a' }}
          >
            {world.category}
          </div>
        </div>
        <div className="p-3 md:p-4">
          <div
            className="text-sm uppercase tracking-wide mb-1 font-bold"
            style={{ fontFamily: "'Basement Grotesque', sans-serif" }}
          >
            {world.title}
          </div>
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {world.description}
          </p>
          <div
            className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--muted)' }}
          >
            <span>{world.creatorName}</span>
            {world.country && (
              <>
                <span>·</span>
                <span>{world.country}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Editorial Title ─────────────────────────────────────────────
function EditorialTitle({
  children,
  size = 'xl',
}: {
  children: React.ReactNode;
  size?: 'xl' | 'xxl';
}) {
  return (
    <div
      className="uppercase leading-[0.8]"
      style={{
        fontFamily: "'Basement Grotesque', sans-serif",
        fontSize:
          size === 'xxl'
            ? 'clamp(5rem, 22vw, 18rem)'
            : 'clamp(4rem, 15vw, 12rem)',
        letterSpacing: '-0.07em',
      }}
      role="heading"
      aria-level={2}
    >
      {children}
    </div>
  );
}

// ─── Fanning Card Deck for Events ────────────────────────────────
function EventCardDeck({ events }: { events: Event[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fanProgress, setFanProgress] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = 1 - (rect.bottom - vh * 0.5) / (rect.height + vh * 0.3);
      setFanProgress(Math.max(0, Math.min(1, raw)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const count = events.length;
  const spread = isMobile ? 60 : 150;
  const angleMul = isMobile ? 5 : 7;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex items-center justify-center"
      style={{ height: isMobile ? 400 : 500, maxWidth: '100vw' }}
    >
      {events.map((event, i) => {
        const centerOffset = i - (count - 1) / 2;
        const angle = centerOffset * angleMul * fanProgress;
        const x = centerOffset * spread * fanProgress;
        const y = Math.abs(centerOffset) * (isMobile ? 8 : 14) * fanProgress;
        const isHovered = hoveredIndex === i;
        const isBehind = hoveredIndex !== null && hoveredIndex !== i;
        const isPast = event.dateIso && new Date(event.dateIso) < new Date();

        return (
          <Link
            key={event.id || i}
            href={`/events/${event.slug}`}
            className="absolute block"
            style={{
              transform: `translateX(${x}px) translateY(${y}px) rotate(${
                isHovered ? 0 : angle
              }deg) scale(${isHovered ? 1.08 : 1})`,
              transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
              zIndex: isHovered ? 50 : count - Math.abs(Math.round(centerOffset)),
              filter: isBehind ? 'brightness(0.9)' : 'none',
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="w-[220px] md:w-[280px] overflow-hidden"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 20,
                background: 'var(--surface)',
                opacity: isPast ? 0.6 : 1,
                boxShadow: isHovered
                  ? '0 24px 64px rgba(0,0,0,0.18)'
                  : '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              <div className="relative h-[140px] md:h-[180px] overflow-hidden">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.eventName}
                    className="w-full h-full object-cover"
                    style={{ filter: isPast ? 'grayscale(1)' : 'none' }}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                  >
                    ✦
                  </div>
                )}
                {isPast && (
                  <div
                    className="absolute top-2 right-2 px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full"
                    style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                  >
                    Past
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 md:px-4 py-2 text-[10px] md:text-[11px] uppercase tracking-widest font-bold"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    color: '#fff',
                  }}
                >
                  {event.date || event.dateIso?.split('T')[0]}
                  {event.startTime && ` · ${event.startTime}`}
                </div>
              </div>
              <div className="p-3 md:p-4">
                <div
                  className="text-xs md:text-sm uppercase tracking-wide mb-2 line-clamp-1 font-bold"
                  style={{ fontFamily: "'Basement Grotesque', sans-serif" }}
                >
                  {event.eventName}
                </div>
                <div className="flex items-center justify-between">
                  {event.city && (
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                      {event.city}
                    </span>
                  )}
                  {event.rsvpCount > 0 && (
                    <span
                      className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-yellow)', color: '#1a1a1a' }}
                    >
                      {event.rsvpCount} going
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export default function HomepageSections() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [wRes, tRes, eRes] = await Promise.all([
          fetch('/api/worlds'),
          fetch('/api/tools'),
          fetch('/api/events'),
        ]);
        const [wData, tData, eData] = await Promise.all([
          wRes.json(),
          tRes.json(),
          eRes.json(),
        ]);

        setWorlds((wData.worlds || []).slice(0, 8));

        const sortedTools = (tData.tools || [])
          .sort((a: Tool, b: Tool) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return (b.userCount || 0) - (a.userCount || 0);
          })
          .slice(0, 14);
        setTools(sortedTools);

        const now = new Date().toISOString();
        const allEvents = eData.events || [];
        const upcoming = allEvents.filter((e: Event) => e.dateIso >= now).slice(0, 6);
        const past = allEvents.filter((e: Event) => e.dateIso < now).reverse().slice(0, 2);
        setEvents([...upcoming, ...past].slice(0, 6));

        setLoaded(true);
      } catch (err) {
        console.error('Failed to fetch homepage data:', err);
        setLoaded(true);
      }
    }
    fetchAll();
  }, []);

  if (!loaded) return null;

  const padded = <T,>(arr: T[], min: number): T[] => {
    if (arr.length === 0) return [];
    while (arr.length < min) arr = [...arr, ...arr];
    return arr.slice(0, Math.max(min, arr.length));
  };

  const worldItems = padded(worlds, 5);

  return (
    <div className="relative pb-32 overflow-x-hidden">
      {/* Spacer from hero */}
      <div className="h-16 md:h-20" />

      {/* ═══════════════════════════════════════════════════════════
          WORLDS — massive title + overlapping carousel
          ═══════════════════════════════════════════════════════════ */}
      {worldItems.length > 0 && (
        <div className="mb-20 md:mb-32">
          {/* Title block */}
          <ScrollReveal direction="left">
            <div className="px-6 md:px-12 relative z-20 pointer-events-none">
              <div role="heading" aria-level={2} className="uppercase relative">
                <span
                  className="block leading-[0.85]"
                  style={{
                    fontFamily: "'Basement Grotesque', sans-serif",
                    fontSize: 'clamp(1.8rem, 5vw, 4rem)',
                    letterSpacing: '-0.04em',
                    color: 'var(--muted)',
                  }}
                >
                  The
                </span>
                <span
                  className="block leading-[0.78] flex items-center gap-3 md:gap-5"
                  style={{
                    fontFamily: "'Basement Grotesque', sans-serif",
                    fontSize: 'clamp(5rem, 22vw, 18rem)',
                    letterSpacing: '-0.06em',
                  }}
                >
                  World
                  <span className="inline-block" style={{ fontSize: 0, lineHeight: 0 }}>
                    <MiniSphere size={56} />
                  </span>
                </span>
                <span
                  className="block leading-[0.85] text-right"
                  style={{
                    fontFamily: "'Basement Grotesque', sans-serif",
                    fontSize: 'clamp(1.8rem, 5vw, 4rem)',
                    letterSpacing: '-0.04em',
                    color: 'var(--muted)',
                  }}
                >
                  Is Yours
                </span>
              </div>
            </div>
          </ScrollReveal>

          {/* Carousel overlapping title */}
          <ScrollReveal direction="right" className="relative z-10 -mt-8 md:-mt-16">
            <OrbitalCarousel radius={340}>
              {worldItems.map((w, i) => (
                <WorldCard key={`world-${i}`} world={w} />
              ))}
            </OrbitalCarousel>
          </ScrollReveal>

          <ScrollReveal>
            <div className="px-6 md:px-12 flex items-center justify-between mt-6">
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: 'var(--muted)' }}
              >
                ← Drag to explore →
              </p>
              <Link
                href="/worlds"
                className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                View All →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      )}

      {/* Section gap */}
      <div className="h-6 md:h-10" />

      {/* ═══════════════════════════════════════════════════════════
          TOOLS — massive title + draggable ticker
          ═══════════════════════════════════════════════════════════ */}
      {tools.length > 0 && (
        <div className="mb-20 md:mb-32">
          <ScrollReveal direction="right">
            <div className="px-6 md:px-12 relative z-20 pointer-events-none">
              <EditorialTitle>Tools</EditorialTitle>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" className="-mt-4 md:-mt-8">
            <ToolsTicker tools={tools} />
          </ScrollReveal>

          <ScrollReveal>
            <div className="px-6 md:px-12 flex items-center justify-between mt-2">
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: 'var(--muted)' }}
              >
                ← Drag to browse →
              </p>
              <Link
                href="/resources/tools"
                className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                View All →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      )}

      {/* Section gap */}
      <div className="h-6 md:h-10" />

      {/* ═══════════════════════════════════════════════════════════
          EVENTS — massive title + fanning card deck
          ═══════════════════════════════════════════════════════════ */}
      {events.length > 0 && (
        <div className="mb-20">
          <ScrollReveal direction="left">
            <div className="px-6 md:px-12 relative z-20 pointer-events-none text-right">
              <EditorialTitle>Events</EditorialTitle>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" className="relative z-10 -mt-6 md:-mt-12">
            <EventCardDeck events={events} />
          </ScrollReveal>

          <ScrollReveal>
            <div className="px-6 md:px-12 flex items-center justify-between mt-4">
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: 'var(--muted)' }}
              >
                Hover to peek · Click to RSVP
              </p>
              <Link
                href="/events"
                className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                View All →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      )}
    </div>
  );
}
