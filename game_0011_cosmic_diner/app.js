/**
 * Cosmic Diner - WebVR Bartender Arcade
 * Core gameplay logic, Web Audio synthesizer engine, and A-Frame loops.
 */

// ============================================================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ============================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.musicPlaying = false;
        this.musicIntervalId = null;
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

    startAmbientMusic() {
        this.resume();
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;

        const playSwell = () => {
            if (!this.musicPlaying || !this.ctx) return;
            const t = this.ctx.currentTime;

            // Space diner jazz progression: soft detuned synthesizer sweeps
            const chords = [
                [110.00, 164.81, 220.00, 277.18, 329.63], // Amaj7
                [116.54, 174.61, 233.08, 293.66, 349.23], // Bbmaj7
                [98.00, 146.83, 196.00, 246.94, 293.66],  // Gmaj7
                [110.00, 164.81, 196.00, 261.63, 311.13]  // Am7(b5)
            ];

            const chord = chords[Math.floor(Math.random() * chords.length)];
            const attack = 3.0;
            const sustain = 4.0;
            const release = 3.0;
            const duration = attack + sustain + release;

            chord.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                // Slight detuning for retro sci-fi chorus effect
                osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, t);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.015, t + attack);
                gain.gain.setValueAtTime(0.015, t + attack + sustain);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.1);
            });
        };

        playSwell();
        this.musicIntervalId = setInterval(playSwell, 9000);
    }

    stopAmbientMusic() {
        this.musicPlaying = false;
        if (this.musicIntervalId) {
            clearInterval(this.musicIntervalId);
            this.musicIntervalId = null;
        }
    }

    playClink() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // High mechanical chime for cup spawn
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
    }

    playPour() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Low bubbling sound (modulated frequency)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(240, t + 0.35);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.36);
    }

    playSelect() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // High chirp on selecting/deselecting cup
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.11);
    }

    playSlide() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Woosh sliding pitch
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.5);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.51);
    }

    playSuccess() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        // Happy pentatonic arpeggio (reward chime)
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(noteStart + 0.26);
        });
    }

    playMismatch() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Detuned buzzer sound
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(120, t);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(122, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.46);
        osc2.stop(t + 0.46);
    }

    playStartFanfare() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        // Rising sci-fi fanfare arpeggio
        const notes = [196.00, 261.63, 329.63, 392.00, 523.25, 783.99]; // G3 to G5

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.06;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(noteStart + 0.31);
        });
    }

    playGameOver() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        // Low minor chord fading out
        const notes = [220.00, 261.63, 329.63, 165.00]; // A3, C4, E4, E3

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.12;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(noteStart + 0.61);
        });
    }

    playFizz() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        
        // Generate white noise for drain disposal fizzing
        const bufferSize = this.ctx.sampleRate * 0.3; // 0.3s
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(400, t + 0.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start(t);
        noise.stop(t + 0.31);
    }
}

const audio = new SoundEngine();

// ============================================================================
// 2. GAME STATE CONFIGURATION
// ============================================================================
const DRINK_COLORS = {
    // Hex and human name matching formulas
    'EMPTY': { hex: '#e2e8f0', name: 'EMPTY', isEmissive: false },
    'RED': { hex: '#ff0055', name: 'RED', isEmissive: true },
    'GREEN': { hex: '#00ff66', name: 'GREEN', isEmissive: true },
    'BLUE': { hex: '#0066ff', name: 'BLUE', isEmissive: true },
    'PURPLE': { hex: '#d300ff', name: 'PURPLE', isEmissive: true },
    'CYAN': { hex: '#00f3ff', name: 'CYAN', isEmissive: true },
    'YELLOW': { hex: '#ffff00', name: 'YELLOW', isEmissive: true },
    'WHITE': { hex: '#ffffff', name: 'WHITE', isEmissive: true }
};

