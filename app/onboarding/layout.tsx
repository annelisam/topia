export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Full-bleed: no nav chrome, no footer. Wizard takes the entire viewport.
  return <>{children}</>;
}
