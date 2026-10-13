'use client';

import { Moon, Sun } from 'lucide-react';

import { Button } from '@/common/components/components/button';

import { useThemeToggle } from './use-theme-toggle';

/** Light/dark switch for the browser. Never shown inside Telegram (it follows Telegram's theme). */
export function ThemeToggle() {
  const { isMounted, isDark, label, handleToggle } = useThemeToggle();

  if (!isMounted) return <span className="size-11" aria-hidden />;

  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={handleToggle}>
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
