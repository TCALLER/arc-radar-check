import { Badge } from '@/common/components/components/badge';
import { SafeText } from '@/common/components/components/safe-text';
import { ThemeToggle } from '@/common/components/components/theme-toggle';

type PageHeaderProps = {
  /** "Mock version" / "Sample data", or null for no badge. */
  dataBadge: string | null;
  isTelegram: boolean;
  /** Untrusted display name from Telegram, via useAuth. */
  telegramName: string | null;
};

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="shrink-0">
      <circle cx="13" cy="13" r="12" className="fill-scope" />
      <circle cx="13" cy="13" r="7.5" fill="none" className="stroke-glow" strokeOpacity={0.5} />
      <path d="M13 13 L21.5 4.5" className="stroke-glow" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="17.5" cy="15.5" r="1.8" className="fill-glow" />
    </svg>
  );
}

/**
 * Logo, the mock/sample data badge, and the theme toggle; inside Telegram the toggle is hidden and
 * the Telegram name shows in its place.
 */
export function PageHeader({ dataBadge, isTelegram, telegramName }: PageHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-4 py-3.5 lg:max-w-[1280px] lg:gap-3 lg:px-8 lg:py-4.5">
      <Logo />
      <span className="text-lg font-extrabold lg:text-xl">Arc Radar</span>
      {dataBadge && <Badge tone="sample">{dataBadge}</Badge>}
      <span className="flex-1" />
      {!isTelegram && <ThemeToggle />}
      {isTelegram && telegramName && (
        <span className="flex max-w-[45%] min-w-0 items-baseline gap-1 text-sm text-muted-foreground">
          <span className="shrink-0">Hi,</span>
          <SafeText value={telegramName} lines={1} className="font-semibold text-ink" />
        </span>
      )}
    </header>
  );
}