const game = {
    cash: 0,
    highscore: parseInt(localStorage.getItem('cosmic_diner_highscore') || '0', 10),
    servedCount: 0,
    lives: 3,
    active: false,
    
    // Active cup on the mixing pad
    activeCup: {
        spawned: false,
        selected: false,
        ingredients: {
            red: false,
            green: false,
            blue: false
        },
        colorName: 'EMPTY',
        colorHex: '#e2e8f0'
    },
    
    // 3 Customer Slots
    customerSlots: [
        {
            id: 0,
            active: false,
            orderColorName: '',
            orderColorHex: '',
            patienceRemaining: 0,
            patienceDuration: 28000, // in ms
            bobOffset: 0,
            spawnTimerId: null,
            basePos: { x: -0.75, y: 1.25, z: -1.5 }
        },
        {
            id: 1,
            active: false,
            orderColorName: '',
            orderColorHex: '',
            patienceRemaining: 0,
            patienceDuration: 28000,
            bobOffset: Math.PI * 0.6,
            spawnTimerId: null,
            basePos: { x: 0, y: 1.25, z: -1.65 }
        },
        {
            id: 2,
            active: false,
            orderColorName: '',
            orderColorHex: '',
            patienceRemaining: 0,
            patienceDuration: 28000,
            bobOffset: Math.PI * 1.2,
            spawnTimerId: null,
            basePos: { x: 0.75, y: 1.25, z: -1.5 }
        }
    ],

    // Sliding Cup animation state
    sliding: false,
    slideProgress: 0, // 0.0 to 1.0
    slideStartPos: { x: 0, y: 1.03, z: -0.45 },
    slideTargetPos: { x: 0, y: 0, z: 0 },
    slideColorHex: '',
    slideTargetCustomerId: null,
    
    // VR controller connection counter
    controllersConnected: 0
};

// ============================================================================
// 3. UI ELEMENT REFERENCES
// ============================================================================
let UI = {};

function initUIReferences() {
    UI = {
        // 2D Overlays
        panelStart: document.getElementById('panel-start'),
        panelGameOver: document.getElementById('panel-gameover'),
        btnStart: document.getElementById('btn-start'),
        btnRestart: document.getElementById('btn-restart'),
        uiLayer: document.getElementById('ui-layer'),
        helpCard: document.getElementById('help-card'),
        
        // 2D HUD Info
        hud: document.getElementById('hud'),
        hudCash: document.getElementById('hud-cash-val'),
        hudCustomers: document.getElementById('hud-customers-val'),
        hudLives: document.getElementById('hud-lives-val'),
        
        // 2D Game Over Panel Stats
        statFinalCash: document.getElementById('stat-final-cash'),
        statFinalServed: document.getElementById('stat-final-served'),
        statHighScore: document.getElementById('stat-high-score'),
        newRecordIndicator: document.getElementById('new-record-indicator'),
        
        // 3D VR Signs and Panels
        vrBtnStart: document.getElementById('vr-btn-start'),
        vrBtnRestart: document.getElementById('vr-btn-restart'),
        vrHud: document.getElementById('vr-hud'),
        vrHudCash: document.getElementById('vr-hud-cash'),
        vrHudLives: document.getElementById('vr-hud-lives'),
        vrHudStatus: document.getElementById('vr-hud-status'),
        
        // Taps and Spouts
        tapRed: document.getElementById('tap-red'),
        tapGreen: document.getElementById('tap-green'),
        tapBlue: document.getElementById('tap-blue'),
        pourRed: document.getElementById('pour-red'),
        pourGreen: document.getElementById('pour-green'),
        pourBlue: document.getElementById('pour-blue'),
        
        // Cup Station
        cupDispenser: document.getElementById('cup-dispenser'),
        disposalDrain: document.getElementById('disposal-drain'),
        activeCup: document.getElementById('active-cup'),
        activeCupLiquid: document.getElementById('active-cup-liquid'),
        cupSelectionRing: document.getElementById('cup-selection-ring'),
        
        // Sliding Cup
        slidingCup: document.getElementById('sliding-cup'),
        slidingCupLiquid: document.getElementById('sliding-cup-liquid')
    };
}

