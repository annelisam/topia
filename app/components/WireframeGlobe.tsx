'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WorldData {
  id: string;
  name: string;
  description: string;
  builtBy: string;
  tools?: string[];
  collaborators?: string[];
  image: string;
}

interface World extends WorldData {
  theta: number;
  phi: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface WireframeGlobeProps {
  worldsData: WorldData[];
  onSelectWorld?: (world: World | null) => void;
  selectedWorldId?: string | null;
  color?: string;
  bgColor?: string;
}

export default function WireframeGlobe({
  worldsData,
  onSelectWorld,
  selectedWorldId,
  color = '#1a1a1a',
  bgColor = '#f5f0e8',
}: WireframeGlobeProps) {
  // Distribute worlds evenly on sphere using golden ratio spiral
  const worlds: World[] = worldsData.map((world, i) => {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / worldsData.length);
    return { ...world, theta, phi };
  });

  const [isHovering, setIsHovering] = useState(false);
  const [buttonPositions, setButtonPositions] = useState<{ world: World; x: number; y: number; z: number; scale: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const radiusRef = useRef(250);
  const sizeRef = useRef(0);

  // Rotate point around X and Y axes
  const rotatePoint = useCallback((point: Point3D, rotX: number, rotY: number): Point3D => {
    let x = point.x * Math.cos(rotY) - point.z * Math.sin(rotY);
    let z = point.x * Math.sin(rotY) + point.z * Math.cos(rotY);
    let y = point.y;

    const newY = y * Math.cos(rotX) - z * Math.sin(rotX);
    const newZ = y * Math.sin(rotX) + z * Math.cos(rotX);

    return { x, y: newY, z: newZ };
  }, []);

  // Convert spherical to cartesian coordinates
  const sphericalToCartesian = useCallback((theta: number, phi: number, r: number): Point3D => {
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
    };
  }, []);

