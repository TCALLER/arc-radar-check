import { cva, type VariantProps } from 'class-variance-authority';

import { Button as UiButton } from '@/common/components/ui/button';
import { cn } from '@/common/utils/global-utility';

import type { ComponentProps } from 'react';

// Text-sized buttons and links keep their look but get a taller invisible tap area, about 40–44px
// for one line of text (touch targets). Layout doesn't change.
const TEXT_TAP_AREA = 'relative after:absolute after:-inset-x-1 after:-inset-y-2.5';

const buttonVariants = cva(
  'rounded-xl font-bold whitespace-normal focus-visible:ring-0 disabled:opacity-50 [&_svg:not([class*=size-])]:size-5',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:
          'border-[1.5px] border-ink bg-transparent text-ink hover:bg-inset dark:border-ink dark:bg-transparent dark:hover:bg-inset',
        ghost: 'bg-transparent font-semibold text-ink hover:bg-inset',
        link: 'h-auto rounded-sm px-0 font-medium text-link underline underline-offset-4 hover:text-ink',
        // Inline text that acts as a button (e.g. tap to expand a truncated label)
        inline:
          'h-auto min-h-0 w-full justify-start rounded-sm p-0 text-left font-[inherit] [font-size:inherit] leading-[inherit] text-inherit hover:bg-transparent',
      },
      size: {
        lg: 'h-14 px-5 text-[17px]',
        md: 'h-13 px-4 text-base',
        sm: 'h-11 px-4 text-base',
        icon: 'size-11',
        auto: '',
      },
    },
    compoundVariants: [
      { variant: 'link', className: `h-auto px-0 ${TEXT_TAP_AREA}` },
      { variant: 'inline', className: `h-auto px-0 ${TEXT_TAP_AREA}` },
    ],
    defaultVariants: { variant: 'primary', size: 'lg' },
  },
);

type Variant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

// The raw shadcn variant underneath each of ours, so no upstream default (bg-primary) leaks through.
const UI_VARIANTS = {
  primary: 'default',
  outline: 'outline',
  ghost: 'ghost',
  link: 'link',
  inline: 'ghost',
} as const satisfies Record<Variant, ComponentProps<typeof UiButton>['variant']>;

export type ButtonProps = Omit<ComponentProps<typeof UiButton>, 'variant' | 'size'> &
  VariantProps<typeof buttonVariants>;

/** The app's button: ink primary, outlined secondary, link and inline text styles. */
export function Button({ variant: variantProp, size, className, ...props }: ButtonProps) {
  const variant: Variant = variantProp ?? 'primary';
  const resolvedSize = variant === 'link' || variant === 'inline' ? 'auto' : size;
  return (
    <UiButton
      variant={UI_VARIANTS[variant]}
      className={cn(buttonVariants({ variant, size: resolvedSize }), className)}
      {...props}
    />
  );
}