// ============================================================================
// 4. VR CONTROLLER HAPTICS
// ============================================================================
function triggerVRHaptics(intensity = 0.5, duration = 80) {
    try {
        const leftController = document.getElementById('left-controller');
        const rightController = document.getElementById('right-controller');
        [leftController, rightController].forEach(controllerEl => {
            if (controllerEl && controllerEl.components['tracked-controls-webxr']) {
                const controller = controllerEl.components['tracked-controls-webxr'].controller;
                if (controller && controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
                    controller.gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
                }
            } else if (controllerEl && controllerEl.components['tracked-controls']) {
                const controller = controllerEl.components['tracked-controls'].controller;
                if (controller && controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
                    controller.gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
                }
            }
        });
    } catch (e) {
        console.warn('VR Haptics error:', e);
    }
}

function updateCursorState() {
    const sceneEl = document.querySelector('a-scene');
    const mouseCursor = document.getElementById('mouse-cursor');
    if (!mouseCursor) return;
    
    const inVR = sceneEl && sceneEl.is('vr-mode');
    if (inVR) {
        if (game.controllersConnected > 0) {
            // Controllers connected, disable screen-space mouse interaction and hide cursor indicator
            mouseCursor.setAttribute('cursor', 'enabled: false');
            mouseCursor.setAttribute('raycaster', 'enabled: false');
        } else {
            // No controllers in VR, look-gaze fallback on camera is active. Keep mouse disabled.
            mouseCursor.setAttribute('cursor', 'enabled: false');
            mouseCursor.setAttribute('raycaster', 'enabled: false');
        }
    } else {
        // Desktop standard mode, enable mouse cursor
        mouseCursor.setAttribute('cursor', 'enabled: true; rayOrigin: mouse');
        mouseCursor.setAttribute('raycaster', 'enabled: true; objects: .target');
    }
}

// ============================================================================
// 5. COLOR MIXING FORMULA RESOLVER
// ============================================================================
function resolveMixedColor(ing) {
    const r = ing.red;
    const g = ing.green;
    const b = ing.blue;

    if (!r && !g && !b) return 'EMPTY';
    if (r && !g && !b) return 'RED';
    if (!r && g && !b) return 'GREEN';
    if (!r && !g && b) return 'BLUE';
    if (r && !g && b) return 'PURPLE';
    if (!r && g && b) return 'CYAN';
    if (r && g && !b) return 'YELLOW';
    if (r && g && b) return 'WHITE';
    return 'EMPTY';
}

function updateActiveCupVisuals() {
    if (!game.activeCup.spawned) {
        UI.activeCup.setAttribute('visible', 'false');
        UI.activeCupLiquid.setAttribute('visible', 'false');
        UI.activeCup.classList.remove('target');
        return;
    }

    UI.activeCup.setAttribute('visible', 'true');
    UI.activeCup.classList.add('target');

    const mix = resolveMixedColor(game.activeCup.ingredients);
    game.activeCup.colorName = mix;
    game.activeCup.colorHex = DRINK_COLORS[mix].hex;

    if (mix === 'EMPTY') {
        // Empty glass cup visual
        UI.activeCupLiquid.setAttribute('visible', 'false');
        UI.activeCupLiquid.setAttribute('scale', '1 0.01 1');
    } else {
        // Filled liquid visual
        UI.activeCupLiquid.setAttribute('visible', 'true');
        UI.activeCupLiquid.setAttribute('material', {
            color: game.activeCup.colorHex,
            emissive: game.activeCup.colorHex,
            emissiveIntensity: 0.5,
            opacity: 0.85,
            transparent: false,
            shader: 'flat'
        });
        
        // Fluid rises on fill
        UI.activeCupLiquid.setAttribute('scale', '1 0.85 1');
        UI.activeCupLiquid.setAttribute('position', '0 -0.01 0');
    }

    // Update selection ring highlight
    if (game.activeCup.selected) {
        UI.cupSelectionRing.setAttribute('visible', 'true');
        UI.cupSelectionRing.setAttribute('material', 'opacity', 0.8);
    } else {
        UI.cupSelectionRing.setAttribute('visible', 'false');
        UI.cupSelectionRing.setAttribute('material', 'opacity', 0);
    }
}

