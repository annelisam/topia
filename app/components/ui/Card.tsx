import { ReactNode } from 'react';

type CardVariant = 'bone' | 'obsidian' | 'lime' | 'orange' | 'blue' | 'pink' | 'glass';

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  bone: 'bg-bone text-obsidian',
  obsidian: 'bg-obsidian text-bone border border-bone/[0.06]',
  lime: 'bg-lime text-obsidian',
  orange: 'bg-orange text-bone',
  blue: 'bg-blue text-bone',
  pink: 'bg-pink text-bone',
  glass: 'bg-bone/5 text-bone backdrop-blur-md border border-bone/[0.08]',
};

export default function Card({
  variant = 'bone',
  children,
  className = '',
  hover = true,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-card p-7 pb-8 relative overflow-hidden
        ${hover ? 'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : ''}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`font-basement font-black text-2xl uppercase leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardSub({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[9px] font-normal uppercase tracking-wider opacity-50 block ${className}`}>
      {children}
    </span>
  );
}

export function CardDivider({ className = '' }: { className?: string }) {
  return <div className={`w-full h-px bg-current opacity-[0.12] my-4 ${className}`} />;
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`font-mono text-[11px] leading-relaxed ${className}`}>
      {children}
    </div>
  );
}
