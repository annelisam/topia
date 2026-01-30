'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TypographicSphereProps {
  texts?: string[];
  speed?: number;
  fontSize?: number;
  lineCount?: number;
  color?: string;
  bgColor?: string;
  showControls?: boolean;
}

interface TextStrip {
  canvas: HTMLCanvasElement;
  singleWidth: number;
  totalWidth: number;
  fontSize: number;
  sliceRadius: number;
  normalizedY: number;
}

export default function TypographicSphere({
  texts = ['TOPIA', 'WORLD', 'BUILDERS'],
  speed: initialSpeed = 0.0008,
  fontSize: initialFontSize = 18,
  lineCount: initialLineCount = 38,
  color = '#1a1a1a',
  bgColor = '#f5f0e8',
  showControls = true,
}: TypographicSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const currentSpeedRef = useRef(initialSpeed);
  const textStripsRef = useRef<(TextStrip | null)[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0, centerX: 0, centerY: 0, radius: 0, dpr: 1, responsiveScale: 1 });

  const [isHovering, setIsHovering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [config, setConfig] = useState({
    speed: initialSpeed,
    fontSize: initialFontSize,
    lineCount: initialLineCount,
  });

  const hoverSpeed = config.speed * 0.3;

  const buildTextStrips = useCallback(() => {
    const { width, dpr, responsiveScale } = dimensionsRef.current;
    const { fontSize, lineCount } = config;
    const scaledFontSize = fontSize * responsiveScale;
    const strips: (TextStrip | null)[] = [];

    for (let i = 0; i < lineCount; i++) {
      const normalizedY = ((i / (lineCount - 1)) * 2 - 1) * 0.96;
      const sliceRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));

      if (sliceRadius < 0.02) {
        strips.push(null);
        continue;
      }

      const adjustedFontSize = scaledFontSize * (0.35 + sliceRadius * 0.65);
      const text = texts[i % texts.length];
      const separator = '   ';
      const fullText = text + separator;

      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) continue;

      offCtx.font = `500 ${adjustedFontSize * dpr}px "Space Mono", "Courier New", monospace`;
      const singleWidth = offCtx.measureText(fullText).width;

      const repeatCount = Math.ceil((width * dpr * 3) / singleWidth) + 2;
      const totalWidth = singleWidth * repeatCount;

      offscreen.width = totalWidth;
      offscreen.height = Math.ceil(adjustedFontSize * dpr * 1.5);

      offCtx.font = `500 ${adjustedFontSize * dpr}px "Space Mono", "Courier New", monospace`;
      offCtx.fillStyle = color;
      offCtx.textBaseline = 'middle';

      const repeatedText = fullText.repeat(repeatCount);
      offCtx.fillText(repeatedText, 0, offscreen.height / 2);

      strips.push({
        canvas: offscreen,
        singleWidth,
        totalWidth,
        fontSize: adjustedFontSize,
        sliceRadius,
        normalizedY,
      });
    }

    textStripsRef.current = strips;
  }, [config, texts, color]);

  const getResponsiveScale = useCallback((size: number) => {
    if (size < 500) return 0.75;
    if (size < 700) return 0.85;
    return 1;
  }, []);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const size = Math.min(container.clientWidth, container.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    // Calculate responsive scale
    const responsiveScale = getResponsiveScale(size);

    dimensionsRef.current = {
      width: size,
      height: size,
      centerX: size / 2,
      centerY: size / 2,
      radius: size * 0.42,
      dpr,
      responsiveScale,
    };

    buildTextStrips();
  }, [buildTextStrips, getResponsiveScale]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const { width, height, centerX, centerY, radius, dpr } = dimensionsRef.current;
    const { lineCount } = config;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < lineCount; i++) {
      const strip = textStripsRef.current[i];
      if (!strip) continue;

      const { canvas: stripCanvas, singleWidth, sliceRadius, normalizedY, fontSize: adjustedFontSize } = strip;

      const y = centerY + normalizedY * radius;
      const sliceWidth = sliceRadius * radius;

      const scrollSpeed = sliceRadius * 700;
      const offset = (rotationRef.current * scrollSpeed) % singleWidth;

      const sliceCount = Math.ceil(sliceWidth * 2 / 3);

      for (let s = 0; s < sliceCount; s++) {
        const screenX = (centerX - sliceWidth) + (s / sliceCount) * sliceWidth * 2;
        const sphereX = (screenX - centerX) / sliceWidth;

        if (Math.abs(sphereX) >= 1) continue;

        const sphereZ = Math.sqrt(1 - sphereX * sphereX);
        const opacity = Math.pow(sphereZ, 0.6);

        if (opacity < 0.03) continue;

        const angle = Math.asin(sphereX);
        const textX = ((angle / Math.PI + 0.5) * singleWidth * 2 + offset * dpr) % strip.totalWidth;

        ctx.globalAlpha = opacity;

        const sliceW = (sliceWidth * 2 / sliceCount) + 1;
        const srcSliceW = sliceW * dpr / sphereZ;

        ctx.drawImage(
          stripCanvas,
          textX, 0, srcSliceW, stripCanvas.height,
          screenX, y - adjustedFontSize * 0.6, sliceW, adjustedFontSize * 1.2
        );
      }
    }

    ctx.globalAlpha = 1;

    // Smooth hover transition
    const targetSpeed = isHovering ? hoverSpeed : config.speed;
    currentSpeedRef.current += (targetSpeed - currentSpeedRef.current) * 0.08;
    rotationRef.current += currentSpeedRef.current;

    animationRef.current = requestAnimationFrame(animate);
  }, [config, bgColor, isHovering, hoverSpeed]);

  // Loading simulation
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.08 + Math.random() * 0.12;
      if (progress >= 1) {
        progress = 1;
        setLoadProgress(progress);
        clearInterval(interval);
        setTimeout(() => setIsLoaded(true), 200);
      } else {
        setLoadProgress(progress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Setup and animation
  useEffect(() => {
    if (!isLoaded) return;

    setup();
    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => setup();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoaded, setup, animate]);

  // Rebuild strips when config changes
  useEffect(() => {
    if (isLoaded) {
      buildTextStrips();
    }
  }, [config, isLoaded, buildTextStrips]);

  const barLength = 16;
  const filled = Math.floor(loadProgress * barLength);
  const empty = barLength - filled;
  const loaderBar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        backgroundColor: bgColor,
        width: 'min(100vw, 100vh, 900px)',
        height: 'min(100vw, 100vh, 900px)',
      }}
    >
      {/* Loader */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-sm transition-opacity duration-300 ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ color }}
      >
        <div>LOADING</div>
        <div className="mt-3 tracking-widest">{loaderBar}</div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />

      {/* Controls */}
      {showControls && (
        <div
          className={`fixed bottom-5 left-5 font-mono text-[11px] p-3 border z-50 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ color, backgroundColor: bgColor, borderColor: color }}
        >
          <label className="flex items-center justify-between gap-3 mb-2">
            SPEED
            <input
              type="range"
              min="1"
              max="20"
              value={config.speed * 12500}
              onChange={(e) => {
                const newSpeed = parseInt(e.target.value) / 12500;
                setConfig(prev => ({ ...prev, speed: newSpeed }));
                currentSpeedRef.current = newSpeed;
              }}
              className="w-20 h-0.5 appearance-none cursor-pointer"
              style={{
                background: color,
                accentColor: color,
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-3 mb-2">
            LINES
            <input
              type="range"
              min="20"
              max="50"
              value={config.lineCount}
              onChange={(e) => setConfig(prev => ({ ...prev, lineCount: parseInt(e.target.value) }))}
              className="w-20 h-0.5 appearance-none cursor-pointer"
              style={{
                background: color,
                accentColor: color,
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            SIZE
            <input
              type="range"
              min="12"
              max="24"
              value={config.fontSize}
              onChange={(e) => setConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              className="w-20 h-0.5 appearance-none cursor-pointer"
              style={{
                background: color,
                accentColor: color,
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