// ============================================================================
// 6. CUSTOMER ORDERS & SPAWNS
// ============================================================================
function getAvailableDrinkColors() {
    // Return all names except EMPTY
    return ['RED', 'GREEN', 'BLUE', 'PURPLE', 'CYAN', 'YELLOW', 'WHITE'];
}

function spawnCustomer(slotId) {
    if (!game.active) return;
    const slot = game.customerSlots[slotId];
    if (slot.active) return;

    // Pick a random order drink
    const choices = getAvailableDrinkColors();
    const orderName = choices[Math.floor(Math.random() * choices.length)];
    
    slot.active = true;
    slot.orderColorName = orderName;
    slot.orderColorHex = DRINK_COLORS[orderName].hex;
    
    // Scale duration down as score increases (more difficult)
    const speedUp = Math.min(12000, game.servedCount * 800);
    slot.patienceDuration = Math.max(14000, 28000 - speedUp);
    slot.patienceRemaining = slot.patienceDuration;

    // Set A-Frame elements
    const customerEl = document.getElementById(`customer-${slotId}`);
    const bubbleColorEl = document.getElementById(`customer-${slotId}-bubble-color`);
    const bubbleTextEl = document.getElementById(`customer-${slotId}-bubble-text`);
    const patienceEl = document.getElementById(`customer-${slotId}-patience`);

    if (customerEl && bubbleColorEl && bubbleTextEl && patienceEl) {
        // Reset patience bar scale & color
        patienceEl.setAttribute('scale', '1 1 1');
        patienceEl.setAttribute('color', '#00ff66');

        // Set order bubble color and text
        bubbleColorEl.setAttribute('material', {
            color: slot.orderColorHex,
            emissive: slot.orderColorHex,
            emissiveIntensity: 0.8,
            shader: 'flat'
        });
        bubbleTextEl.setAttribute('value', orderName);
        bubbleTextEl.setAttribute('color', slot.orderColorHex);

        // Make customer container visible
        customerEl.setAttribute('visible', 'true');
        // Add target classes to allow pointer clicks
        const bodyEl = document.getElementById(`customer-${slotId}-body`);
        if (bodyEl) bodyEl.classList.add('target');
    }
}

function despawnCustomer(slotId, immediate = false) {
    const slot = game.customerSlots[slotId];
    slot.active = false;
    if (slot.spawnTimerId) {
        clearTimeout(slot.spawnTimerId);
        slot.spawnTimerId = null;
    }

    const customerEl = document.getElementById(`customer-${slotId}`);
    const bodyEl = document.getElementById(`customer-${slotId}-body`);

    if (customerEl) {
        customerEl.setAttribute('visible', 'false');
    }
    if (bodyEl) {
        bodyEl.classList.remove('target');
    }

    // Schedule next customer arrival
    if (game.active && !immediate) {
        const nextArrivalDelay = Math.random() * 4000 + 2000; // 2s - 6s
        slot.spawnTimerId = setTimeout(() => spawnCustomer(slotId), nextArrivalDelay);
    }
}

