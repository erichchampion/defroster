import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServicesProvider } from "@/lib/contexts/ServicesContext";
import { I18nProvider } from "@/lib/contexts/I18nContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : undefined,
  title: "Defroster - Report Sightings",
  description: "Real-time location-based safety alerts for ICE, Army, and Police sightings in your area",

  // App metadata
  applicationName: "Defroster",
  authors: [{ name: "Defroster Team" }],
  generator: "Next.js",
  keywords: ["safety", "alerts", "community", "location-based", "sightings"],

  // Favicon and app icons
  icons: {
    icon: [
      { url: "/appicon/defroster-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/appicon/defroster-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/appicon/defroster-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/appicon/defroster-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/appicon/defroster.ico", type: "image/x-icon" },
    ],
    shortcut: "/appicon/defroster.ico",
    apple: [
      { url: "/appicon/defroster-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/appicon/defroster-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/appicon/defroster-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/appicon/defroster-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Apple-specific
  appleWebApp: {
    capable: true,
    title: "Defroster",
    statusBarStyle: "black-translucent",
  },

  // PWA manifest
  manifest: "/manifest.json",

  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    title: "Defroster - Community Safety Alerts",
    description: "Real-time location-based safety alerts for ICE, Army, and Police sightings in your area",
    siteName: "Defroster",
    images: [
      {
        url: "/appicon/defroster-512x512.png",
        width: 512,
        height: 512,
        alt: "Defroster App Icon",
      },
    ],
  },

  // Twitter Card metadata
  twitter: {
    card: "summary",
    title: "Defroster - Community Safety Alerts",
    description: "Real-time location-based safety alerts for ICE, Army, and Police sightings in your area",
    images: ["/appicon/defroster-512x512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <ServicesProvider>
            {children}
          </ServicesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
