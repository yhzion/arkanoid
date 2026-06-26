/**
 * App entry — index.html loads this. Handles the "Click to Start" autoplay unlock
 * overlay (§8.1) before booting audio + the title screen.
 */
import { boot } from './boot';

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  const overlay = document.getElementById('overlay');
  if (!canvas) {
    console.error('canvas#game not found');
    return;
  }
  // Integer-scaled canvas to viewport while preserving 4:3-ish aspect (§6.1).
  const resize = () => {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / 256, window.innerHeight / 240)));
    canvas.style.width = `${256 * scale}px`;
    canvas.style.height = `${240 * scale}px`;
  };
  window.addEventListener('resize', resize);
  resize();

  const app = boot(canvas);

  const startOnce = () => {
    overlay?.remove();
    app.start();
  };
  // First user gesture unlocks audio (§8.1).
  overlay?.addEventListener('click', startOnce, { once: true });
  window.addEventListener('keydown', startOnce, { once: true });
}

main();
