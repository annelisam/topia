'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GlitchType from './GlitchType';

const THOUGHTS = [
  'build your world.',
  'culture first.',
  'systems second.',
  'ownership always.',
  'every world is an ecosystem.',
  'tools for creators.',
  'grow something real.',
  'open by design.',
  'depth before data.',
  'what you make it.',
  'built by creators, for communities.',
  'intention over hype.',
  'your ecosystem, your rules.',
  'create without permission.',
  'the canvas is yours.',
  'culture over spectacle.',
  'clear. confident. creator-led.',
  'worlds within worlds.',
  'build. grow. own.',
  'not a platform. an engine.',
  'art is infrastructure.',
  'community is currency.',
  'make something that lasts.',
  'the future is handmade.',
  'trust the process.',
  'less spectacle. more signal.',
];

interface Whisper {
  id: number;
  text: string;
  x: number;
  y: number;
  phase: 'typing' | 'hold' | 'fading' | 'done';
}

let _id = 0;

export default function SentientText() {
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastUsed = useRef<Set<number>>(new Set());

  const pickPhrase = useCallback(() => {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * THOUGHTS.length);
    } while (lastUsed.current.has(idx) && lastUsed.current.size < THOUGHTS.length - 3);
    lastUsed.current.add(idx);
    if (lastUsed.current.size > 8) {
      const first = lastUsed.current.values().next().value;
      if (first !== undefined) lastUsed.current.delete(first);
    }
    return THOUGHTS[idx];
  }, []);

  const spawn = useCallback(() => {
    const text = pickPhrase();
    const id = ++_id;
    const x = 8 + Math.random() * 80;
    const y = 12 + Math.random() * 75;
    const whisper: Whisper = { id, text, x, y, phase: 'typing' };
    setWhispers(prev => [...prev.slice(-2), whisper]);
  }, [pickPhrase]);

  const handleComplete = useCallback((id: number) => {
    setWhispers(prev => prev.map(w => w.id === id ? { ...w, phase: 'hold' } : w));
    setTimeout(() => {
      setWhispers(prev => prev.map(w => w.id === id ? { ...w, phase: 'fading' } : w));
      setTimeout(() => {
        setWhispers(prev => prev.filter(w => w.id !== id));
      }, 1800);
    }, 1200 + Math.random() * 1500);
  }, []);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      spawn();
      const loop = () => {
        const delay = 4000 + Math.random() * 5000;
        timerRef.current = setTimeout(() => {
          spawn();
          loop();
        }, delay);
      };
      loop();
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [spawn]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[3] overflow-hidden" aria-hidden="true">
      {whispers.map(w => (
        <span
          key={w.id}
          className="absolute font-mono text-[10px] md:text-[11px] uppercase tracking-[3px] select-none whitespace-nowrap"
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            opacity: w.phase === 'fading' ? 0 : 0.15,
            color: 'var(--sentient-color, #1a1a1a)',
            transition: 'opacity 1.8s ease-out',
          }}
        >
          {w.phase === 'typing' ? (
            <GlitchType
              text={w.text}
              speed={45}
              onComplete={() => handleComplete(w.id)}
            />
          ) : (
            w.text
          )}
        </span>
      ))}
    </div>
  );
}
