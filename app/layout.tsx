import type { Metadata } from "next";
import "./globals.css";
import PrivyProviderWrapper from "./components/PrivyProviderWrapper";

export const metadata: Metadata = {
  title: "TOPIA - Culture Before Tech",
  description: "A breathing network for artists, audiences, and communities to create, explore, and sustain collaborative worlds.",
  openGraph: {
    title: "TOPIA — What You Make It",
    description: "A creator engine for artists, by artists.",
    type: "website",
    siteName: "Topia",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOPIA — What You Make It",
    description: "A creator engine for artists, by artists.",
  },
};

// Prevent flash of wrong theme on load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('topia-theme');
      if (theme !== 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      var accent = localStorage.getItem('topia-accent-index');
      if (accent) {
        var colors = ['#e4fe52','#4F46FF','#FF5BD7','#FF5C34','#00FF88','#f5f0e8'];
        var darkText = [false,true,true,true,false,false];
        var names = ['lime','blue','pink','orange','green','bone'];
        var i = parseInt(accent);
        if (colors[i]) {
          var c = colors[i];
          document.documentElement.style.setProperty('--accent', c);
          document.documentElement.style.setProperty('--accent-text', darkText[i] ? '#f5f0e8' : '#1a1a1a');
          document.documentElement.style.setProperty('--page-tint', c + '15');
          document.documentElement.style.setProperty('--page-glow', c + '08');
          document.documentElement.style.setProperty('--border-accent', c + '40');
          document.body && document.body.setAttribute('data-accent', names[i]);
        }
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="stylesheet" href="https://use.typekit.net/gjn0rep.css" />
      </head>
      <body className="antialiased">
        {/* Global texture overlays */}
        <div className="grain-overlay" />
        <div className="scanlines-overlay" />

        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
