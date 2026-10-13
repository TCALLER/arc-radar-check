import { cn } from '@/common/utils/global-utility';

import {
  BLIP_DELAY_CLASSES,
  BLIP_RECOLOR_DELAY_CLASSES,
  BLIP_SLOTS,
  RADAR_VIEWBOX,
} from './constants';

export type RadarState = 'still' | 'sweep' | 'blips' | 'outline';
/** `neutral` in the free preview; severity colours after unlock. */
export type BlipTone = 'neutral' | 'high' | 'medium' | 'low' | 'info';

type RadarScopeProps = {
  state: RadarState;
  /** One per risk flag, in API order. */
  blips?: readonly BlipTone[];
  /** 200px phone, 260px web hero, 300px web result column. */
  size?: 'phone' | 'hero' | 'web';
  className?: string;
};

const SIZE_CLASSES = { phone: 'size-50', hero: 'size-65', web: 'size-75' } as const;

const BLIP_FILL_CLASSES: Record<BlipTone, string> = {
  neutral: 'fill-glow',
  high: 'fill-danger',
  medium: 'fill-caution',
  low: 'fill-glow',
  info: 'fill-glow',
};

const CENTER = RADAR_VIEWBOX / 2;
const toViewBox = (percent: number): number => (percent / 100) * RADAR_VIEWBOX;

/**
 * The radar scope, the page's signature element. Decorative (`aria-hidden`): the verdict text and
 * a live region carry the information. Animates only transform and opacity; reduced motion is
 * handled globally in globals.css.
 */
export function RadarScope({ state, blips = [], size = 'phone', className }: RadarScopeProps) {
  const isOutline = state === 'outline';
  const visibleBlips = state === 'blips' ? blips.slice(0, BLIP_SLOTS.length) : [];

  return (
    <div aria-hidden className={cn('relative shrink-0', SIZE_CLASSES[size], className)}>
      <svg viewBox={`0 0 ${RADAR_VIEWBOX} ${RADAR_VIEWBOX}`} className="size-full overflow-visible">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER - 1}
          className={cn(
            'transition-[fill,stroke] duration-300',
            isOutline ? 'fill-transparent stroke-outline-ring' : 'fill-scope stroke-transparent',
          )}
          strokeWidth={2}
        />
        {[CENTER * 0.33, CENTER * 0.66].map((radius) => (
          <circle
            key={radius}
            cx={CENTER}
            cy={CENTER}
            r={radius}
            fill="none"
            strokeWidth={2}
            className={isOutline ? 'stroke-outline-ring' : 'stroke-scope-ring'}
          />
        ))}
        <line
          x1={CENTER}
          y1={8}
          x2={CENTER}
          y2={RADAR_VIEWBOX - 8}
          strokeWidth={1.5}
          className={isOutline ? 'stroke-outline-ring' : 'stroke-scope-ring'}
        />
        <line
          x1={8}
          y1={CENTER}
          x2={RADAR_VIEWBOX - 8}
          y2={CENTER}
          strokeWidth={1.5}
          className={isOutline ? 'stroke-outline-ring' : 'stroke-scope-ring'}
        />
        {visibleBlips.map((tone, index) => {
          const slot = BLIP_SLOTS[index];
          if (!slot) return null;
          const [x, y] = slot;
          const delay = BLIP_DELAY_CLASSES[index];
          return (
            <g key={`${x}-${y}`} data-testid="radar-blip" data-tone={tone}>
              <circle
                cx={toViewBox(x)}
                cy={toViewBox(y)}
                r={12}
                fill="none"
                strokeWidth={2}
                className={cn(
                  'origin-center animate-blip-ping stroke-glow opacity-0 [transform-box:fill-box]',
                  delay,
                )}
              />
              <circle
                cx={toViewBox(x)}
                cy={toViewBox(y)}
                r={12}
                className={cn(
                  'origin-center animate-blip-pop [filter:var(--blip-shadow)] transition-[fill] duration-300 [transform-box:fill-box]',
                  BLIP_FILL_CLASSES[tone],
                  delay,
                  BLIP_RECOLOR_DELAY_CLASSES[index],
                )}
              />
            </g>
          );
        })}
      </svg>
      {state === 'sweep' && (
        <div className="absolute inset-0 animate-in rounded-full duration-150 fade-in">
          <div
            data-testid="radar-sweep"
            className="size-full animate-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,var(--glow)_360deg)] opacity-40"
          />
        </div>
      )}
    </div>
  );
}