// ============================================================================
// 7. CORE GAME LOOPS & ANIMATIONS
// ============================================================================
AFRAME.registerComponent('diner-animate', {
    init: function () {
        // Programmatically populate stars in the sky to give cosmic vibe
        const container = document.getElementById('space-dust-container');
        if (container) {
            for (let i = 0; i < 45; i++) {
                const star = document.createElement('a-sphere');
                const x = (Math.random() - 0.5) * 20;
                const y = Math.random() * 12 + 0.1;
                const z = (Math.random() - 0.5) * 16 - 3;
                
                star.setAttribute('position', `${x} ${y} ${z}`);
                star.setAttribute('radius', (Math.random() * 0.03 + 0.01).toFixed(3));
                // Alternate between blue, purple, and white stars
                const colors = ['#00f3ff', '#d300ff', '#ffffff'];
                star.setAttribute('color', colors[Math.floor(Math.random() * 3)]);
                star.setAttribute('material', 'shader: flat; opacity: ' + (Math.random() * 0.5 + 0.25).toFixed(2));
                
                star.dataset.speed = (Math.random() * 1.5 + 0.5).toFixed(2);
                star.dataset.range = (Math.random() * 0.2 + 0.05).toFixed(2);
                star.dataset.baseY = y.toFixed(2);
                container.appendChild(star);
            }
        }
    },

    tick: function (time, timeDelta) {
        const t = time * 0.001; // seconds
        const dt = timeDelta; // milliseconds

        // 1. Slow cosmic bobbing for customers and rotating space dust
        const stars = document.querySelectorAll('#space-dust-container a-sphere');
        stars.forEach(star => {
            const speed = parseFloat(star.dataset.speed || '1');
            const range = parseFloat(star.dataset.range || '0.1');
            const baseY = parseFloat(star.dataset.baseY || '1');
            const newY = baseY + Math.sin(t * speed) * range;
            const pos = star.getAttribute('position');
            if (pos) {
                pos.y = newY;
                star.setAttribute('position', pos);
            }
        });

        if (!game.active) return;

        // 2. Animate floating customers
        game.customerSlots.forEach(slot => {
            if (slot.active) {
                const customerEl = document.getElementById(`customer-${slot.id}`);
                if (customerEl) {
                    // Smooth sinusoidal float bobbing
                    const bobY = slot.basePos.y + Math.sin(t * 2.2 + slot.bobOffset) * 0.05;
                    customerEl.setAttribute('position', { x: slot.basePos.x, y: bobY, z: slot.basePos.z });
                }

                // Tick patience timer
                slot.patienceRemaining -= dt;
                const ratio = Math.max(0, slot.patienceRemaining / slot.patienceDuration);
                
                const patienceBarEl = document.getElementById(`customer-${slot.id}-patience`);
                if (patienceBarEl) {
                    patienceBarEl.setAttribute('scale', `${ratio} 1 1`);
                    const offset = -(1 - ratio) * 0.125; // half of plane width 0.25
                    patienceBarEl.setAttribute('position', `${offset} 0 0.005`);
                    
                    // Shift color from green to orange to red
                    if (ratio > 0.5) {
                        patienceBarEl.setAttribute('color', '#00ff66'); // Green
                    } else if (ratio > 0.25) {
                        patienceBarEl.setAttribute('color', '#ffaa00'); // Orange
                    } else {
                        patienceBarEl.setAttribute('color', '#ff0055'); // Red
                    }
                }

                // If patience ran out
                if (slot.patienceRemaining <= 0) {
                    handleCustomerWalkout(slot.id);
                }
            }
        });

        // 3. Animate serving cup slide
        if (game.sliding) {
            game.slideProgress += timeDelta * 0.002; // slide duration ~ 500ms
            if (game.slideProgress >= 1.0) {
                game.slideProgress = 1.0;
                game.sliding = false;
                UI.slidingCup.setAttribute('visible', 'false');
                completeCupDelivery(game.slideTargetCustomerId, game.slideColorHex);
            } else {
                // Interpolate position
                const start = game.slideStartPos;
                const end = game.slideTargetPos;
                const p = game.slideProgress;

                // Simple linear interpolation + slight curve in y axis
                const currentX = start.x + (end.x - start.x) * p;
                const currentZ = start.z + (end.z - start.z) * p;
                const currentY = start.y + (end.y - start.y) * p + Math.sin(p * Math.PI) * 0.15; // arc

                UI.slidingCup.setAttribute('position', { x: currentX, y: currentY, z: currentZ });
            }
        }
    }
});

// Attach component to scene
document.querySelector('a-scene').setAttribute('diner-animate', '');

