import { Button } from '@/common/components/components/button';
import { SafeText } from '@/common/components/components/safe-text';
import { toSafeHttpsUrl } from '@/common/utils/global-utility';

type SafeLinkProps = {
  /** Untrusted URL. Only an exact `https:` URL becomes a link. */
  href: string | null | undefined;
  /** Untrusted label. */
  label: string | null | undefined;
  fallbackLabel?: string;
};

export const LINK_HIDDEN_NOTE = "Link hidden: it isn't a secure https link.";

/** An external link only for https URLs; anything else is plain text plus a short note. */
export function SafeLink({ href, label, fallbackLabel = 'Untitled source' }: SafeLinkProps) {
  const safeHref = href ? toSafeHttpsUrl(href) : null;

  if (!safeHref) {
    return (
      <span className="flex min-w-0 flex-col gap-0.5">
        <SafeText value={label} fallback={fallbackLabel} lines={1} />
        <span className="text-sm text-muted-foreground">{LINK_HIDDEN_NOTE}</span>
      </span>
    );
  }

  return (
    <Button variant="link" asChild className="max-w-full justify-start text-left">
      <a href={safeHref} target="_blank" rel="noopener noreferrer">
        <SafeText value={label} fallback={fallbackLabel} lines={1} />
      </a>
    </Button>
  );
}
