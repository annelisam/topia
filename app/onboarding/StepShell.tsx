'use client';

import { ReactNode } from 'react';
import GlitchType from '../components/ui/GlitchType';
import { PathConfig } from '../components/profile/pathConfig';

interface StepShellProps {
  step: number;
  total: number;
  /** Current path config (drives accent color). null = neutral lime. */
  config: PathConfig | null;
  /** Heading rendered with GlitchType. */
  heading?: string;
  /** Optional pre-heading kicker (small mono uppercase). */
  kicker?: string;
  /** Body content (input + buttons). */
  children: ReactNode;
  /** Footer hint text (e.g. "Press Enter ↵ to continue"). */
  hint?: string;
  /** When true, content fades in via fadeUp keyframe. Default true. */
  animate?: boolean;
  /** Show the "back" arrow link (top-left). */
  onBack?: () => void;
  /** Hide the progress bar (welcome screen only). */
  hideProgress?: boolean;
  /** Extra classes on outer wrapper. */
  className?: string;
}

export default function StepShell({
  step, total, config, heading, kicker, children, hint, animate = true,
  onBack, hideProgress, className = '',
}: StepShellProps) {
  const accentHex = config?.hex ?? '#e4fe52';
  const filled = Math.round((step / total) * 16);
  const empty = 16 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <div className={`relative min-h-screen bg-obsidian text-bone overflow-hidden ${className}`}>
      {/* Always-on backdrop textures */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px)',
        }}
      />

      {/* Top bar: back + step indicator */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
        <div className="flex items-center gap-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="font-mono text-[11px] uppercase tracking-[2px] text-bone/30 hover:text-bone/70 transition-colors bg-transparent border-none cursor-pointer"
            >
              ← back
            </button>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/15">topia://onboarding</span>
          )}
        </div>
        {!hideProgress && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[2px] text-bone/30 hidden md:inline" style={{ color: accentHex }}>{bar}</span>
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">
              {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Main content — vertically centered */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 md:px-10 py-12">
        <div className="w-full max-w-2xl">
          {kicker && (
            <div
              className="font-mono text-[10px] md:text-[12px] uppercase tracking-[3px] text-bone/30 mb-3"
              style={animate ? { opacity: 0, animation: 'fadeUp 0.6s ease forwards' } : undefined}
            >
              {kicker}
            </div>
          )}
          {heading && (
            <h1
              className="font-basement font-black text-[clamp(28px,5vw,56px)] uppercase leading-[0.95] text-bone mb-8"
              style={animate ? { opacity: 0, animation: 'fadeUp 0.7s ease 0.1s forwards' } : undefined}
            >
              <GlitchType text={heading} speed={28} />
            </h1>
          )}
          <div
            style={animate ? { opacity: 0, animation: 'fadeUp 0.7s ease 0.4s forwards' } : undefined}
          >
            {children}
          </div>
          {hint && (
            <div
              className="mt-10 font-mono text-[11px] uppercase tracking-[2px] text-bone/25"
              style={animate ? { opacity: 0, animation: 'fadeUp 0.7s ease 0.7s forwards' } : undefined}
            >
              {hint}
            </div>
          )}
        </div>
      </main>

      {/* Bottom path-color gradient line (accent) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-10 pointer-events-none transition-colors duration-700"
        style={{ background: `linear-gradient(90deg, transparent, ${accentHex}40, ${accentHex}, ${accentHex}40, transparent)` }}
      />
    </div>
  );
}
