import { EventBus } from './events.js';
import { AudioEngine } from './audio.js';
import { InputManager } from './input.js';
import { VersionedStore } from './storage.js';
import { Renderer } from './render.js';
import { Game } from './game.js';
import { defaultConfig } from './data.js';

const canvas = document.getElementById('game');
const nameOverlay = document.getElementById('nameOverlay');
const nameInput = document.getElementById('nameInput');
const modeSelect = document.getElementById('modeSelect');
const deflSelect = document.getElementById('deflSelect');
const jitterCheck = document.getElementById('jitterCheck');
const crtCheck = document.getElementById('crtCheck');
const audioCheck = document.getElementById('audioCheck');
const resetBtn = document.getElementById('resetBtn');
const fsBtn = document.getElementById('fsBtn');

const bus = new EventBus();
const storage = new VersionedStore();
const saved = storage.getSettings();
const config = { ...defaultConfig(), ...(saved.config || {}) };
const audio = new AudioEngine(bus);
audio.setEnabled(config.audioEnabled);
audio.setVolumes(0.8, config.musicVolume, config.sfxVolume);

const input = new InputManager(canvas, config);
const renderer = new Renderer(canvas);
const game = new Game(config, bus, input, audio, storage);

function syncUI() {
  modeSelect.value = game.config.mode;
  deflSelect.value = game.config.deflectionModel;
  jitterCheck.checked = game.config.jitterEnabled;
  audioCheck.checked = game.config.audioEnabled;
  document.getElementById('screen').classList.toggle('crt', crtCheck.checked);
}
syncUI();

function saveConfig() {
  storage.saveSettings({ schemaVersion: 1, config: game.config, remaps: { keyboard: {}, gamepad: {} } });
}

modeSelect.addEventListener('change', (e) => { game.config.mode = e.target.value; game.mode = e.target.value; saveConfig(); });
deflSelect.addEventListener('change', (e) => { game.config.deflectionModel = e.target.value; saveConfig(); });
jitterCheck.addEventListener('change', (e) => { game.config.jitterEnabled = e.target.checked; saveConfig(); });
audioCheck.addEventListener('change', (e) => {
  game.config.audioEnabled = e.target.checked;
  audio.setEnabled(e.target.checked);
  saveConfig();
});
crtCheck.addEventListener('change', (e) => { document.getElementById('screen').classList.toggle('crt', e.target.checked); });
resetBtn.addEventListener('click', () => { storage.resetLeaderboard(); game.highScore = 0; });
fsBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    game.submitName(nameInput.value);
    nameOverlay.classList.remove('active');
    nameInput.value = '';
  }
});
nameInput.addEventListener('blur', () => {
  if (game.state === 'NAME_ENTRY') {
    game.submitName(nameInput.value);
    nameOverlay.classList.remove('active');
    nameInput.value = '';
  }
});

bus.on('NAME_ENTRY_STARTED', () => {
  nameOverlay.classList.add('active');
  nameInput.value = '';
  nameInput.focus();
});

// Unlock audio on first user gesture.
function unlock() {
  audio.unlock();
  canvas.removeEventListener('pointerdown', unlock);
  canvas.removeEventListener('keydown', unlock);
}
canvas.addEventListener('pointerdown', unlock);
canvas.addEventListener('keydown', unlock);

const TICK_MS = 1000 / 60;
let last = performance.now();
let accum = 0;
let frames = 0;

game.start();

function loop(now) {
  const dt = now - last;
  last = now;
  accum += dt;
  let steps = 0;
  while (accum >= TICK_MS && steps < 5) {
    game.fixedStep();
    accum -= TICK_MS;
    steps++;
  }
  if (accum > TICK_MS * 5) accum = TICK_MS * 5;
  renderer.draw(game);
  frames++;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
