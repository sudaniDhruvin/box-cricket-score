export type TossSide = 'heads' | 'tails';

/** Unbiased heads/tails — avoids weak `Math.random()` on some devices. */
export function randomTossSide(): TossSide {
  const crypto = (
    globalThis as typeof globalThis & {
      crypto?: { getRandomValues?: (buf: Uint32Array) => void };
    }
  ).crypto;

  if (crypto?.getRandomValues != null) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % 2 === 0 ? 'heads' : 'tails';
  }

  return Math.random() < 0.5 ? 'heads' : 'tails';
}

/** Degrees to rotate forward so the coin ends showing `landed` (mod 360). */
export function tossSpinTargetDegrees(
  currentRotateY: number,
  landed: TossSide,
  fullRotations: number,
): number {
  const targetNorm = landed === 'heads' ? 0 : 180;
  const startNorm = ((currentRotateY % 360) + 360) % 360;
  let delta = (targetNorm - startNorm + 360) % 360;
  if (delta === 0) {
    delta = 360;
  }
  return currentRotateY + 360 * fullRotations + delta;
}
