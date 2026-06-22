/**
 * WebXR VR Template - Application Logic
 * Minimal, zero-build interaction using A-Frame and Web Audio synthesis.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // High-pitched retro chime (pitch slide G5 -> C6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, t);
        osc.frequency.exponentialRampToValueAtTime(1046.50, t + 0.08);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.21);
    }
}

const audio = new SoundEngine();

document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start');
    const panelStart = document.getElementById('panel-start');
    const targets = document.querySelectorAll('.target');

    // Start experience: dismiss overlay and initialize sound
    btnStart.addEventListener('click', () => {
        panelStart.classList.add('hidden');
        audio.resume();
        audio.playClick();
    });

    // Handle clicks from desktop mouse or VR controllers
    targets.forEach(target => {
        target.addEventListener('click', (event) => {
            audio.playClick();

            // Trigger VR controller haptics if clicked via controller
            const cursorEl = event.detail.cursorEl;
            if (cursorEl) {
                const trackedControls = cursorEl.components['tracked-controls-webxr'] || cursorEl.components['tracked-controls'];
                if (trackedControls && trackedControls.controller) {
                    const gamepad = trackedControls.controller.gamepad;
                    if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                        gamepad.hapticActuators[0].pulse(0.6, 80).catch(() => {});
                    }
                }
            }
        });
    });
});
