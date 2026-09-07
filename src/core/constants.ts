// Logical stage size and tick rate carried over from the original SWF (1024x768 @ 45 fps),
// so every tuning value in the AS2 source maps 1:1 onto ticks here.
export const STAGE_W = 1024;
export const STAGE_H = 768;
export const TICK_RATE = 45;
export const TICK_MS = 1000 / TICK_RATE;
export const DEG = Math.PI / 180;
