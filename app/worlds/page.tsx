'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface World {
  id: string;
  name: string;
  description: string;
  builtBy: string;
  tools?: string[];
  collaborators?: string[];
  image: string;
  orbitIndex: number;
  orbitAngle: number; // Position on the orbit (0 to 2π)
  orbitTilt: number; // Tilt angle of the orbit plane
  orbitRotation: number; // Rotation of orbit around Y axis
  orbitRadius: number; // Distance from center
}

const worldsData = [
  {
    id: 'tash55',
    name: 'TASH55',
    description: 'A living creative studio where music, immersion and evolution blur into one ongoing odyssey of self actualization.',
    builtBy: 'LATASHÁ',
    tools: ['In Process', 'Adobe Photoshop', 'Adobe Premiere', 'Ableton Live', 'Splice', 'Higgsfield AI'],
    collaborators: ['Cy Lee', 'Jahmel Reynolds'],
    image: '/worlds/tash55.jpg',
  },
  {
    id: 'hlmt-cty',
    name: 'HLMT CTY',
    description: 'A transmedia universe that explores the culture and identity of a futuristic metropolis rebuilt after a catastrophic outbreak.',
    builtBy: 'JAH',
    tools: ['In Process', 'Adobe Suite', 'Higgsfield AI', 'Midjourney', 'Runway', 'Nano Banana'],
    collaborators: ['Cy Lee', 'Jahmel Reynolds', 'Segnon Tiewul', 'Latashá'],
    image: '/worlds/hlmt-cty.jpg',
  },
  {
    id: 'eternal-gardens',
    name: 'ETERNAL GARDENS',
    description: 'A sci-fi fantasy epic about a mystical seed with the power to spawn infinite worlds.',
    builtBy: 'TK and Claire Mirran',
    tools: ['In Process', 'Adobe Suite', 'Unreal Engine'],
    collaborators: ['Cy Lee'],
    image: '/worlds/eternal-gardens.jpg',
  },
  {
    id: 'utopian-futurist',
    name: 'UTOPIAN FUTURIST',
    description: 'Exploring the intersection of art, identity, and time. Personal storytelling with visionary thinking to reimagine humanity\'s collective evolution.',
    builtBy: 'Forrest Mortifee',
    tools: ['Substack'],
    collaborators: ['Cy Lee', 'Yuri Rybak'],
    image: '/worlds/utopian-futurist.jpg',
  },
  {
    id: 'forbidden-fruit',
    name: 'FORBIDDEN FRUIT',
    description: 'Creative wellness hub producing immersive experiences for art lovers.',
    builtBy: 'Crux and Stonez',
    image: '/worlds/forbidden-fruit.jpg',
  },
  {
    id: 'zodiac-games',
    name: 'ZODIAC GAMES',
    description: 'Your sign is showing.',
    builtBy: 'Sierra Imari',
    image: '/worlds/zodiac-games.jpg',
  },
  {
    id: 'dacirkus',
    name: 'DACIRKUS',
    description: 'Where analog soul meets digital vision. Production studio for games, animations, and film.',
    builtBy: 'Isaiah Sturge',
    image: '/worlds/dacirkus.jpg',
  },
  {
    id: 'fridays-at-the-park',
    name: 'FRIDAYS AT THE PARK',
    description: 'If you know you know.',
    builtBy: 'The Park',
    image: '/worlds/fridays.jpg',
  },
  {
    id: 'yards',
    name: 'YARDS',
    description: 'A collection of thoughts building a universe.',
    builtBy: 'Black Dave',
    image: '/worlds/yards.jpg',
  },
  {
    id: 'scenes',
    name: 'SCENES',
    description: 'An experiment in what music can be beyond streams—artist-owned, participatory, and built on real connection.',
    builtBy: 'Sound of Fractures',
    image: '/worlds/scenes.jpg',
  },
  {
    id: 'network-archives',
    name: 'NETWORK ARCHIVES',
    description: 'A label dedicated to documenting and exploring the hidden threads that shape new cultural movements.',
    builtBy: 'Sound of Fractures, Cy Lee and Jade',
    image: '/worlds/network-archives.jpg',
  },
  {
    id: 'such-is-life',
    name: 'SUCH IS LIFE UNIVERSITY',
    description: 'An all-encompassing hub for independent artists to connect, collaborate, create, and build community.',
    builtBy: 'Lafayette Stokley',
    image: '/worlds/such-is-life.jpg',
  },
];

// Create orbit configurations for each world - fluid, moderate tilts for smooth rotations
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

