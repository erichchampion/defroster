/**
 * Client Identification Utility
 *
 * Extracts client IP address from request headers for rate limiting purposes.
 * Handles various proxy and CDN headers to get the real client IP.
 */

import { NextRequest } from 'next/server';
import { UNKNOWN_CLIENT_ID } from '@/lib/constants/redis';

/**
 * Gets a client identifier for rate limiting
 *
 * @remarks
 * Checks headers in order of reliability:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Vercel, Nginx)
 * 3. x-forwarded-for (standard proxy header)
 *
 * @param request - The incoming Next.js request
 * @returns Client IP address or 'unknown' if unable to determine
 */
export function getClientIdentifier(request: NextRequest): string {
  // Cloudflare-specific header (most reliable when behind Cloudflare)
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Vercel and Nginx use this header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Standard proxy header (may contain multiple IPs)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // First IP is the client, rest are proxies
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback when no IP can be determined
  return UNKNOWN_CLIENT_ID;
}