  // Draw wireframe sphere with depth-based opacity for all lines
  const drawSphere = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, rotX: number, rotY: number, radius: number) => {
    ctx.lineWidth = 1.5;

    // Draw latitude lines with depth-based opacity
    for (let lat = 0; lat <= 180; lat += 10) {
      const phi = (lat * Math.PI) / 180;

      for (let lon = 0; lon < 360; lon += 3) {
        const theta1 = (lon * Math.PI) / 180;
        const theta2 = ((lon + 3) * Math.PI) / 180;

        const point1 = sphericalToCartesian(theta1, phi, radius);
        const rotated1 = rotatePoint(point1, rotX, rotY);

        const point2 = sphericalToCartesian(theta2, phi, radius);
        const rotated2 = rotatePoint(point2, rotX, rotY);

        const avgZ = (rotated1.z + rotated2.z) / 2;
        const opacity = 0.08 + ((avgZ + radius) / (2 * radius)) * 0.35;

        ctx.strokeStyle = color.startsWith('#')
          ? `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${opacity})`
          : `rgba(26, 26, 26, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(centerX + rotated1.x, centerY - rotated1.y);
        ctx.lineTo(centerX + rotated2.x, centerY - rotated2.y);
        ctx.stroke();
      }
    }

    // Draw longitude lines with depth-based opacity
    for (let lon = 0; lon < 360; lon += 10) {
      const theta = (lon * Math.PI) / 180;

      for (let lat = 0; lat < 180; lat += 3) {
        const phi1 = (lat * Math.PI) / 180;
        const phi2 = ((lat + 3) * Math.PI) / 180;

        const point1 = sphericalToCartesian(theta, phi1, radius);
        const rotated1 = rotatePoint(point1, rotX, rotY);

        const point2 = sphericalToCartesian(theta, phi2, radius);
        const rotated2 = rotatePoint(point2, rotX, rotY);

        const avgZ = (rotated1.z + rotated2.z) / 2;
        const opacity = 0.08 + ((avgZ + radius) / (2 * radius)) * 0.35;

        ctx.strokeStyle = color.startsWith('#')
          ? `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${opacity})`
          : `rgba(26, 26, 26, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(centerX + rotated1.x, centerY - rotated1.y);
        ctx.lineTo(centerX + rotated2.x, centerY - rotated2.y);
        ctx.stroke();
      }
    }
  }, [rotatePoint, sphericalToCartesian, color]);

  // Update button positions based on rotation
  const updateButtonPositions = useCallback((rotX: number, rotY: number, centerX: number, centerY: number, radius: number) => {
    const positions = worlds.map((world) => {
      const point = sphericalToCartesian(world.theta, world.phi, radius);
      const rotated = rotatePoint(point, rotX, rotY);

      const scale = 0.7 + (rotated.z + radius) / (2 * radius) * 0.5;

      return {
        world,
        x: centerX + rotated.x,
        y: centerY - rotated.y,
        z: rotated.z,
        scale,
      };
    });

    positions.sort((a, b) => a.z - b.z);
    setButtonPositions(positions);
  }, [worlds, rotatePoint, sphericalToCartesian]);

  // Rotate sphere to bring a world to the front
  const rotateToWorld = useCallback((world: World) => {
    const point = sphericalToCartesian(world.theta, world.phi, 1);
    const targetRotY = -Math.atan2(point.x, point.z);
    const rotatedZ = point.x * Math.sin(targetRotY) + point.z * Math.cos(targetRotY);
    const targetRotX = Math.atan2(point.y, rotatedZ);

    targetRotationRef.current = { x: targetRotX, y: targetRotY };
    velocityRef.current = { x: 0, y: 0 };
  }, [sphericalToCartesian]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const size = Math.min(container.clientWidth, container.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);

      radiusRef.current = size * 0.42;
      sizeRef.current = size;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const size = sizeRef.current;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = radiusRef.current;

      if (targetRotationRef.current && !isDraggingRef.current) {
        const target = targetRotationRef.current;
        const dx = target.x - rotationRef.current.x;
        const dy = target.y - rotationRef.current.y;

        rotationRef.current.x += dx * 0.08;
        rotationRef.current.y += dy * 0.08;

        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          targetRotationRef.current = null;
        }
      }
      else if (!isHovering && !isDraggingRef.current && !targetRotationRef.current) {
        rotationRef.current.y += 0.004;
        rotationRef.current.x += 0.001;
      }

      if (!isDraggingRef.current && !targetRotationRef.current) {
        rotationRef.current.x += velocityRef.current.x;
        rotationRef.current.y += velocityRef.current.y;
        velocityRef.current.x *= 0.95;
        velocityRef.current.y *= 0.95;
      }

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawSphere(ctx, centerX, centerY, rotationRef.current.x, rotationRef.current.y, radius);
      updateButtonPositions(rotationRef.current.x, rotationRef.current.y, centerX, centerY, radius);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isHovering, drawSphere, updateButtonPositions]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    targetRotationRef.current = null;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    rotationRef.current.y += dx * 0.005;
    rotationRef.current.x += dy * 0.005;

    velocityRef.current = { x: dy * 0.002, y: dx * 0.002 };
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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

    rotationRef.current.y += dx * 0.005;
    rotationRef.current.x += dy * 0.005;

    velocityRef.current = { x: dy * 0.002, y: dx * 0.002 };
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const radius = radiusRef.current;

  return (
    <div
      ref={containerRef}
      className="relative select-none w-full h-full"
      style={{
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
      <canvas ref={canvasRef} className="absolute inset-0" />

      {buttonPositions.map(({ world, x, y, z, scale }) => {
        const opacity = 0.2 + ((z + radius) / (2 * radius)) * 0.8;
        const isFront = z > 0;

        return (
          <button
            key={world.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isFront) {
                onSelectWorld?.(selectedWorldId === world.id ? null : world);
              } else {
                rotateToWorld(world);
              }
            }}
            className="absolute font-mono text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              backgroundColor: selectedWorldId === world.id ? color : `${color}d9`,
              color: bgColor,
              opacity,
              zIndex: Math.floor(z + radius),
              transition: 'opacity 0.15s, background-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = `translate(-50%, -50%) scale(${scale * 1.15})`;
              e.currentTarget.style.opacity = String(Math.min(1, opacity + 0.3));
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `translate(-50%, -50%) scale(${scale})`;
              e.currentTarget.style.opacity = String(opacity);
            }}
          >
            {world.name}
          </button>
        );
      })}
    </div>
  );
}
