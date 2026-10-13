/** Fixed blip slots in % of the radar. More than 8 flags still draw 8 blips. */
export const BLIP_SLOTS = [
  [66, 30],
  [34, 64],
  [74, 64],
  [28, 36],
  [54, 80],
  [40, 22],
  [80, 46],
  [22, 52],
] as const;

/** Blip pop + ping: first at +120 ms, then every 170 ms. Literal classes so Tailwind sees them. */
export const BLIP_DELAY_CLASSES = [
  '[animation-delay:120ms]',
  '[animation-delay:290ms]',
  '[animation-delay:460ms]',
  '[animation-delay:630ms]',
  '[animation-delay:800ms]',
  '[animation-delay:970ms]',
  '[animation-delay:1140ms]',
  '[animation-delay:1310ms]',
] as const;

/** Unlock recolour: 300 ms per blip, 60 ms stagger. Literal classes so Tailwind sees them. */
export const BLIP_RECOLOR_DELAY_CLASSES = [
  'delay-0',
  'delay-[60ms]',
  'delay-[120ms]',
  'delay-[180ms]',
  'delay-[240ms]',
  'delay-[300ms]',
  'delay-[360ms]',
  'delay-[420ms]',
] as const;

export const RADAR_VIEWBOX = 240;
