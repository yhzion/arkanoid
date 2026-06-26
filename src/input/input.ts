import { loadSettings } from '../core/persistence';

export interface InputSnapshot {
    left: boolean;
    right: boolean;
    fire: boolean;
    start: boolean;
    select: boolean;
    pointerXDelta: number; // in logical pixels
    pointerXAbsolute: number; // in logical pixels
    pointerClicked: boolean;
}

export class InputManager {
    private canvas: HTMLCanvasElement | null = null;
    private keyState: Record<string, boolean> = {};
    private keyPresses: Record<string, boolean> = {}; // single frame trigger
    
    // Pointer states
    private pointerX: number = 128; // default to center
    private pointerDeltaX: number = 0;
    private pointerClicked: boolean = false;
    private lastPointerX: number | null = null;

    // Mobile touch states
    private touchStartX: number | null = null;
    private oscLeftActive: boolean = false;
    private oscRightActive: boolean = false;
    private oscFireActive: boolean = false;

    // Remaps from persistence
    private keyboardRemaps: Record<string, string> = {};
    private gamepadRemaps: Record<string, number> = {};

    constructor() {
        this.updateRemaps();
    }

    public updateRemaps(): void {
        const settings = loadSettings();
        this.keyboardRemaps = settings.remaps.keyboard;
        this.gamepadRemaps = settings.remaps.gamepad;
    }

    public bindEvents(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mouseup', this.handleMouseUp);
        
        // Touch events
        canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    public unbindEvents(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        }
    }

    private handleKeyDown = (e: KeyboardEvent): void => {
        this.keyState[e.code] = true;
        this.keyPresses[e.code] = true;
        
        // Prevent default behavior for arrow keys, space, tab, backspace, enter
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'Backspace', 'Enter'].includes(e.code)) {
            e.preventDefault();
        }
    };

    private handleKeyUp = (e: KeyboardEvent): void => {
        this.keyState[e.code] = false;
    };

    private getLogicalX(clientX: number): number {
        if (!this.canvas) return 128;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return 128;
        // Logical canvas is 256 wide
        return Math.round(((clientX - rect.left) / rect.width) * 256);
    }

    private handleMouseMove = (e: MouseEvent): void => {
        const currentLogicalX = this.getLogicalX(e.clientX);
        if (this.lastPointerX !== null) {
            this.pointerDeltaX += currentLogicalX - this.lastPointerX;
        }
        this.lastPointerX = currentLogicalX;
        this.pointerX = currentLogicalX;
    };

    private handleMouseDown = (e: MouseEvent): void => {
        if (e.button === 0) {
            this.pointerClicked = true;
        }
    };

    private handleMouseUp = (e: MouseEvent): void => {
        if (e.button === 0) {
            this.pointerClicked = false;
        }
    };

    private handleTouchStart = (e: TouchEvent): void => {
        e.preventDefault();
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const currentLogicalX = this.getLogicalX(touch.clientX);
        this.touchStartX = currentLogicalX;
        this.lastPointerX = currentLogicalX;
        this.pointerX = currentLogicalX;
        this.pointerClicked = true;
    };

    private handleTouchMove = (e: TouchEvent): void => {
        e.preventDefault();
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const currentLogicalX = this.getLogicalX(touch.clientX);
        
        if (this.lastPointerX !== null) {
            this.pointerDeltaX += currentLogicalX - this.lastPointerX;
        }
        this.lastPointerX = currentLogicalX;
        this.pointerX = currentLogicalX;
    };

    private handleTouchEnd = (e: TouchEvent): void => {
        e.preventDefault();
        this.touchStartX = null;
        this.lastPointerX = null;
        this.pointerClicked = false;
    };

    private checkKeyboardAction(action: string): boolean {
        const keyCode = this.keyboardRemaps[action];
        return !!this.keyState[keyCode];
    }

    private checkKeyboardTrigger(action: string): boolean {
        const keyCode = this.keyboardRemaps[action];
        const pressed = !!this.keyPresses[keyCode];
        if (pressed) {
            this.keyPresses[keyCode] = false;
        }
        return pressed;
    }

    private checkGamepadAction(gamepad: Gamepad, action: string): boolean {
        const buttonIdx = this.gamepadRemaps[action];
        if (buttonIdx === undefined) return false;

        // Standard mapping D-pad movements and axis
        if (action === 'left') {
            const axisVal = gamepad.axes[0]; // Left stick horizontal
            if (axisVal < -0.3) return true;
            return gamepad.buttons[14]?.pressed || false; // D-pad Left
        }
        if (action === 'right') {
            const axisVal = gamepad.axes[0]; // Left stick horizontal
            if (axisVal > 0.3) return true;
            return gamepad.buttons[15]?.pressed || false; // D-pad Right
        }

        return gamepad.buttons[buttonIdx]?.pressed || false;
    }

    public poll(inputMode: string): InputSnapshot {
        let left = false;
        let right = false;
        let fire = false;
        let start = false;
        let select = false;

        // 1. Gamepad Polling
        const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
        const activeGamepad = gamepads.find(g => g !== null && g.connected);

        // 2. Map actions depending on mode
        if (inputMode === 'keyboard') {
            left = this.checkKeyboardAction('left');
            right = this.checkKeyboardAction('right');
            fire = this.checkKeyboardAction('fire');
            start = this.checkKeyboardTrigger('start');
            select = this.checkKeyboardTrigger('select');
        } else if (inputMode === 'gamepad' && activeGamepad) {
            left = this.checkGamepadAction(activeGamepad, 'left');
            right = this.checkGamepadAction(activeGamepad, 'right');
            fire = this.checkGamepadAction(activeGamepad, 'fire');
            start = this.checkGamepadAction(activeGamepad, 'start');
            select = this.checkGamepadAction(activeGamepad, 'select');
        } else if (inputMode === 'relative-pointer' || inputMode === 'absolute-pointer') {
            left = this.checkKeyboardAction('left');
            right = this.checkKeyboardAction('right');
            fire = this.checkKeyboardAction('fire') || this.pointerClicked;
            start = this.checkKeyboardTrigger('start');
            select = this.checkKeyboardTrigger('select');
        } else if (inputMode === 'touch') {
            left = this.oscLeftActive;
            right = this.oscRightActive;
            fire = this.oscFireActive || this.pointerClicked;
            start = this.checkKeyboardTrigger('start');
            select = this.checkKeyboardTrigger('select');
        } else {
            // Fallback keyboard
            left = this.checkKeyboardAction('left');
            right = this.checkKeyboardAction('right');
            fire = this.checkKeyboardAction('fire');
            start = this.checkKeyboardTrigger('start');
            select = this.checkKeyboardTrigger('select');
        }

        // Quantize pointer values
        const delta = Math.round(this.pointerDeltaX);
        const absolute = Math.round(this.pointerX);

        // Reset relative delta after it is polled
        this.pointerDeltaX = 0;

        return {
            left,
            right,
            fire,
            start,
            select,
            pointerXDelta: delta,
            pointerXAbsolute: absolute,
            pointerClicked: this.pointerClicked
        };
    }

    // Direct controllers for touch OSC overlays
    public setOscControls(left: boolean, right: boolean, fire: boolean): void {
        this.oscLeftActive = left;
        this.oscRightActive = right;
        this.oscFireActive = fire;
    }
}

export const Input = new InputManager();
export default Input;