// ============================================================================
// 8. CORE GAMEPLAY ACTIONS
// ============================================================================
function startGame() {
    audio.resume();
    audio.playStartFanfare();
    audio.startAmbientMusic();

    // Reset Game State
    game.cash = 0;
    game.servedCount = 0;
    game.lives = 3;
    game.active = true;
    
    // Clear mixing station
    game.activeCup.spawned = false;
    game.activeCup.selected = false;
    game.activeCup.ingredients.red = false;
    game.activeCup.ingredients.green = false;
    game.activeCup.ingredients.blue = false;

    // Reset HUD text values
    updateHUDDisplays();

    // Hide Start and Game Over overlays
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.uiLayer.classList.add('hidden');
    
    // Show HUD and help overlay
    UI.hud.classList.remove('hidden');
    UI.helpCard.classList.remove('hidden');

    // Hide 3D VR buttons, show VR HUD
    UI.vrBtnStart.setAttribute('visible', 'false');
    UI.vrBtnStart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnStart.classList.remove('target');
    
    UI.vrBtnRestart.setAttribute('visible', 'false');
    UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnRestart.classList.remove('target');
    
    UI.vrHud.setAttribute('visible', 'true');

    // Despawn any existing customers and start clean
    for (let i = 0; i < 3; i++) {
        despawnCustomer(i, true);
    }

    // Spawn first customers with staggering delays
    setTimeout(() => spawnCustomer(0), 1000);
    setTimeout(() => spawnCustomer(1), 5000);
    setTimeout(() => spawnCustomer(2), 10000);

    updateActiveCupVisuals();
    updateCursorState();
}

function endGame() {
    game.active = false;
    audio.stopAmbientMusic();
    audio.playGameOver();

    // Hide sliding cup if active
    game.sliding = false;
    UI.slidingCup.setAttribute('visible', 'false');

    // Cancel all customer spawn timers
    game.customerSlots.forEach(slot => {
        if (slot.spawnTimerId) {
            clearTimeout(slot.spawnTimerId);
            slot.spawnTimerId = null;
        }
    });

    // Handle high scores
    const isNewHigh = game.cash > game.highscore;
    if (isNewHigh) {
        game.highscore = game.cash;
        localStorage.setItem('cosmic_diner_highscore', game.highscore);
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }

    // Populate gameover scores
    UI.statFinalCash.innerText = `$${game.cash}`;
    UI.statFinalServed.innerText = game.servedCount;
    UI.statHighScore.innerText = `$${game.highscore}`;

    // Show Game Over panels
    UI.uiLayer.classList.remove('hidden');
    UI.panelGameOver.classList.remove('hidden');

    // Reset 3D VR restart panel and hide HUD
    UI.vrHud.setAttribute('visible', 'false');
    
    UI.vrBtnRestart.setAttribute('visible', 'true');
    UI.vrBtnRestart.setAttribute('scale', '1 1 1');
    UI.vrBtnRestart.classList.add('target');

    updateCursorState();
}

function updateHUDDisplays() {
    const cashStr = `$${game.cash}`;
    UI.hudCash.innerText = cashStr;
    UI.hudCustomers.innerText = game.servedCount;
    
    // Draw hearts for reputation
    let hearts = '';
    for (let i = 0; i < 3; i++) {
        hearts += (i < game.lives) ? '❤' : '🖤';
    }
    UI.hudLives.innerText = hearts;

    // VR HUD values
    UI.vrHudCash.setAttribute('value', `CASH: ${cashStr}`);
    UI.vrHudLives.setAttribute('value', `BAR REPUTATION: ${hearts}`);
    UI.vrHudStatus.setAttribute('value', `SERVED: ${game.servedCount}`);
}

function handleCustomerWalkout(slotId) {
    triggerVRHaptics(0.7, 250);
    audio.playMismatch();

    game.lives--;
    updateHUDDisplays();

    // Flash background red temporarily
    const skyEl = document.querySelector('a-sky');
    if (skyEl) {
        skyEl.setAttribute('color', '#ff0033');
        setTimeout(() => skyEl.setAttribute('color', '#04020a'), 400);
    }

    despawnCustomer(slotId);

    if (game.lives <= 0) {
        endGame();
    }
}

// Dispense an empty cup on mixing pad
function handleDispenserClick() {
    if (!game.active) return;
    if (game.activeCup.spawned) {
        triggerVRHaptics(0.1, 40);
        return; // already have a cup
    }

    triggerVRHaptics(0.4, 70);
    audio.playClink();

    game.activeCup.spawned = true;
    game.activeCup.selected = false;
    game.activeCup.ingredients.red = false;
    game.activeCup.ingredients.green = false;
    game.activeCup.ingredients.blue = false;

    updateActiveCupVisuals();
}

