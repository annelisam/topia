'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, caption: string) => Promise<void> | void;
  /** Suggested 1:1 size in CSS pixels. Internal canvas is rendered at 2× for HiDPI. */
  size?: number;
}

type Tool = 'brush' | 'eraser' | 'text';

const PALETTE = [
  '#0a0a0a', // black
  '#f5f0e8', // bone (≈ white)
  '#e4fe52', // lime
  '#FF5BD7', // pink
  '#4F46FF', // blue
  '#FF5C34', // orange
  '#00FF88', // green
];
const SIZES = [2, 5, 10, 18];

/**
 * Simplified Microsoft-Paint-style 1:1 canvas. Mouse + touch supported.
 * Brush, eraser, text tool, color picker, size picker, undo, clear.
 *
 * On save: canvas → PNG → uploaded to Vercel Blob via
 * /api/events/cover-upload (it accepts the same constraints; we reuse it
 * rather than spinning up another route). Returns the URL to the parent.
 */
export default function DrawingCanvas({ open, onClose, onSave, size = 512 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // History stack of PNG data URLs for one-step undo
  const historyRef = useRef<string[]>([]);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas (HiDPI + white background)
  useEffect(() => {
    if (!open) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width  = size * dpr;
    cv.height = size * dpr;
    cv.style.width  = `${size}px`;
    cv.style.height = `${size}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f5f0e8'; // bone background
    ctx.fillRect(0, 0, size, size);
    historyRef.current = [cv.toDataURL('image/png')];
  }, [open, size]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function pushHistory() {
    const cv = canvasRef.current;
    if (!cv) return;
    historyRef.current.push(cv.toDataURL('image/png'));
    // Cap at 20 entries to bound memory
    if (historyRef.current.length > 20) historyRef.current.shift();
  }

  function undo() {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop(); // drop current
    const prev = historyRef.current[historyRef.current.length - 1];
    const cv = canvasRef.current;
    if (!cv || !prev) return;
    const ctx = cv.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.clearRect(0, 0, cv.width, cv.height);
      ctx?.drawImage(img, 0, 0, size, size);
    };
    img.src = prev;
  }

  function clearAll() {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, size, size);
    pushHistory();
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'text') return;
    const cv = canvasRef.current;
    if (!cv) return;
    cv.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(e);
  }

  function continueStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    const last = lastPointRef.current ?? p;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === 'eraser' ? '#f5f0e8' : color;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  }

  function endStroke() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pushHistory();
  }

  function handleCanvasClick(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool !== 'text') return;
    const text = prompt('Text to add:');
    if (!text) return;
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const p = getPoint(e);
    const fontSize = Math.max(14, brushSize * 3);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, p.x, p.y);
    pushHistory();
  }

  async function handleSave() {
    setError(null);
    const cv = canvasRef.current;
    if (!cv) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        cv.toBlob((b) => b ? resolve(b) : reject(new Error('Encode failed')), 'image/png');
      });
      // Reuse the cover-upload route — same constraints work fine for a
      // 512×512 PNG (~50–150 KB typical).
      const fd = new FormData();
      fd.append('file', blob, 'drawing.png');
      const res = await fetch('/api/events/cover-upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Upload failed');
        return;
      }
      await onSave(json.url as string, caption.trim());
      onClose();
    } catch (err) {
      console.error('drawing save failed', err);
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1600] flex items-center justify-center px-3 sm:px-6 py-6 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-obsidian text-bone border border-bone/[0.08] rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-bone/[0.06] flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40">draw something nice</span>
          <button
            onClick={onClose}
            className="font-mono text-[14px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer w-6 h-6 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-bone/[0.06] flex flex-wrap items-center gap-2">
          {/* Tool buttons */}
          {(['brush', 'eraser', 'text'] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 rounded-sm border transition cursor-pointer ${tool === t ? 'bg-bone text-obsidian border-bone' : 'bg-transparent text-bone/60 border-bone/15 hover:text-bone'}`}
            >
              {t === 'brush' ? '✎ brush' : t === 'eraser' ? '⌫ eraser' : 'T text'}
            </button>
          ))}

          <span className="w-px h-5 bg-bone/15 mx-1" />

          {/* Color palette */}
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-sm border-2 transition cursor-pointer"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#e4fe52' : 'rgba(245,240,232,0.15)',
                transform: color === c ? 'scale(1.1)' : 'scale(1)',
              }}
              title={c}
              aria-label={`color ${c}`}
            />
          ))}

          <span className="w-px h-5 bg-bone/15 mx-1" />

          {/* Sizes */}
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`w-6 h-6 rounded-sm border flex items-center justify-center transition cursor-pointer ${brushSize === s ? 'bg-bone/10 border-lime/50' : 'bg-transparent border-bone/15 hover:bg-bone/[0.04]'}`}
              title={`size ${s}px`}
            >
              <span className="rounded-full bg-bone" style={{ width: Math.min(s, 14), height: Math.min(s, 14) }} />
            </button>
          ))}

          <span className="w-px h-5 bg-bone/15 mx-1" />

          {/* Undo + Clear */}
          <button
            onClick={undo}
            className="font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 rounded-sm border border-bone/15 text-bone/60 hover:text-bone bg-transparent cursor-pointer transition"
          >
            ↶ undo
          </button>
          <button
            onClick={clearAll}
            className="font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 rounded-sm border border-bone/15 text-bone/60 hover:text-pink hover:border-pink/40 bg-transparent cursor-pointer transition"
          >
            ⌧ clear
          </button>
        </div>

        {/* Canvas */}
        <div className="p-4 bg-bone/[0.02] flex justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => { startStroke(e); handleCanvasClick(e); }}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            style={{ cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
            className="rounded-sm border border-bone/15 shadow-2xl"
          />
        </div>

        {/* Footer: caption + save */}
        <div className="px-4 py-3 border-t border-bone/[0.06] flex items-center gap-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="add a caption (optional)"
            maxLength={120}
            className="flex-1 bg-bone/[0.04] border border-bone/15 focus:border-lime/40 rounded-sm px-3 py-1.5 font-mono text-[12px] text-bone placeholder:text-bone/25 outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-1.5 rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
          >
            {saving ? 'saving…' : 'sign guestbook →'}
          </button>
        </div>
        {error && (
          <div className="px-4 pb-3 font-mono text-[11px] text-pink/80">{error}</div>
        )}
      </div>
    </div>
  );
}
