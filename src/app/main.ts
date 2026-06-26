import { GameEngine } from './GameEngine';
import { audioEngine } from '../audio/audio';
import { renderer } from '../render/renderer';

const engine = new GameEngine();

function boot(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const settingsPanel = document.getElementById('settings-panel') as HTMLElement;
  const clickToStart = document.getElementById('click-to-start') as HTMLElement;

  canvas.width = 256;
  canvas.height = 240;

  clickToStart.addEventListener('click', async () => {
    await audioEngine.unlock();
    clickToStart.classList.add('hidden');
    engine.init(canvas, settingsPanel);

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !clickToStart.classList.contains('hidden')) {
        settingsPanel.classList.toggle('visible');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', boot);
