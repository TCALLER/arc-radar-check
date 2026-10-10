import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from 'next/font/google';
import Script from 'next/script';

import { AppProviders } from '@/common/providers/app-providers';
import { cn, TELEGRAM_EARLY_SCRIPT, TELEGRAM_SDK_URL } from '@/common/utils/global-utility';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

const atkinson = Atkinson_Hyperlegible_Next({
  variable: '--font-atkinson',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: '--font-atkinson-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

const SITE_TITLE = 'Arc Radar Check';
const SITE_DESCRIPTION = 'Scan any token on Arc mainnet.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Title and text for link previews when the page is shared (Telegram, chat apps).
  openGraph: { title: SITE_TITLE, description: SITE_DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No viewport-fit=cover: browsers keep the page inside their own safe area. In-app browsers
  // (e.g. MetaMask) report the phone's status bar as an inset and added an empty band on top.
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(atkinson.variable, atkinsonMono.variable, 'h-full antialiased')}
    >
      <head>
        {/* Marks the Telegram Mini App before the first paint (see TELEGRAM_EARLY_SCRIPT). */}
        <script>{TELEGRAM_EARLY_SCRIPT}</script>
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* Telegram's WebApp SDK. Harmless outside Telegram; inside it sets --tg-theme-*. */}
        <Script src={TELEGRAM_SDK_URL} strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