// Pour colored liquid into the cup
function handleTapClick(color) {
    if (!game.active) return;
    if (!game.activeCup.spawned) return; // no cup to fill!

    triggerVRHaptics(0.5, 90);
    audio.playPour();

    // Trigger pour animation (stream cylinder)
    let pourStream = null;
    if (color === 'red') pourStream = UI.pourRed;
    else if (color === 'green') pourStream = UI.pourGreen;
    else if (color === 'blue') pourStream = UI.pourBlue;

    if (pourStream) {
        pourStream.setAttribute('visible', 'true');
        setTimeout(() => pourStream.setAttribute('visible', 'false'), 350);
    }

    // Set ingredient flag and update cup
    game.activeCup.ingredients[color] = true;
    updateActiveCupVisuals();
}

// Toggle cup selection (to serve)
function handleCupClick() {
    if (!game.active || !game.activeCup.spawned) return;

    triggerVRHaptics(0.3, 50);
    audio.playSelect();

    game.activeCup.selected = !game.activeCup.selected;
    updateActiveCupVisuals();
}

// Discard drink contents
function handleDrainClick() {
    if (!game.active || !game.activeCup.spawned) return;

    triggerVRHaptics(0.6, 120);
    audio.playFizz();

    // Reset cup ingredients but keep cup spawned
    game.activeCup.selected = false;
    game.activeCup.ingredients.red = false;
    game.activeCup.ingredients.green = false;
    game.activeCup.ingredients.blue = false;

    updateActiveCupVisuals();
}

// Click customer to trigger sliding cup serve
function handleCustomerClick(customerId) {
    if (!game.active) return;
    const slot = game.customerSlots[customerId];
    if (!slot.active) return; // nobody there to serve

    if (!game.activeCup.spawned || !game.activeCup.selected) {
        triggerVRHaptics(0.1, 40);
        return; // nothing selected to serve
    }

    triggerVRHaptics(0.4, 80);
    audio.playSlide();

    // Hide active cup on counter
    UI.activeCup.setAttribute('visible', 'false');
    
    // Set up sliding cup animation
    game.sliding = true;
    game.slideProgress = 0;
    
    // Target position is customer stool top (Y=0.6) + half cup height (0.11)
    game.slideTargetPos = { x: slot.basePos.x, y: 0.71, z: slot.basePos.z };
    game.slideColorHex = game.activeCup.colorHex;
    game.slideTargetCustomerId = customerId;

    // Show sliding cup primitive with proper fluid color
    UI.slidingCup.setAttribute('visible', 'true');
    UI.slidingCup.setAttribute('position', game.slideStartPos);
    UI.slidingCupLiquid.setAttribute('material', {
        color: game.slideColorHex,
        emissive: game.slideColorHex,
        emissiveIntensity: 0.5,
        shader: 'flat'
    });

    // Reset mixing pad cup state (wasted/served drink removes cup)
    game.activeCup.spawned = false;
    game.activeCup.selected = false;
    game.activeCup.ingredients.red = false;
    game.activeCup.ingredients.green = false;
    game.activeCup.ingredients.blue = false;
    updateActiveCupVisuals();
}