const worlds: World[] = worldsData.map((world, i) => {
  const config = orbitConfigs[i % orbitConfigs.length];
  return {
    ...world,
    orbitIndex: i,
    orbitAngle: (i * 0.618 * Math.PI * 2) % (Math.PI * 2),
    orbitTilt: config.tilt * (Math.PI / 180),
    orbitRotation: config.rotation * (Math.PI / 180),
    orbitRadius: config.radius,
  };
});

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export default function WorldsPage() {
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [buttonPositions, setButtonPositions] = useState<{ world: World; x: number; y: number; z: number; scale: number }[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [config, setConfig] = useState({
    zoom: 1.0,
    speed: 1.0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 }); // Start with slight tilt
  const velocityRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const timeRef = useRef(0);
  const sizeRef = useRef(0);

  // Loading simulation
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1 + Math.random() * 0.15;
      if (progress >= 1) {
        progress = 1;
        setLoadProgress(progress);
        clearInterval(interval);
        setTimeout(() => setIsLoaded(true), 200);
      } else {
        setLoadProgress(progress);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // Rotate point around X and Y axes
  const rotatePoint = useCallback((point: Point3D, rotX: number, rotY: number): Point3D => {
    // Rotate around Y axis first
    let x = point.x * Math.cos(rotY) - point.z * Math.sin(rotY);
    let z = point.x * Math.sin(rotY) + point.z * Math.cos(rotY);
    let y = point.y;

    // Then rotate around X axis
    const newY = y * Math.cos(rotX) - z * Math.sin(rotX);
    const newZ = y * Math.sin(rotX) + z * Math.cos(rotX);

    return { x, y: newY, z: newZ };
  }, []);

  // Get position on an elliptical orbit
  const getOrbitPosition = useCallback((
    angle: number,
    radius: number,
    tilt: number,
    rotation: number,
    time: number
  ): Point3D => {
    // Orbit in XZ plane first
    const orbitSpeed = 0.0003 * (1 + radius * 0.5); // Outer orbits slightly faster visual effect
    const currentAngle = angle + time * orbitSpeed;

    // Elliptical orbit (slightly elliptical)
    const ellipseRatio = 0.85;
    const x = Math.cos(currentAngle) * radius;
    const z = Math.sin(currentAngle) * radius * ellipseRatio;
    let y = 0;

    // Apply orbit tilt (rotate around X axis of the orbit plane)
    const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
    const tiltedZ = y * Math.sin(tilt) + z * Math.cos(tilt);

    // Apply orbit rotation (rotate around Y axis)
    const finalX = x * Math.cos(rotation) - tiltedZ * Math.sin(rotation);
    const finalZ = x * Math.sin(rotation) + tiltedZ * Math.cos(rotation);

    return { x: finalX, y: tiltedY, z: finalZ };
  }, []);

  // Draw orbits and planet dots on the lines
  const drawGalaxy = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    rotX: number,
    rotY: number,
    scale: number,
    time: number,
    selectedId: string | null
  ) => {
    // Draw each orbit as an ellipse
    const uniqueOrbits = new Map<string, { radius: number; tilt: number; rotation: number }>();
    worlds.forEach(world => {
      const key = `${world.orbitRadius.toFixed(2)}-${world.orbitTilt.toFixed(2)}-${world.orbitRotation.toFixed(2)}`;
      if (!uniqueOrbits.has(key)) {
        uniqueOrbits.set(key, {
          radius: world.orbitRadius,
          tilt: world.orbitTilt,
          rotation: world.orbitRotation,
        });
      }
    });

    // Draw orbit paths
    uniqueOrbits.forEach(({ radius, tilt, rotation }) => {
      ctx.beginPath();
      const segments = 64;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const orbitPos = getOrbitPosition(angle, radius, tilt, rotation, 0);
        const rotated = rotatePoint(orbitPos, rotX, rotY);

        const screenX = centerX + rotated.x * scale;
        const screenY = centerY - rotated.y * scale;

        // Depth-based opacity
        const depth = (rotated.z + 1) / 2;
        const opacity = 0.1 + depth * 0.25;

        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.strokeStyle = `rgba(26, 26, 26, ${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.lineTo(screenX, screenY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
        }
      }
    });

    // Draw planet dots on their orbit positions
    worlds.forEach(world => {
      const orbitPos = getOrbitPosition(
        world.orbitAngle,
        world.orbitRadius,
        world.orbitTilt,
        world.orbitRotation,
        time
      );
      const rotated = rotatePoint(orbitPos, rotX, rotY);

      const screenX = centerX + rotated.x * scale;
      const screenY = centerY - rotated.y * scale;

      const depth = (rotated.z + 1) / 2;
      const opacity = 0.3 + depth * 0.7;
      const isSelected = world.id === selectedId;
      const dotSize = isSelected ? 8 : 5;

      ctx.beginPath();
      ctx.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(26, 26, 26, ${isSelected ? 1 : opacity})`;
      ctx.fill();
    });

  }, [rotatePoint, getOrbitPosition]);

  // Rotate galaxy to bring a world to the visible upper area of the screen
  const rotateToWorld = useCallback((world: World, time: number) => {
    // Get the world's current 3D position on its orbit
    const orbitPos = getOrbitPosition(
      world.orbitAngle,
      world.orbitRadius,
      world.orbitTilt,
      world.orbitRotation,
      time
    );

    const px = orbitPos.x;
    const py = orbitPos.y;
    const pz = orbitPos.z;

    // Step 1: Y rotation to bring world to front-center (x ≈ 0)
    const targetRotY = Math.atan2(px, pz);

    // After Y rotation by targetRotY, the world position becomes:
    // x' = 0 (approximately)
    // y' = py (unchanged by Y rotation)
    // z' = sqrt(px² + pz²) (the horizontal distance becomes the new z)
    const zAfterY = Math.sqrt(px * px + pz * pz);

    // Step 2: X rotation to position world in upper visible area
    // After X rotation by angle θ:
    // y'' = py * cos(θ) - zAfterY * sin(θ)
    // We want y'' to be positive and around 0.15-0.25 of the orbit radius (upper quarter of screen)
    // Target y position: 0.2 * world.orbitRadius (adjustable)
    const targetY = world.orbitRadius * 0.3;

    // Solve: targetY = py * cos(θ) - zAfterY * sin(θ)
    // This is A*cos(θ) - B*sin(θ) = C, where A=py, B=zAfterY, C=targetY
    // Solution: θ = atan2(A, B) - atan2(C, sqrt(A² + B²))
    const A = py;
    const B = zAfterY;
    const C = targetY;
    const R = Math.sqrt(A * A + B * B);

    // Make sure C is achievable (|C| <= R)
    const clampedC = Math.max(-R * 0.9, Math.min(R * 0.9, C));

    const targetRotX = Math.atan2(A, B) - Math.atan2(clampedC, Math.sqrt(R * R - clampedC * clampedC));

    targetRotationRef.current = { x: targetRotX, y: targetRotY };
    velocityRef.current = { x: 0, y: 0 };
  }, [getOrbitPosition]);

  // Update button positions based on rotation
  const updateButtonPositions = useCallback((rotX: number, rotY: number, scale: number, centerX: number, centerY: number, time: number) => {
    const positions = worlds.map((world) => {
      const orbitPos = getOrbitPosition(
        world.orbitAngle,
        world.orbitRadius,
        world.orbitTilt,
        world.orbitRotation,
        time
      );
      const rotated = rotatePoint(orbitPos, rotX, rotY);

      const screenX = centerX + rotated.x * scale;
      const screenY = centerY - rotated.y * scale;
      const depth = rotated.z;

      // Scale based on depth
      const buttonScale = 0.8 + (depth + 1) * 0.2;

      return {
        world,
        x: screenX,
        y: screenY,
        z: depth,
        scale: buttonScale,
      };
    });

    // Sort by z-depth (back to front)
    positions.sort((a, b) => a.z - b.z);
    setButtonPositions(positions);
  }, [rotatePoint, getOrbitPosition]);

  // Animation loop
  useEffect(() => {
    if (!isLoaded) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      // Use width for horizontal expansion, height for vertical constraint
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      // Store both dimensions
      sizeRef.current = height; // Use height to keep vertical in bounds
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const size = sizeRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      // Scale to fill at least 90% of screen on desktop, constrained by height on mobile
      const aspectRatio = width / height;
      let baseScale: number;
      if (aspectRatio > 1.2) {
        // Wide screen (desktop) - use width-based scaling to fill 90%+ of screen
        baseScale = width * 0.82;
      } else {
        // Tall or square screen (mobile) - use height-based scaling
        baseScale = height * 0.75;
      }
      const scale = baseScale * config.zoom;

      // Animate to target rotation if set (when world is selected)
      // Using smooth ease-out interpolation for fluid motion
      if (targetRotationRef.current && !isDraggingRef.current) {
        const target = targetRotationRef.current;
        const dx = target.x - rotationRef.current.x;
        const dy = target.y - rotationRef.current.y;

        // Smooth ease-out: faster at start, slower at end
        const easeFactor = 0.08;
        const easeX = dx * easeFactor;
        const easeY = dy * easeFactor;

        rotationRef.current.x += easeX;
        rotationRef.current.y += easeY;

        if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) {
          rotationRef.current.x = target.x;
          rotationRef.current.y = target.y;
          targetRotationRef.current = null;
        }
      }
      // Auto-rotate when not hovering, dragging, or animating
      else if (!isHovering && !isDraggingRef.current && !targetRotationRef.current) {
        rotationRef.current.y += 0.0015 * config.speed; // Slightly slower for smoother feel
      }

      // Apply velocity decay when not dragging - smoother decay
      if (!isDraggingRef.current && !targetRotationRef.current) {
        rotationRef.current.x += velocityRef.current.x;
        rotationRef.current.y += velocityRef.current.y;
        velocityRef.current.x *= 0.92; // Smoother decay
        velocityRef.current.y *= 0.92;
      }

      // Increment time for orbit animation (speed affects orbit speed)
      // Freeze orbit motion during rotation animation so selected world stays in position
      if (!targetRotationRef.current) {
        timeRef.current += config.speed;
      }

      // Clear and draw
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      drawGalaxy(ctx, centerX, centerY, rotationRef.current.x, rotationRef.current.y, scale, timeRef.current, selectedWorld);
      updateButtonPositions(rotationRef.current.x, rotationRef.current.y, scale, centerX, centerY, timeRef.current);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isLoaded, isHovering, selectedWorld, config, drawGalaxy, updateButtonPositions]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start dragging if clicking on a button
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    isDraggingRef.current = true;
    targetRotationRef.current = null; // Cancel any animation
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    // Smoother rotation sensitivity
    rotationRef.current.y += dx * 0.004;
    rotationRef.current.x += dy * 0.004;

    // Smooth velocity for momentum - blend with previous velocity
    velocityRef.current = {
      x: velocityRef.current.x * 0.5 + dy * 0.0015,
      y: velocityRef.current.y * 0.5 + dx * 0.0015
    };
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start dragging if touching a button
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      targetRotationRef.current = null; // Cancel any animation
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { x: 0, y: 0 };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - lastMouseRef.current.x;
    const dy = e.touches[0].clientY - lastMouseRef.current.y;

    // Smoother rotation sensitivity
    rotationRef.current.y += dx * 0.004;
    rotationRef.current.x += dy * 0.004;

    // Smooth velocity for momentum - blend with previous velocity
    velocityRef.current = {
      x: velocityRef.current.x * 0.5 + dy * 0.0015,
      y: velocityRef.current.y * 0.5 + dx * 0.0015
    };
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const selectedWorldData = worlds.find((w) => w.id === selectedWorld);

  // Loading bar
  const barLength = 16;
  const filled = Math.floor(loadProgress * barLength);
  const empty = barLength - filled;
  const loaderBar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center relative" style={{ backgroundColor: '#f5f0e8' }}>
      {/* Loader */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-sm transition-opacity duration-300 ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ color: '#1a1a1a', zIndex: 100 }}
      >
        <div>LOADING WORLDS</div>
        <div className="mt-3 tracking-widest">{loaderBar}</div>
      </div>

      {/* Galaxy container - expansive, nearly full screen */}
      <div
        ref={containerRef}
        className={`relative select-none transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          width: '100vw',
          height: '100vh',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          isDraggingRef.current = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Galaxy canvas - full container with GPU acceleration */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ willChange: 'transform' }}
        />

        {/* World buttons - dots are drawn on canvas, buttons float nearby */}
        {buttonPositions.map(({ world, x, y, z, scale }) => {
          const opacity = 0.3 + ((z + 1) / 2) * 0.7;
          const isSelected = selectedWorld === world.id;
          const displayScale = isSelected ? scale * 1.15 : scale;

          return (
            <button
              key={world.id}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedWorld === world.id) {
                  setSelectedWorld(null);
                } else {
                  setSelectedWorld(world.id);
                  rotateToWorld(world, timeRef.current);
                }
              }}
              className="absolute font-mono text-[9px] px-2 py-1 rounded-full whitespace-nowrap cursor-pointer"
              style={{
                left: 0,
                top: 0,
                transform: `translate3d(${x}px, ${y + 12}px, 0) translate(-50%, 0) scale(${displayScale})`,
                transformOrigin: 'center top',
                backgroundColor: isSelected ? '#1a1a1a' : 'rgba(26, 26, 26, 0.7)',
                color: '#f5f0e8',
                opacity: isSelected ? 1 : opacity,
                zIndex: isSelected ? 500 : Math.floor((z + 1) * 100),
                transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease-out, background-color 0.15s ease-out',
                willChange: 'transform, opacity',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translate3d(${x}px, ${y + 12}px, 0) translate(-50%, 0) scale(${displayScale * 1.15})`;
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translate3d(${x}px, ${y + 12}px, 0) translate(-50%, 0) scale(${displayScale})`;
                e.currentTarget.style.opacity = String(isSelected ? 1 : opacity);
                e.currentTarget.style.backgroundColor = isSelected ? '#1a1a1a' : 'rgba(26, 26, 26, 0.7)';
              }}
            >
              {world.name}
            </button>
          );
        })}
      </div>

      {/* Expanded world details - slide up/down animation, 50% height */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#f5f0e8] border-t border-[#1a1a1a] transition-transform duration-500 ease-out"
        style={{
          height: '50vh',
          transform: selectedWorldData ? 'translateY(0)' : 'translateY(100%)',
          zIndex: 1000,
        }}
      >
        {selectedWorldData && (
          <div className="h-full p-4 sm:p-6 overflow-auto">
            <div className="max-w-4xl mx-auto relative h-full">
              {/* Close button - repositioned for mobile */}
              <button
                onClick={() => setSelectedWorld(null)}
                className="absolute top-0 right-0 font-mono text-[11px] px-3 py-1.5 border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f0e8] transition-colors z-10"
                style={{ backgroundColor: '#f5f0e8' }}
              >
                CLOSE ×
              </button>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-10 sm:pt-0">
                <div className="w-full sm:w-48 h-32 sm:h-48 bg-[#1a1a1a]/10 flex-shrink-0 flex items-center justify-center font-mono text-[11px] text-[#1a1a1a]/50">
                  IMAGE
                </div>

                <div className="flex-1 font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
                  <h2 className="text-base sm:text-lg font-bold mb-2 underline decoration-2 underline-offset-4">
                    {selectedWorldData.name}
                  </h2>

                  <p className="mb-4 leading-relaxed max-w-lg text-[11px] sm:text-[12px]">
                    {selectedWorldData.description}
                  </p>

                  <div className="space-y-2 text-[10px] sm:text-[11px]">
                    <p>
                      <span className="font-bold">BUILT BY:</span> {selectedWorldData.builtBy}
                    </p>

                    {selectedWorldData.tools && selectedWorldData.tools.length > 0 && (
                      <p>
                        <span className="font-bold">TOOLS IN USE:</span>{' '}
                        {selectedWorldData.tools.join(', ')}
                      </p>
                    )}

                    {selectedWorldData.collaborators && selectedWorldData.collaborators.length > 0 && (
                      <p>
                        <span className="font-bold">COLLABORATORS:</span>{' '}
                        {selectedWorldData.collaborators.join(', ')}
                      </p>
                    )}
                  </div>

                  <button className="mt-4 px-4 py-2 border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f0e8] transition-colors text-[11px]">
                    EXPLORE WORLD →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel - hidden when detail panel is open */}
      <div
        className={`fixed bottom-5 left-5 font-mono text-[11px] p-3 border z-50 transition-all duration-500 ${isLoaded && !selectedWorld ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ color: '#1a1a1a', backgroundColor: '#f5f0e8', borderColor: '#1a1a1a' }}
      >
        <label className="flex items-center justify-between gap-3 mb-2">
          SIZE
          <input
            type="range"
            min="30"
            max="120"
            value={config.zoom * 100}
            onChange={(e) => setConfig(prev => ({ ...prev, zoom: parseInt(e.target.value) / 100 }))}
            className="w-20 h-0.5 appearance-none cursor-pointer"
            style={{ background: '#1a1a1a', accentColor: '#1a1a1a' }}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          SPEED
          <input
            type="range"
            min="0"
            max="200"
            value={config.speed * 100}
            onChange={(e) => setConfig(prev => ({ ...prev, speed: parseInt(e.target.value) / 100 }))}
            className="w-20 h-0.5 appearance-none cursor-pointer"
            style={{ background: '#1a1a1a', accentColor: '#1a1a1a' }}
          />
        </label>
      </div>

      {/* Back link */}
      <Link
        href="/home"
        className="fixed top-5 left-5 font-mono text-[11px] px-4 py-2 border transition-colors hover:bg-[#1a1a1a] hover:text-[#f5f0e8]"
        style={{
          color: '#1a1a1a',
          backgroundColor: '#f5f0e8',
          borderColor: '#1a1a1a',
          zIndex: 1001,
        }}
      >
        ← BACK
      </Link>

      {/* Title */}
      <h1
        className="fixed top-5 right-5 font-mono text-[11px]"
        style={{ color: '#1a1a1a', zIndex: 1001 }}
      >
        WORLDS
      </h1>
    </div>
  );
}
