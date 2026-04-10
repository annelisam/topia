import { ReactNode } from 'react';

interface SectionHeadingProps {
  label?: string;
  children: ReactNode;
  className?: string;
  size?: 'default' | 'sm';
}

export default function SectionHeading({
  label,
  children,
  className = '',
  size = 'default',
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${className}`}>
      {label && (
        <span className="meta-text block mb-4">{label}</span>
      )}
      <h2
        className={`
          font-basement font-black uppercase
          ${size === 'default'
            ? 'text-[clamp(48px,10vw,160px)] leading-[0.85] tracking-[-4px]'
            : 'text-[clamp(32px,6vw,72px)] leading-[0.9] tracking-[-2px]'
          }
        `}
      >
        {children}
      </h2>
    </div>
  );
}