// Slide delivery complete: check match
function completeCupDelivery(customerId, drinkColorHex) {
    const slot = game.customerSlots[customerId];
    if (!slot.active) return; // customer walked away while drink was sliding!

    // Verify order
    if (drinkColorHex.toLowerCase() === slot.orderColorHex.toLowerCase()) {
        // Correct order match!
        triggerVRHaptics(0.8, 150);
        audio.playSuccess();

        game.cash += 15;
        game.servedCount++;
        updateHUDDisplays();

        // Flash green satisfaction glow around customer position
        const floorRingEl = slot.id === 0 ? document.querySelectorAll('#station-customer-0 a-cylinder')[1] :
                            slot.id === 1 ? document.querySelectorAll('#station-customer-1 a-cylinder')[1] :
                                            document.querySelectorAll('#station-customer-2 a-cylinder')[1];
        
        if (floorRingEl) {
            floorRingEl.setAttribute('color', '#00ff66');
            floorRingEl.setAttribute('material', 'emissiveIntensity', 1.0);
            setTimeout(() => {
                floorRingEl.setAttribute('color', '#ffff00');
                floorRingEl.setAttribute('material', 'emissiveIntensity', 0.3);
            }, 600);
        }

        // Satisfied customer leaves happy
        despawnCustomer(customerId);
    } else {
        // Wrong order mismatch!
        triggerVRHaptics(0.6, 200);
        audio.playMismatch();

        // Anger feedback: patience drops by 40%
        slot.patienceRemaining -= slot.patienceDuration * 0.4;
        
        // Flash customer body red
        const bodyEl = document.getElementById(`customer-${customerId}-body`);
        if (bodyEl) {
            const originalColor = bodyEl.getAttribute('color');
            bodyEl.setAttribute('color', '#ff0033');
            setTimeout(() => bodyEl.setAttribute('color', originalColor), 400);
        }
    }
}

// ============================================================================
// 9. SETUP EVENT LISTENERS & INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initUIReferences();

    const sceneEl = document.querySelector('a-scene');
    const leftController = document.getElementById('left-controller');
    const rightController = document.getElementById('right-controller');

    // 1. Connection monitors for VR controllers
    if (leftController) {
        leftController.addEventListener('controllerconnected', () => {
            game.controllersConnected++;
            updateCursorState();
        });
        leftController.addEventListener('controllerdisconnected', () => {
            game.controllersConnected = Math.max(0, game.controllersConnected - 1);
            updateCursorState();
        });
    }
    if (rightController) {
        rightController.addEventListener('controllerconnected', () => {
            game.controllersConnected++;
            updateCursorState();
        });
        rightController.addEventListener('controllerdisconnected', () => {
            game.controllersConnected = Math.max(0, game.controllersConnected - 1);
            updateCursorState();
        });
    }

    // Toggle look-gaze fallback ring depending on VR exit/entry
    sceneEl.addEventListener('enter-vr', () => {
        updateCursorState();
    });
    sceneEl.addEventListener('exit-vr', () => {
        updateCursorState();
    });

    // 2. Add pointer clicks triggers for HTML buttons and VR signs
    UI.btnStart.addEventListener('click', startGame);
    UI.btnRestart.addEventListener('click', startGame);
    UI.vrBtnStart.addEventListener('click', startGame);
    UI.vrBtnRestart.addEventListener('click', startGame);

    // 3. Setup core ingredient taps triggers
    UI.tapRed.addEventListener('click', () => handleTapClick('red'));
    UI.tapGreen.addEventListener('click', () => handleTapClick('green'));
    UI.tapBlue.addEventListener('click', () => handleTapClick('blue'));

    // 4. Setup station dispensers and cup selection triggers
    UI.cupDispenser.addEventListener('click', handleDispenserClick);
    UI.disposalDrain.addEventListener('click', handleDrainClick);
    UI.activeCup.addEventListener('click', handleCupClick);

    // 5. Setup customer click listeners
    document.getElementById('customer-0-body').addEventListener('click', () => handleCustomerClick(0));
    document.getElementById('customer-1-body').addEventListener('click', () => handleCustomerClick(1));
    document.getElementById('customer-2-body').addEventListener('click', () => handleCustomerClick(2));

    // VR haptics hover vibrations on controllers
    const interactiveClasses = ['.target'];
    interactiveClasses.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (game.active && el.classList.contains('target')) {
                    triggerVRHaptics(0.2, 45);
                }
            });
        });
    });

    // Initialize high score display
    UI.statHighScore.innerText = `$${game.highscore}`;

    // Start background audio engine on first click
    document.body.addEventListener('pointerdown', () => {
        audio.resume();
        if (game.active) {
            audio.startAmbientMusic();
        }
    });

    updateCursorState();
});
