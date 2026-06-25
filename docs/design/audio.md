# Audio Engine

*Reference: `prd.md` Sections 17.4 and 17.5*

## 1. Implementation Concept

A Web Audio API engine. Audio is event-driven and decoupled from game rules: the
system subscribes to the `EventBus` (see `docs/design/event_bus.md`) and reacts to
cues. SFX events map to the §17.3 inventory; BGM cues are driven by state/round
events (e.g. `GAME_STARTED`, `ROUND_STARTED`, `ROUND_CLEARED`, `GAME_OVER`).

- Master / music / SFX volume and mute, sourced from `GameConfig` (§25:
  `audioEnabled`, `musicVolume`, `sfxVolume`).
- Resume audio after browser interaction restrictions (autoplay unlock); the
  `AudioContext` starts suspended and is resumed on first user gesture.
- Pre-decoded buffer cache, populated at round-load time.
- SFX must begin playback within **50 ms** of the triggering game event under
  normal conditions (§17.4; measured as part of §20.5 acceptance, tolerance in §34).

## 2. Interface Skeleton

```ts
interface AudioEngine {
  init(config: GameConfig): Promise<void>;
  unlock(): Promise<void>;          // resume AudioContext on user gesture
  preloadRound(roundId: number): Promise<void>; // decode + cache buffers
  setMasterVolume(v: number): void;
  setMusicVolume(v: number): void;  // GameConfig.musicVolume
  setSfxVolume(v: number): void;    // GameConfig.sfxVolume
  setMuted(muted: boolean): void;   // GameConfig.audioEnabled
}
```

## 3. Event Routing

```text
EventBus ──> AudioEngine
  SFX cues (§17.3): BALL_LAUNCHED, BRICK_HIT, BRICK_DESTROYED, LASER_FIRED, ...
  BGM cues (state/round): GAME_STARTED, ROUND_STARTED, ROUND_CLEARED, GAME_OVER
```

Do not couple audio to game rules. The engine reacts to events only; gameplay logic
lives elsewhere. The complete event→SFX cue-sheet is `[DEFERRED → M4]` (§17.3).

## 4. NES-Style Audio Fallback

When original audio is not licensed (§17.5), synthesize NES-inspired cues emulating
the NES APU channels:

```text
Pulse 1 | Pulse 2 | Triangle | Noise
```

- Preserve event timing and functional role, not exact melody or waveform.
- **Voice stealing:** SFX take priority and temporarily hijack their assigned
  channels from background-music tracks, restoring the music channels once the SFX
  finishes playing.

## 5. Asset Pack Selection

Licensed vs clean-room audio packs are selected by the asset pipeline
(`docs/assets/asset_pipeline.md`, §4 / §17.1), keyed on `GameConfig.mode`
(`licensed-fidelity` | `clean-room`). The engine consumes whichever pack the
pipeline supplies; the fallback synthesis (§4) covers clean-room mode.
