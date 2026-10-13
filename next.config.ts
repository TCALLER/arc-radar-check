import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const TELEGRAM_ORIGIN = 'https://telegram.org';

/** Origin of an env URL for connect-src. Missing or invalid values add nothing (env.ts fails the app anyway). */
const originOf = (value: string | undefined): string => {
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const connectSources = [
  "'self'",
  // The mock service worker re-fetches the Telegram SDK script itself, and a worker's fetch is
  // checked against connect-src. Without this the SDK fails on every visit after the first.
  TELEGRAM_ORIGIN,
  originOf(process.env.NEXT_PUBLIC_API_BASE_URL),
  originOf(process.env.NEXT_PUBLIC_ARC_RPC_URL),
]
  .filter(Boolean)
  .join(' ');

// No nonces: inline scripts are needed by Next.js and next-themes, so script-src allows 'unsafe-inline'.
// Untrusted API text is never rendered as HTML (plain text only), which is the main XSS defence here.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TELEGRAM_ORIGIN}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src ${connectSources}`,
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Telegram Mini Apps run inside Telegram's web clients, so framing by Telegram is allowed.
  "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
].join('; ');

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
