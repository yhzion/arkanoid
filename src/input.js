// Device-agnostic per-tick input (PRD §9, §30.6).

const DEFAULT_KEYBOARD = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyZ', 'KeyJ'],
  cheatB: ['KeyX'],
  start: ['Enter', 'KeyP'],
  select: ['ShiftLeft', 'ShiftRight', 'Tab'],
  mute: ['KeyM'],
  fullscreen: ['KeyF'],
};

export class InputManager {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.config = config;
    this.mode = config.inputMode || 'keyboard';
    this.remaps = { ...(config.remaps?.keyboard || {}) };
    this.raw = { left: false, right: false, fire: false, cheatB: false, start: false, select: false, mute: false, fullscreen: false };
    this.pointer = { active: false, x: 0, lastX: 0, delta: 0, rightHalf: false };
    this.prevSnapshot = null;
    this.continueCode = { aBHeld: false, selectPresses: 0, startPressed: false };
    this._boundKey = this._onKey.bind(this);
    this._boundPointer = this._onPointer.bind(this);
    window.addEventListener('keydown', this._boundKey);
    window.addEventListener('keyup', this._boundKey);
    canvas.addEventListener('pointerdown', this._boundPointer);
    canvas.addEventListener('pointermove', this._boundPointer);
    canvas.addEventListener('pointerup', this._boundPointer);
    canvas.addEventListener('pointercancel', this._boundPointer);
    this._preventContextMenu = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', this._preventContextMenu);
  }

  setMode(mode) { this.mode = mode; }

  _isDown(action, e) {
    const codes = this.remaps[action] || DEFAULT_KEYBOARD[action];
    return codes && codes.includes(e.code);
  }

  _onKey(e) {
    const down = e.type === 'keydown';
    if (this._isDown('left', e)) this.raw.left = down;
    if (this._isDown('right', e)) this.raw.right = down;
    if (this._isDown('fire', e)) this.raw.fire = down;
    if (this._isDown('cheatB', e)) this.raw.cheatB = down;
    if (this._isDown('start', e)) this.raw.start = down;
    if (this._isDown('select', e)) this.raw.select = down;
    if (this._isDown('mute', e) && down) this.raw.mute = true;
    if (this._isDown('fullscreen', e) && down) this.raw.fullscreen = true;
  }

  _toLogicalX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    return Math.round(((clientX - rect.left) / rect.width) * this.canvas.width);
  }

  _onPointer(e) {
    e.preventDefault();
    const down = e.type === 'pointerdown';
    const up = e.type === 'pointerup' || e.type === 'pointercancel';
    const lx = this._toLogicalX(e.clientX);
    const rightHalf = lx > this.canvas.width / 2;
    if (down) {
      this.pointer.active = true;
      this.pointer.lastX = lx;
      this.pointer.x = lx;
      this.pointer.delta = 0;
      this.pointer.rightHalf = rightHalf;
      this.raw.fire = rightHalf || true;
      this.canvas.setPointerCapture?.(e.pointerId);
    } else if (up) {
      this.pointer.active = false;
      this.raw.fire = false;
    } else {
      this.pointer.x = lx;
      this.pointer.delta += lx - this.pointer.lastX;
      this.pointer.lastX = lx;
      this.pointer.rightHalf = rightHalf;
      this.raw.fire = rightHalf;
      if (this.mode === 'absolute-pointer') this.pointer.targetX = lx;
    }
  }

  _readGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gp = navigator.getGamepads()[0];
    if (!gp) return;
    const dead = 0.2;
    if (gp.axes[0] < -dead || gp.buttons[14]?.pressed) this.raw.left = true;
    if (gp.axes[0] > dead || gp.buttons[15]?.pressed) this.raw.right = true;
    if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) this.raw.fire = true;
    if (gp.buttons[9]?.pressed) this.raw.start = true;
    if (gp.buttons[8]?.pressed) this.raw.select = true;
  }

  reset() { this.prevSnapshot = null; }

  getSnapshot(currentPaddleFx, vausWidthFx) {
    this._readGamepad();
    const snap = {
      left: this.raw.left,
      right: this.raw.right,
      fire: this.raw.fire,
      start: this.raw.start,
      select: this.raw.select,
      mute: this.raw.mute,
      fullscreen: this.raw.fullscreen,
      fireEdge: false,
      startEdge: false,
      selectEdge: false,
      paddleXFx: currentPaddleFx,
    };

    // Pointer movement
    if (this.pointer.active && (this.mode === 'relative-pointer' || this.mode === 'touch')) {
      const sens = this.mode === 'touch' ? 1.5 : 1.0;
      let d = Math.round(this.pointer.delta * sens);
      this.pointer.delta -= d / sens; // consume integer part
      snap.paddleXFx = currentPaddleFx + d * FX;
    } else if (this.pointer.active && this.mode === 'absolute-pointer') {
      snap.paddleXFx = (this.pointer.targetX * FX) - vausWidthFx / 2;
    } else {
      // digital movement
      if (this.raw.left) snap.paddleXFx = currentPaddleFx - 3 * FX;
      if (this.raw.right) snap.paddleXFx = currentPaddleFx + 3 * FX;
    }

    if (this.prevSnapshot) {
      snap.fireEdge = snap.fire && !this.prevSnapshot.fire;
      snap.startEdge = snap.start && !this.prevSnapshot.start;
      snap.selectEdge = snap.select && !this.prevSnapshot.select;
    } else {
      snap.fireEdge = snap.fire;
      snap.startEdge = snap.start;
      snap.selectEdge = snap.select;
    }

    this.prevSnapshot = { ...snap };
    // Clear one-shot flags
    this.raw.mute = false;
    this.raw.fullscreen = false;
    return snap;
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKey);
    window.removeEventListener('keyup', this._boundKey);
    this.canvas.removeEventListener('pointerdown', this._boundPointer);
    this.canvas.removeEventListener('pointermove', this._boundPointer);
    this.canvas.removeEventListener('pointerup', this._boundPointer);
    this.canvas.removeEventListener('pointercancel', this._boundPointer);
    this.canvas.removeEventListener('contextmenu', this._preventContextMenu);
  }
}
