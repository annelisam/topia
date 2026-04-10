import { ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'hover:brightness-110 active:brightness-95',
  secondary: 'bg-transparent border border-current/20 hover:border-current/40 hover:bg-current/5',
  ghost: 'bg-transparent hover:opacity-70',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classes = `
    inline-flex items-center justify-center gap-2
    font-mono font-bold uppercase tracking-wider
    transition-all duration-300 ease-out
    rounded-card
    min-h-[44px]
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim();

  const accentStyle = variant === 'primary' ? {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
  } : { color: 'var(--page-text)' };

  if (href) {
    return (
      <Link href={href} className={classes} style={accentStyle}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} style={accentStyle} {...props}>
      {children}
    </button>
  );
}
