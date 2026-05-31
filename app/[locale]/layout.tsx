import { Bricolage_Grotesque, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import "../globals.css";
import { ClientProviders } from "../ClientProviders";
import type { Metadata, Viewport } from "next";
import { locales, localeToLanguage, getTranslationsByLocale, type Locale } from "@/lib/i18n/i18n";
import { notFound } from "next/navigation";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params as { locale: Locale };
  const translations = getTranslationsByLocale(locale);
  const language = localeToLanguage(locale);

  return {
    metadataBase: process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
      : undefined,
    title: translations.app.title,
    description: translations.app.description,

    // App metadata
    applicationName: translations.app.applicationName,
    authors: [{ name: "Defroster Team" }],
    generator: "Next.js",
    keywords: translations.app.keywords.split(", "),

    // Language alternates
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en-US': '/en-us',
        'es-US': '/es-us',
      },
    },

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
        { url: "/appicon/defroster-180x120.png", sizes: "180x180", type: "image/png" },
      ],
    },

    // Apple-specific
    appleWebApp: {
      capable: true,
      title: translations.app.name,
      statusBarStyle: "black-translucent",
    },

    // PWA manifest
    manifest: "/manifest.json",

    // Open Graph metadata for social sharing
    openGraph: {
      type: "website",
      locale: language === 'es' ? 'es_US' : 'en_US',
      title: translations.app.title,
      description: translations.app.description,
      siteName: translations.app.name,
      images: [
        {
          url: "/appicon/defroster-512x512.png",
          width: 512,
          height: 512,
          alt: `${translations.app.name} App Icon`,
        },
      ],
    },

    // Twitter Card metadata
    twitter: {
      card: "summary",
      title: translations.app.title,
      description: translations.app.description,
      images: ["/appicon/defroster-512x512.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#FBF7F1" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params as { locale: Locale };

  // Validate that the locale is supported
  if (!locales.includes(locale)) {
    notFound();
  }

  const language = localeToLanguage(locale);

  return (
    <html lang={language}>
      <body
        className={`${bricolage.variable} ${publicSans.variable} ${splineMono.variable} antialiased`}
      >
        <ClientProviders initialLocale={locale}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
