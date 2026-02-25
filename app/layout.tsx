import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import PrivyProviderWrapper from "./components/PrivyProviderWrapper";
import Footer from "./components/Footer";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TOPIA - Culture Before Tech",
  description: "A breathing network for artists, audiences, and communities to create, explore, and sustain collaborative worlds.",
};

// Script to prevent flash of wrong theme on load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('topia-theme');
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
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
      <body
        className={`${spaceMono.variable} antialiased`}
      >
        <PrivyProviderWrapper>
          {children}
          <Footer />
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
