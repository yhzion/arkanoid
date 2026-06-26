// Boot layer - initializes the game
import { InputManager } from '../input/input';
import { AudioEngine } from '../audio/audio';
import { GameStateManager } from '../core/gameState';

export async function boot(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const clickToStart = document.getElementById('click-to-start') as HTMLDivElement;
  const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  const input = new InputManager();
  const audio = new AudioEngine();

  // PRD §8.1: Click to start overlay for audio policy
  const startGame = async () => {
    clickToStart.classList.add('hidden');
    await audio.init();
    await audio.resume();
    settingsPanel.classList.add('visible');

    const game = new GameStateManager(canvas, input, audio);
    game.start();
  };

  clickToStart.addEventListener('click', startGame);
  clickToStart.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startGame();
  });

  // Settings panel controls
  const masterSlider = document.getElementById('vol-master') as HTMLInputElement;
  const musicSlider = document.getElementById('vol-music') as HTMLInputElement;
  const sfxSlider = document.getElementById('vol-sfx') as HTMLInputElement;
  const crtFilter = document.getElementById('crt-filter') as HTMLInputElement;
  const resetScores = document.getElementById('reset-scores') as HTMLButtonElement;

  if (masterSlider) {
    masterSlider.addEventListener('input', () => {
      audio.setMasterVolume(parseInt(masterSlider.value) / 100);
    });
  }
  if (musicSlider) {
    musicSlider.addEventListener('input', () => {
      audio.setMusicVolume(parseInt(musicSlider.value) / 100);
    });
  }
  if (sfxSlider) {
    sfxSlider.addEventListener('input', () => {
      audio.setSfxVolume(parseInt(sfxSlider.value) / 100);
    });
  }
  if (crtFilter) {
    crtFilter.addEventListener('change', () => {
      canvas.style.filter = crtFilter.checked ? 'blur(0.5px)' : '';
    });
  }
  if (resetScores) {
    resetScores.addEventListener('click', () => {
      localStorage.removeItem('arkanoid_leaderboard');
      alert('Scores reset');
    });
  }
}