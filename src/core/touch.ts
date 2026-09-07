import type { Input } from './input';

const RADIUS = 60; // base radius in CSS px
const DEADZONE = 0.18;

/**
 * Touch controls for phones. A thumbstick in the bottom-left corner sets heading;
 * dragging the thumb outside the ring engages full thrust. A tap anywhere else fires.
 * Enabled when the device reports a coarse pointer or the first touch arrives.
 */
export function attachTouch(input: Input): void {
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="stick"><div class="knob"></div></div>
    <button class="pause" type="button" aria-label="Pause">||</button>
  `;
  document.body.appendChild(root);

  const stick = root.querySelector<HTMLDivElement>('.stick')!;
  const knob = root.querySelector<HTMLDivElement>('.knob')!;
  const pauseBtn = root.querySelector<HTMLButtonElement>('.pause')!;

  // iOS ignores user-scalable=no; kill double-tap and pinch zoom by hand so a
  // fumbled tap on the stick can't zoom the page into an unrecoverable state.
  const block = (e: Event) => e.preventDefault();
  document.addEventListener('dblclick', block, { passive: false });
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = performance.now();
      if (now - lastTouchEnd < 350) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  const enable = () => document.body.classList.add('touch');
  if (matchMedia('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', enable, { once: true, passive: true });

  // ---- thumbstick ----------------------------------------------------------
  let stickPointer: number | null = null;

  const setKnob = (dx: number, dy: number) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx *= RADIUS / len;
      dy *= RADIUS / len;
    }
    setKnob(dx, dy);
    // Inside the ring: steer only. Push the thumb past the ring: full throttle.
    const throttle = len > RADIUS ? 1 : 0;
    stick.classList.toggle('thrust', throttle > 0);
    input.stick =
      len < RADIUS * DEADZONE
        ? { angle: input.stick?.angle ?? 0, throttle: 0 }
        : { angle: Math.atan2(dx, -dy) * (180 / Math.PI), throttle };
  };

  stick.addEventListener('pointerdown', (e) => {
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add('active');
    moveStick(e);
    e.stopPropagation();
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickPointer) moveStick(e);
  });
  const releaseStick = (e: PointerEvent) => {
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    stick.classList.remove('active', 'thrust');
    setKnob(0, 0);
    input.stick = null;
  };
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);

  // ---- pause button --------------------------------------------------------
  pauseBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  pauseBtn.addEventListener('click', () => input.press('pause'));
  // 'pause' is edge-triggered; release right after so the next tap toggles again.
  pauseBtn.addEventListener('click', () => setTimeout(() => input.release('pause'), 50));

  // ---- tap anywhere else to fire ------------------------------------------
  const firing = new Set<number>();
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    firing.add(e.pointerId);
    input.press('fire');
  });
  const endFire = (e: PointerEvent) => {
    if (!firing.delete(e.pointerId)) return;
    if (firing.size === 0) input.release('fire');
  };
  window.addEventListener('pointerup', endFire);
  window.addEventListener('pointercancel', endFire);
}
