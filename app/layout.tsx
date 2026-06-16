import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "asciinema-player/dist/bundle/asciinema-player.css";
import "../components/ui/cast-player.css";

const minecraftia = localFont({
  src: "./fonts/Minecraftia-Regular.ttf",
  variable: "--font-minecraftia",
  display: "swap",
  fallback: ["monospace"],
});

const mondwest = localFont({
  src: "./fonts/Mondwest-Regular.otf",
  variable: "--font-mondwest",
  display: "swap",
  fallback: ["monospace"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Change this to "mondwest" to switch the site's primary display font.
const ACTIVE_SITE_FONT: "minecraftia" | "mondwest" = "minecraftia";

const siteTitle = "Perry Coding Agent";
const siteDescription =
  "Perry is a terminal-native coding agent harness for people who want AI help without leaving the shell.";
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";
const siteUrl = rawSiteUrl.startsWith("http")
  ? rawSiteUrl
  : `https://${rawSiteUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "Perry",
  keywords: [
    "Perry",
    "coding agent",
    "AI coding agent",
    "terminal agent",
    "developer tools",
  ],
  creator: "Perry",
  publisher: "Perry",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "Perry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  appleWebApp: {
    title: siteTitle,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-site-font={ACTIVE_SITE_FONT}
      className={`${minecraftia.variable} ${mondwest.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
