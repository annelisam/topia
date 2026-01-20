# TOPIA Color System

Your complete TOPIA color palette is now integrated into Tailwind CSS v4.

## Usage in Components

With Tailwind CSS v4, you can use these colors directly in your className:

```tsx
// Backgrounds
<div className="bg-orange">Orange Background</div>
<div className="bg-yellow">Yellow Background</div>
<div className="bg-blue">Blue Background</div>
<div className="bg-green">Green Background</div>
<div className="bg-pink">Pink Background</div>

// Text Colors
<p className="text-orange">Orange Text</p>
<p className="text-yellow">Yellow Text</p>
<p className="text-blue">Blue Text</p>
<p className="text-green">Green Text</p>
<p className="text-pink">Pink Text</p>

// Border Colors
<div className="border border-orange">Orange Border</div>
<div className="border-l-4 border-green">Green Accent</div>

// Hover States
<button className="bg-blue hover:bg-opacity-80">Hover Me</button>

// Neutrals
<div className="bg-near-black text-off-white">Dark Mode Style</div>
<div className="bg-off-white text-near-black">Light Mode Style</div>
```

## Color Palette

### Base Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Red-Orange** | `#FF5C34` | Primary actions, CTAs |
| **Acid Yellow** | `#E9F056` | Highlights, attention |
| **Near Black** | `#171718` | Dark backgrounds, text |
| **Off White** | `#FEFEFF` | Light backgrounds |

### Support Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Electric Blue** | `#4F46FF` | Links, interactive elements |
| **Neon Green** | `#00FF88` | Success states, positive actions |
| **Hot Pink** | `#FF5BD7` | Accents, creative touches |

## CSS Variables

You can also use CSS variables directly:

```css
.custom-class {
  background-color: var(--color-orange);
  color: var(--color-off-white);
  border-color: var(--color-green);
}
```

## Examples

### Button Component
```tsx
export function PrimaryButton({ children }) {
  return (
    <button className="bg-blue text-off-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition">
      {children}
    </button>
  );
}
```

### Card with Accent
```tsx
export function Card({ title, children }) {
  return (
    <div className="bg-off-white dark:bg-near-black border-l-4 border-green p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-foreground">{children}</p>
    </div>
  );
}
```

### Badge Component
```tsx
export function Badge({ variant = 'blue', children }) {
  const variants = {
    blue: 'bg-blue bg-opacity-20 text-blue',
    green: 'bg-green bg-opacity-20 text-green',
    pink: 'bg-pink bg-opacity-20 text-pink',
    orange: 'bg-orange bg-opacity-20 text-orange',
    yellow: 'bg-yellow bg-opacity-20 text-yellow',
  };

  return (
    <span className={`${variants[variant]} px-3 py-1 rounded-full text-sm font-semibold`}>
      {children}
    </span>
  );
}
```

## Dark Mode

The TOPIA colors automatically work with dark mode. The background switches from `#FEFEFF` to `#171718` based on system preference.

```tsx
// This will adapt to dark mode automatically
<div className="bg-background text-foreground">
  Content that adapts to light/dark mode
</div>
```

## Color Psychology

- **Orange (#FF5C34)**: Energy, creativity, enthusiasm
- **Yellow (#E9F056)**: Optimism, clarity, innovation
- **Blue (#4F46FF)**: Trust, intelligence, efficiency
- **Green (#00FF88)**: Growth, success, harmony
- **Pink (#FF5BD7)**: Creativity, fun, uniqueness

## Accessibility Notes

- **Yellow text on white**: Consider using a darker shade for better contrast
- **All other colors** meet WCAG AA standards when used properly
- Test contrast ratios when using colors for text

## Quick Tips

1. Use **blue** for primary interactive elements
2. Use **green** for success states and confirmations
3. Use **orange** for attention-grabbing CTAs
4. Use **pink** sparingly for special highlights
5. Use **yellow** for background highlights, not body text in light mode
