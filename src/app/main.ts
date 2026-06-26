import { GameBootstrapper } from './boot';
import { FixedStepLoop } from '../core/fixedStep';
import { GameState } from '../core/gameState';
import { Audio } from '../audio/audio';
import { Input } from '../input/input';
import { loadSettings, saveSettings, resetLeaderboard } from '../core/persistence';
import { computeIntegerScale } from '../render/renderer';

/**
 * Snap the canvas wrapper to the largest integer multiple of the 256x240
 * logical resolution that fits the available space (§6.1). Falls back to the
 * fluid CSS layout when the mode is 'fit'.
 */
function applyRenderScaleMode(canvas: HTMLCanvasElement, mode: 'integer' | 'fit'): void {
    const wrapper = canvas.parentElement as HTMLElement | null;
    if (!wrapper) return;

    if (mode !== 'integer') {
        // Restore fluid layout defaults from CSS.
        wrapper.style.removeProperty('width');
        wrapper.style.removeProperty('height');
        wrapper.style.removeProperty('max-width');
        wrapper.style.removeProperty('aspect-ratio');
        return;
    }

    const apply = () => {
        const container = wrapper.parentElement ?? document.body;
        const scale = computeIntegerScale(container.clientWidth, window.innerHeight);
        wrapper.style.width = `${256 * scale}px`;
        wrapper.style.height = `${240 * scale}px`;
        wrapper.style.maxWidth = 'none';
        wrapper.style.aspectRatio = 'auto';
    };
    apply();
    window.addEventListener('resize', apply);
}

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element gameCanvas not found!');
        return;
    }

    applyRenderScaleMode(canvas, loadSettings().config.renderScaleMode);

    // Initialize bootstrapper
    const bootstrapper = new GameBootstrapper(canvas);
    await bootstrapper.boot();
    (window as any).game = bootstrapper;
    (window as any).GameState = GameState;

    // Setup loop callbacks
    const updateSim = () => {
        bootstrapper.updateTick();
        
        // Sync autoplay demo indicator tag
        const state = bootstrapper.getStateMachineState();
        const demoTag = document.getElementById('autoplay-indicator');
        if (demoTag) {
            if (state === 'GAMEPLAY_DEMO') {
                demoTag.classList.remove('hidden');
            } else {
                demoTag.classList.add('hidden');
            }
        }
    };

    const renderSim = () => {
        bootstrapper.renderFrame();
    };

    const gameLoop = new FixedStepLoop(updateSim, renderSim);

    // --- Wire up Sidebar UI Elements ---
    const settings = loadSettings();

    // 1. Audio controls
    const muteBtn = document.getElementById('mute-toggle') as HTMLButtonElement;
    const musicSlider = document.getElementById('music-slider') as HTMLInputElement;
    const sfxSlider = document.getElementById('sfx-slider') as HTMLInputElement;

    const updateMuteButtonState = () => {
        if (GameState.config.audioEnabled) {
            muteBtn.textContent = 'Mute';
            muteBtn.classList.remove('danger-btn');
        } else {
            muteBtn.textContent = 'Unmute';
            muteBtn.classList.add('danger-btn');
        }
    };
    updateMuteButtonState();

    muteBtn.addEventListener('click', () => {
        const settings = loadSettings();
        settings.config.audioEnabled = !settings.config.audioEnabled;
        saveSettings(settings);
        GameState.config.audioEnabled = settings.config.audioEnabled;
        Audio.setMuted(!GameState.config.audioEnabled);
        updateMuteButtonState();
    });

    musicSlider.value = GameState.config.musicVolume.toString();
    musicSlider.addEventListener('input', () => {
        const val = parseFloat(musicSlider.value);
        const settings = loadSettings();
        settings.config.musicVolume = val;
        saveSettings(settings);
        GameState.config.musicVolume = val;
        Audio.setMusicVolume(val);
    });

    sfxSlider.value = GameState.config.sfxVolume.toString();
    sfxSlider.addEventListener('input', () => {
        const val = parseFloat(sfxSlider.value);
        const settings = loadSettings();
        settings.config.sfxVolume = val;
        saveSettings(settings);
        GameState.config.sfxVolume = val;
        Audio.setSfxVolume(val);
    });

    // 2. Configuration Selects
    const regionSelect = document.getElementById('region-select') as HTMLSelectElement;
    const inputSelect = document.getElementById('input-mode-select') as HTMLSelectElement;
    const deflectionSelect = document.getElementById('deflection-select') as HTMLSelectElement;
    const jitterBtn = document.getElementById('jitter-toggle') as HTMLButtonElement;
    const levelSkipBtn = document.getElementById('level-skip-toggle') as HTMLButtonElement;
    
    // OSC overlay panel
    const oscControls = document.getElementById('osc-controls') as HTMLDivElement;

    regionSelect.value = GameState.config.region;
    regionSelect.addEventListener('change', () => {
        const settings = loadSettings();
        settings.config.region = regionSelect.value as 'US' | 'JP';
        saveSettings(settings);
        GameState.config.region = settings.config.region;
    });

    const updateOscControlsVisibility = () => {
        if (GameState.config.inputMode === 'touch') {
            oscControls.classList.remove('hidden');
        } else {
            oscControls.classList.add('hidden');
        }
    };

    inputSelect.value = GameState.config.inputMode;
    updateOscControlsVisibility();
    inputSelect.addEventListener('change', () => {
        const settings = loadSettings();
        settings.config.inputMode = inputSelect.value as any;
        saveSettings(settings);
        GameState.config.inputMode = settings.config.inputMode;
        updateOscControlsVisibility();
    });

    deflectionSelect.value = GameState.config.deflectionModel;
    deflectionSelect.addEventListener('change', () => {
        const settings = loadSettings();
        settings.config.deflectionModel = deflectionSelect.value as any;
        saveSettings(settings);
        GameState.config.deflectionModel = settings.config.deflectionModel;
    });

    const updateJitterButtonState = () => {
        if (GameState.config.jitterEnabled) {
            jitterBtn.textContent = 'Enabled';
            jitterBtn.style.color = 'var(--accent-cyan)';
            jitterBtn.style.borderColor = 'var(--accent-cyan)';
        } else {
            jitterBtn.textContent = 'Disabled';
            jitterBtn.style.color = '';
            jitterBtn.style.borderColor = '';
        }
    };
    updateJitterButtonState();
    jitterBtn.addEventListener('click', () => {
        const settings = loadSettings();
        settings.config.jitterEnabled = !settings.config.jitterEnabled;
        saveSettings(settings);
        GameState.config.jitterEnabled = settings.config.jitterEnabled;
        updateJitterButtonState();
    });

    const updateLevelSkipButtonState = () => {
        if (GameState.config.enableManualLevelSkipSecret) {
            levelSkipBtn.textContent = 'Enabled';
            levelSkipBtn.style.color = 'var(--accent-cyan)';
            levelSkipBtn.style.borderColor = 'var(--accent-cyan)';
        } else {
            levelSkipBtn.textContent = 'Disabled';
            levelSkipBtn.style.color = '';
            levelSkipBtn.style.borderColor = '';
        }
    };
    updateLevelSkipButtonState();
    levelSkipBtn.addEventListener('click', () => {
        const settings = loadSettings();
        settings.config.enableManualLevelSkipSecret = !settings.config.enableManualLevelSkipSecret;
        saveSettings(settings);
        GameState.config.enableManualLevelSkipSecret = settings.config.enableManualLevelSkipSecret;
        updateLevelSkipButtonState();
    });

    // 3. Reset Leaderboard
    const resetLBtn = document.getElementById('reset-leaderboard-btn') as HTMLButtonElement;
    resetLBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the High Scores leaderboard? This cannot be undone.')) {
            resetLeaderboard();
            // Force redraw overlays by reloading high score data
            GameState.syncHighScore();
            alert('Leaderboard reset successfully!');
        }
    });

    // 4. Go Fullscreen
    const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
    fullscreenBtn.addEventListener('click', () => {
        const cabinet = document.querySelector('.cabinet-frame');
        if (cabinet) {
            if (!document.fullscreenElement) {
                cabinet.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    });

    // --- On-Screen Touch Controls (OSC) ---
    const oscLeft = document.getElementById('osc-left-btn') as HTMLDivElement;
    const oscRight = document.getElementById('osc-right-btn') as HTMLDivElement;
    const oscFire = document.getElementById('osc-fire-btn') as HTMLDivElement;

    let oscLeftPressed = false;
    let oscRightPressed = false;
    let oscFirePressed = false;

    const updateOscState = () => {
        Input.setOscControls(oscLeftPressed, oscRightPressed, oscFirePressed);
    };

    // Helper functions for touch mapping
    const bindOscBtn = (btn: HTMLDivElement, pressCallback: (p: boolean) => void) => {
        const start = (e: TouchEvent) => {
            e.preventDefault();
            pressCallback(true);
            updateOscState();
        };
        const end = (e: TouchEvent) => {
            e.preventDefault();
            pressCallback(false);
            updateOscState();
        };
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        // Also support click fallback
        btn.addEventListener('mousedown', () => { pressCallback(true); updateOscState(); });
        btn.addEventListener('mouseup', () => { pressCallback(false); updateOscState(); });
        btn.addEventListener('mouseleave', () => { pressCallback(false); updateOscState(); });
    };

    bindOscBtn(oscLeft, (p) => { oscLeftPressed = p; });
    bindOscBtn(oscRight, (p) => { oscRightPressed = p; });
    bindOscBtn(oscFire, (p) => { oscFirePressed = p; });

    // --- High score Name Entry keyboard listener ---
    window.addEventListener('keydown', (e) => {
        const state = bootstrapper.getStateMachineState();
        if (state === 'NAME_ENTRY') {
            if (e.key === 'Backspace' || e.key === 'Enter' || /^[a-zA-Z0-9]$/.test(e.key)) {
                e.preventDefault();
                bootstrapper.handleInitialsInput(e.key);
            }
        }
    });

    // --- Audio Autoplay Unlock Overlay ---
    const unlockOverlay = document.getElementById('audio-unlock-overlay') as HTMLDivElement;
    const unlockBtn = document.getElementById('audio-unlock-btn') as HTMLButtonElement;

    unlockBtn.addEventListener('click', async () => {
        // Unlock audio context on user gesture
        await Audio.unlock();
        
        // Hide overlay
        unlockOverlay.classList.add('hidden');
        
        // Start FixedStep loop
        gameLoop.start();
    });
});
