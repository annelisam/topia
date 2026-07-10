'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QrScanner from 'qr-scanner';

// Full-screen camera overlay that fires onCode for each decoded QR value.
// Used by the Check-in tab (door scanning) and, in P4, quest-code scanning.
// Portal-rendered per the house rule for mobile overlays; the same code held
// in frame is debounced so it doesn't spam onCode. qr-scanner does the
// decoding (works on iOS Safari, which has no native BarcodeDetector).
export default function QrScannerOverlay({
  hint,
  status,
  onCode,
  onClose,
}: {
  hint: string;
  /** Live feedback line under the viewfinder (e.g. last scan result). */
  status?: { kind: 'ok' | 'warn' | 'err'; text: string } | null;
  onCode: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const value = result.data;
        const now = Date.now();
        if (value === lastRef.current.value && now - lastRef.current.at < 4000) return;
        lastRef.current = { value, at: now };
        onCode(value);
      },
      { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true },
    );
    scanner.start().catch(() => setCameraError(true));
    return () => { scanner.stop(); scanner.destroy(); };
  }, [onCode]);

  const statusColor = status?.kind === 'ok' ? '#e4fe52' : status?.kind === 'warn' ? '#FF9F1C' : '#FF5C34';

  return createPortal(
    <div className="fixed inset-0 z-[2200] flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'rgba(245,240,232,0.55)' }}>{hint}</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[24px] leading-none p-1" style={{ color: '#f5f0e8' }} aria-label="Close scanner">×</button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="font-mono text-[13px] text-center" style={{ color: '#f5f0e8' }}>
              Camera unavailable — allow camera access in your browser settings, or check guests in manually from the list.
            </p>
          </div>
        )}
      </div>
      <div className="px-5 pt-5 min-h-[64px]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
        {status && (
          <p className="font-mono text-[13px] font-bold" style={{ color: statusColor }}>{status.text}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
