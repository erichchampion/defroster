import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This is a minimal root layout - the actual layout is in [locale]/layout.tsx
  return children;
}
