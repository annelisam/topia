'use client';

import { useRef, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: string;
  fallbackName: string;
  onBack: () => void;
  onAdvance: (avatarUrl: string) => void;
}

// Resize image to max 256×256 and return a base64 data URL
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function AvatarStep({ step, total, config, initialValue, fallbackName, onBack, onAdvance }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialValue);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setAvatarUrl(resized);
      setError('');
    } catch {
      setError('couldn\'t process that image — try another.');
    }
  }

  function submit() {
    if (!avatarUrl) { setError('upload a photo to continue.'); return; }
    onAdvance(avatarUrl);
  }

  const initial = (fallbackName || 'Y')[0]?.toUpperCase() ?? '?';

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · your face`}
      heading="Add a profile photo."
      hint={avatarUrl ? 'press enter — or pick another' : 'click the circle to upload'}
      onBack={onBack}
    >
      <div className="flex items-center gap-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer bg-transparent border-none p-0"
          style={{ width: 160, height: 160 }}
        >
          {/* Corner marks */}
          <span className="absolute -top-2 -left-2 w-4 h-4"><span className="absolute top-0 left-0 w-full h-[1px] bg-bone/30" /><span className="absolute top-0 left-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -top-2 -right-2 w-4 h-4"><span className="absolute top-0 right-0 w-full h-[1px] bg-bone/30" /><span className="absolute top-0 right-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -bottom-2 -left-2 w-4 h-4"><span className="absolute bottom-0 left-0 w-full h-[1px] bg-bone/30" /><span className="absolute bottom-0 left-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -bottom-2 -right-2 w-4 h-4"><span className="absolute bottom-0 right-0 w-full h-[1px] bg-bone/30" /><span className="absolute bottom-0 right-0 h-full w-[1px] bg-bone/30" /></span>
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-dashed border-bone/15 group-hover:border-bone/40 transition-colors">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bone/[0.04]">
                <span className="font-basement text-5xl text-bone/20">{initial}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-obsidian/60">
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone">{avatarUrl ? 'change' : 'upload'}</span>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="flex flex-col gap-3">
          <button
            onClick={submit}
            className="font-mono text-[12px] uppercase tracking-[2px] text-bone/70 hover:text-bone transition-colors bg-transparent border border-bone/30 hover:border-bone/70 px-4 py-2 cursor-pointer w-fit"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          >
            continue →
          </button>
          {avatarUrl && (
            <button
              onClick={() => setAvatarUrl('')}
              className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone/60 transition-colors bg-transparent border-none cursor-pointer w-fit"
            >
              remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
      )}
    </StepShell>
  );
}
