import { GameEngine } from './GameEngine';
import { DEFAULT_CONFIG } from '../core/GameConfig';
import { resetLeaderboard } from '../persistence/storage';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const overlay = document.getElementById('click-to-start') as HTMLDivElement;
const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;

function resizeCanvas() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const scale = Math.min(Math.floor(maxW / 256), Math.floor(maxH / 240)) || 1;
  canvas.style.width = `${256 * scale}px`;
  canvas.style.height = `${240 * scale}px`;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let engine: GameEngine | null = null;

overlay.addEventListener('click', async () => {
  overlay.classList.add('hidden');
  engine = new GameEngine(canvas, DEFAULT_CONFIG);
  await engine.audio.unlock();
  engine.start();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    if (!document.fullscreenElement) canvas.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  if (e.code === 'KeyM' && engine) {
    engine.audio.muted = !engine.audio.muted;
    engine.audio.updateVolumes();
  }
  if (e.code === 'Escape') {
    settingsPanel.classList.toggle('visible');
  }
});

document.getElementById('vol-master')?.addEventListener('input', (e) => {
  if (!engine) return;
  engine.audio.masterVolume = (e.target as HTMLInputElement).valueAsNumber / 100;
  engine.audio.updateVolumes();
});
document.getElementById('vol-music')?.addEventListener('input', (e) => {
  if (!engine) return;
  engine.audio.musicVolume = (e.target as HTMLInputElement).valueAsNumber / 100;
  engine.audio.updateVolumes();
});
document.getElementById('vol-sfx')?.addEventListener('input', (e) => {
  if (!engine) return;
  engine.audio.sfxVolume = (e.target as HTMLInputElement).valueAsNumber / 100;
  engine.audio.updateVolumes();
});
document.getElementById('reset-scores')?.addEventListener('click', () => {
  resetLeaderboard();
});
