import { useSyncExternalStore } from 'react';

import { useTheme } from 'next-themes';

import { Theme } from '@/common/constants';

const subscribe = () => () => {};

/** Light/dark switch. Renders only after mount so server and client HTML match. */
export const useThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === Theme.Dark;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const handleToggle = () => setTheme(isDark ? Theme.Light : Theme.Dark);

  return { isMounted, isDark, label, handleToggle };
};
