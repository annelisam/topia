'use client';

import { useState, useEffect } from 'react';

const GLITCH_CHARS = '▓▒░█▌▐┃┫╋╳※¤◊⌐¬≡≈';

export default function GlitchType({
  text,
  onComplete,
  speed = 40,
  className = '',
}: {
  text: string;
  onComplete?: () => void;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [glitchText, setGlitchText] = useState('');

  useEffect(() => {
    let i = 0;
    let cancelled = false;

    function typeNext() {
      if (cancelled) return;
      i++;
      if (i > text.length) { setDone(true); onComplete?.(); return; }
      if (Math.random() < 0.1 && i < text.length - 2) {
        setGlitching(true);
        let scramble = text.slice(0, i);
        for (let s = 0; s < 1 + Math.floor(Math.random() * 3); s++)
          scramble += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        setGlitchText(scramble);
        setTimeout(() => {
          if (cancelled) return;
          setGlitching(false);
          setDisplayed(text.slice(0, i));
          setTimeout(typeNext, speed);
        }, 60 + Math.random() * 80);
        return;
      }
      if (Math.random() < 0.06) {
        setDisplayed(text.slice(0, i));
        setTimeout(typeNext, speed * 3 + Math.random() * 150);
        return;
      }
      setDisplayed(text.slice(0, i));
      setTimeout(typeNext, speed);
    }

    setTimeout(typeNext, speed);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className={`${className} ${glitching ? 'animate-[glitchFlicker_0.1s_steps(2)_infinite]' : ''}`}>
      {glitching ? glitchText : displayed}
      {!done && (
        <span
          className="inline-block w-[2px] h-[1.1em] bg-current ml-[2px] align-middle"
          style={{ animation: glitching ? 'glitchFlicker 0.08s steps(2) infinite' : 'pulse 1s ease-in-out infinite' }}
        />
      )}
    </span>
  );
}
