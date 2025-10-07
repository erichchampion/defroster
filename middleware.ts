import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en-us', 'es-us'];
const defaultLocale = 'en-us';

function getLocale(request: NextRequest): string {
  // Check if there's a stored preference in cookies
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // Get browser language from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, q = 'q=1'] = lang.trim().split(';');
        return { code: code.toLowerCase(), quality: parseFloat(q.split('=')[1] || '1') };
      })
      .sort((a, b) => b.quality - a.quality);

    // Check if any language starts with 'es' (Spanish)
    for (const lang of languages) {
      if (lang.code.startsWith('es')) {
        return 'es-us';
      }
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, API routes, and special Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/manifest.json' ||
    pathname === '/service-worker.js' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/appicon')
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Redirect to appropriate locale
  if (pathname === '/') {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;

    const response = NextResponse.redirect(url);
    // Set cookie to remember the locale preference
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  }

  // For any other path without a locale, redirect to the path with default locale
  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
