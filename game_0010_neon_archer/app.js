/**
 * Neon Archer - WebXR Game Logic
 * Full custom sound synthesizer, gravity projectile physics, and VR/desktop bow mechanics.
 */

// ============================================================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ============================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.tensionOsc = null;
        this.tensionGain = null;
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

    playTensionStart() {
        this.resume();
        if (!this.ctx) return;
        
        // Stop previous if running
        this.playTensionStop();

        const t = this.ctx.currentTime;
        this.tensionOsc = this.ctx.createOscillator();
        this.tensionGain = this.ctx.createGain();

        this.tensionOsc.type = 'sawtooth';
        this.tensionOsc.frequency.setValueAtTime(80, t);
        
        // Add low pass filter for a deep mechanical rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, t);

        this.tensionGain.gain.setValueAtTime(0.01, t);

        this.tensionOsc.connect(filter);
        filter.connect(this.tensionGain);
        this.tensionGain.connect(this.ctx.destination);

        this.tensionOsc.start(t);
    }

    setTension(percent) {
        if (!this.ctx || !this.tensionOsc || !this.tensionGain) return;
        const t = this.ctx.currentTime;
        // Map tension percent to frequency (80Hz to 280Hz) and gain (rumble volume)
        this.tensionOsc.frequency.setTargetAtTime(80 + percent * 200, t, 0.05);
        this.tensionGain.gain.setTargetAtTime(0.02 + percent * 0.14, t, 0.05);
    }

    playTensionStop() {
        if (this.tensionOsc) {
            try {
                this.tensionOsc.stop();
            } catch (e) {}
            this.tensionOsc = null;
        }
        this.tensionGain = null;
    }

    playShoot(force) {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.15 + force * 0.1;

        // Snapping frequency slide (900Hz -> 100Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 * force + 100, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + duration);

        // White noise burst to simulate wind release
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04 * force, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        gain.gain.setValueAtTime(0.12 * force, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.01);
        noise.start(t);
        noise.stop(t + duration + 0.01);
    }

    playHit(accuracy) {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        let duration = 0.25;

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        if (accuracy > 0.85) {
            // Bullseye: high digital double chime chord (C6 & G6)
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1046.50, t); // C6
            osc1.frequency.exponentialRampToValueAtTime(1318.51, t + 0.15); // E6
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1567.98, t); // G6
            osc2.frequency.exponentialRampToValueAtTime(2093.00, t + 0.2); // C7
            
            duration = 0.4;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        } else if (accuracy > 0.5) {
            // Mid Ring: standard ring chime (E5 & A5)
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, t); // E5
            osc1.frequency.exponentialRampToValueAtTime(880.00, t + 0.12);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(440.00, t); // A4
            osc2.frequency.exponentialRampToValueAtTime(587.33, t + 0.12);
        } else {
            // Outer Ring: low target ping (C5)
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(523.25, t); // C5
            osc1.frequency.exponentialRampToValueAtTime(261.63, t + 0.12);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(261.63, t);
        }

        osc1.connect(gain);
        osc1.start(t);
        osc1.stop(t + duration + 0.01);

        if (accuracy > 0.5) {
            osc2.connect(gain);
            osc2.start(t);
            osc2.stop(t + duration + 0.01);
        }

        gain.connect(this.ctx.destination);
    }

    playPowerup() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.35;

        // Rapid arpeggio chime (upward stairs C5 -> E5 -> G5 -> C6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.setValueAtTime(659.25, t + 0.07);
        osc.frequency.setValueAtTime(783.99, t + 0.14);
        osc.frequency.setValueAtTime(1046.50, t + 0.21);
        osc.frequency.exponentialRampToValueAtTime(1500, t + duration);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.01);
    }

    playGroundHit() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.18;

        // Low thud frequency slide (120Hz -> 30Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(30, t + duration);

        // Low pass filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.01);
    }

    playStartFanfare() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + index * 0.08;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.26);
        });
    }

    playGameOverFanfare() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + index * 0.15;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.46);
        });
    }
}

const audio = new SoundEngine();

// ============================================================================
// 2. GAME STATE MANAGEMENT
// ============================================================================
const game = {
    score: 0,
    arrows: 15,
    highscore: parseInt(localStorage.getItem('neon_archer_highscore') || '0', 10),
    active: false,
    inVR: false,
    
    // Target Spawning Timers
    droneSpawnTimer: 0,
    balloonSpawnTimer: 0,
    targetSpawnTimer: 0,
};

// UI Element Handles
const UI = {
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudArrows: document.getElementById('hud-arrows-val'),
    hudChargeFill: document.getElementById('hud-charge-fill'),
    
    uiLayer: document.getElementById('ui-layer'),
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    vrStatus: document.getElementById('vr-status'),
    
    statFinalScore: document.getElementById('stat-final-score'),
    statHighScore: document.getElementById('stat-high-score'),

    // 3D VR Console
    vrConsole: document.getElementById('vr-console'),
    vrHudScore: document.getElementById('vr-hud-score'),
    vrHudArrows: document.getElementById('vr-hud-arrows'),
    vrHudHighScore: document.getElementById('vr-hud-highscore'),
    vrBtnPlay: document.getElementById('vr-btn-play'),
    vrBtnPlayText: document.getElementById('vr-btn-play-text'),
    
    // Rig & Controllers
    leftHand: document.getElementById('left-hand'),
    rightHand: document.getElementById('right-hand'),
    camera: document.getElementById('camera'),
    
    // Projectiles
    arrowContainer: document.getElementById('arrow-container'),
    targetContainer: document.getElementById('target-container'),
    effectsContainer: document.getElementById('effects-container'),
    starsContainer: document.getElementById('stars'),
};

// ============================================================================
// 3. DESKTOP INTERACTION CONTROLS
// ============================================================================
const desktop = {
    isDrawing: false,
    drawPercent: 0,
    drawStartY: 0,
    maxDrawOffset: 0.15, // Max displacement of string back (meters)
    
    init() {
        window.addEventListener('mousedown', (e) => {
            if (!game.active && game.arrows > 0) return; // Must start game first
            if (e.target.closest('#ui-layer') || game.inVR) return;
            
            this.isDrawing = true;
            this.drawStartY = e.clientY;
            this.drawPercent = 0;
            
            audio.playTensionStart();
            
            // Show placeholder arrow on desktop bow
            const placeholder = document.getElementById('desktop-arrow-placeholder');
            if (placeholder) placeholder.setAttribute('visible', 'true');
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDrawing) return;
            
            const deltaY = e.clientY - this.drawStartY;
            // Dragging mouse downwards draws the string back
            this.drawPercent = Math.min(Math.max(deltaY / 220, 0), 1);
            
            // Update tension audio and visuals
            audio.setTension(this.drawPercent);
            this.updateBowVisuals();
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            audio.playTensionStop();
            
            // Fire arrow in direction camera is pointing
            if (game.arrows > 0 && game.active) {
                const dir = new THREE.Vector3(0, 0, -1);
                dir.applyQuaternion(UI.camera.object3D.quaternion);
                
                // Spawn arrow slightly in front of camera
                const startPos = new THREE.Vector3();
                UI.camera.object3D.getWorldPosition(startPos);
                startPos.add(dir.clone().multiplyScalar(0.4));
                
                const speed = 12 + this.drawPercent * 25; // 12m/s to 37m/s
                fireArrow(startPos, dir, speed);
                
                game.arrows--;
                updateHUD();
                
                if (game.arrows <= 0) {
                    checkGameOverDelay();
                }
            }
            
            // Reset visuals
            this.drawPercent = 0;
            this.updateBowVisuals();
            const placeholder = document.getElementById('desktop-arrow-placeholder');
            if (placeholder) placeholder.setAttribute('visible', 'false');
        });
    },

    updateBowVisuals() {
        const pullOffset = this.drawPercent * this.maxDrawOffset;
        const bowstring = document.getElementById('desktop-bowstring');
        const arrowPlaceholder = document.getElementById('desktop-arrow-placeholder');
        
        // Update 2D HUD charge bar
        UI.hudChargeFill.style.width = `${this.drawPercent * 100}%`;
        
        if (bowstring) {
            // Draw visual bend of string by using line attributes
            // A-Frame line doesn't support multiple points, so we shift start/end properties
            // Or we simulate the pull by moving the string entity slightly back.
            // Moving string entity back is easier:
            bowstring.setAttribute('position', `${-pullOffset} 0 0`);
        }
        if (arrowPlaceholder) {
            arrowPlaceholder.setAttribute('position', `${-0.09 - pullOffset} 0 0`);
        }
    }
};

// ============================================================================
// 4. WEBXR VR INTERACTION CONTROLS
// ============================================================================
const vr = {
    isDrawing: false,
    maxVRDrawDist: 0.65, // Max pull back distance (meters)
    drawPercent: 0,
    
    init() {
        // Track VR controller connection
        UI.leftHand.addEventListener('controllerconnected', () => {
            game.inVR = true;
            document.getElementById('desktop-bow').setAttribute('visible', 'false');
            UI.leftHand.setAttribute('visible', 'true');
            updateVRSystemMsg();
        });
        UI.leftHand.addEventListener('controllerdisconnected', () => {
            game.inVR = false;
            document.getElementById('desktop-bow').setAttribute('visible', 'true');
            UI.leftHand.setAttribute('visible', 'false');
            updateVRSystemMsg();
        });

        UI.rightHand.addEventListener('controllerconnected', () => {
            UI.rightHand.setAttribute('visible', 'true');
        });
        UI.rightHand.addEventListener('controllerdisconnected', () => {
            UI.rightHand.setAttribute('visible', 'false');
        });

        // Trigger / Grip listeners for right hand pulling string
        const startPull = () => {
            if (!game.active) return;
            
            // Check distance between right hand and bow center
            const bowWorldPos = new THREE.Vector3();
            const pullWorldPos = new THREE.Vector3();
            
            // Bow string resting point in world space
            const bowStringRest = document.getElementById('vr-bowstring');
            if (!bowStringRest) return;
            
            bowStringRest.object3D.getWorldPosition(bowWorldPos);
            UI.rightHand.object3D.getWorldPosition(pullWorldPos);
            
            const dist = bowWorldPos.distanceTo(pullWorldPos);
            
            // If right hand is close to the bow string rest position (within 0.25 meters)
            if (dist < 0.25) {
                this.isDrawing = true;
                audio.playTensionStart();
                
                // Vibrate right controller slightly
                triggerHaptic(UI.rightHand, 0.4, 60);
            }
        };

        const releasePull = () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            audio.playTensionStop();
            
            if (game.arrows > 0 && game.active) {
                // Compute release speed based on draw
                const speed = 12 + this.drawPercent * 25;
                
                // Firing direction aligned with bow forward direction (Z-axis of left controller)
                const bowDir = new THREE.Vector3(0, 0, -1);
                bowDir.applyQuaternion(UI.leftHand.object3D.quaternion);
                
                // Launch position
                const startPos = new THREE.Vector3();
                UI.leftHand.object3D.getWorldPosition(startPos);
                // Offset slightly along bow direction
                startPos.add(bowDir.clone().multiplyScalar(0.1));
                
                fireArrow(startPos, bowDir, speed);
                
                // Vibrate left controller representing bow recoil
                triggerHaptic(UI.leftHand, 0.8, 120);
                
                game.arrows--;
                updateHUD();
                
                if (game.arrows <= 0) {
                    checkGameOverDelay();
                }
            }
            
            // Reset string visual position
            this.drawPercent = 0;
            this.updateVRBowVisuals(0);
        };

        // Bind events to both Trigger and Grip to be extra comfortable
        UI.rightHand.addEventListener('triggerdown', startPull);
        UI.rightHand.addEventListener('gripdown', startPull);
        UI.rightHand.addEventListener('triggerup', releasePull);
        UI.rightHand.addEventListener('gripup', releasePull);
    },

    update(dt) {
        if (!this.isDrawing) return;
        
        // Compute distance between hands
        const leftPos = new THREE.Vector3();
        const rightPos = new THREE.Vector3();
        UI.leftHand.object3D.getWorldPosition(leftPos);
        UI.rightHand.object3D.getWorldPosition(rightPos);
        
        // Calculate displacement along left controller Z axis (backward draw)
        const bowForward = new THREE.Vector3(0, 0, -1).applyQuaternion(UI.leftHand.object3D.quaternion);
        const handOffset = new THREE.Vector3().subVectors(rightPos, leftPos);
        
        // Project pull distance onto the backward vector of the bow
        const pullDist = -handOffset.dot(bowForward);
        
        this.drawPercent = Math.min(Math.max((pullDist - 0.1) / this.maxVRDrawDist, 0), 1);
        
        // Micro Haptics as tension increases
        if (Math.random() < 0.15) {
            triggerHaptic(UI.rightHand, 0.1 + this.drawPercent * 0.3, 20);
        }
        
        audio.setTension(this.drawPercent);
        this.updateVRBowVisuals(this.drawPercent);
    },

    updateVRBowVisuals(percent) {
        const bowstring = document.getElementById('vr-bowstring');
        const pullOffset = percent * 0.3; // String displacement scale in meters
        if (bowstring) {
            bowstring.setAttribute('position', `${-pullOffset} 0 0`);
        }
    }
};

// Helper: Haptics triggers
function triggerHaptic(controllerEl, intensity, duration) {
    const trackedControls = controllerEl.components['tracked-controls-webxr'] || controllerEl.components['tracked-controls'];
    if (trackedControls && trackedControls.controller) {
        const gamepad = trackedControls.controller.gamepad;
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
            gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
        }
    }
}

// ============================================================================
// 5. PROJECTILE PHYSICS SIMULATION
// ============================================================================
const activeArrows = [];
const GRAVITY = -9.8; // m/s^2

function fireArrow(startPos, direction, speed) {
    audio.playShoot(speed / 37.0);

    const arrowEl = document.createElement('a-entity');
    arrowEl.setAttribute('class', 'projectile');
    
    // Core arrow mesh
    const cylinder = document.createElement('a-cylinder');
    cylinder.setAttribute('radius', '0.008');
    cylinder.setAttribute('height', '0.75');
    cylinder.setAttribute('rotation', '90 0 0');
    cylinder.setAttribute('color', game.inVR ? '#ff007f' : '#ff007f');
    cylinder.setAttribute('material', 'shader: flat; opacity: 0.9');
    arrowEl.appendChild(cylinder);
    
    // Arrow tip
    const tip = document.createElement('a-cone');
    tip.setAttribute('radius-bottom', '0.018');
    tip.setAttribute('height', '0.04');
    tip.setAttribute('position', '0 0 -0.38');
    tip.setAttribute('rotation', '-90 0 0');
    tip.setAttribute('color', '#ff007f');
    tip.setAttribute('material', 'shader: flat');
    arrowEl.appendChild(tip);
    
    // Neon trail element (represented as dynamic line that extends back)
    const trailEl = document.createElement('a-entity');
    trailEl.setAttribute('line', `start: 0 0 0.37; end: 0 0 0.8; color: #ff007f; opacity: 0.3`);
    arrowEl.appendChild(trailEl);
    
    // Set position and rotation
    arrowEl.object3D.position.copy(startPos);
    
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
    arrowEl.object3D.quaternion.copy(quaternion);
    
    UI.arrowContainer.appendChild(arrowEl);
    
    // Velocity vector
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    
    activeArrows.push({
        el: arrowEl,
        pos: startPos.clone(),
        vel: velocity,
        state: 'flying', // 'flying', 'stuck', 'dead'
        life: 4.0, // Seconds left to dissolve after hitting
        prevPos: startPos.clone()
    });
}

function updatePhysics(dt) {
    for (let i = activeArrows.length - 1; i >= 0; i--) {
        const arrow = activeArrows[i];
        
        if (arrow.state === 'flying') {
            arrow.prevPos.copy(arrow.pos);
            
            // Update kinematic position: pos = pos + vel * dt
            arrow.pos.addScaledVector(arrow.vel, dt);
            
            // Apply gravity to velocity: vel.y = vel.y + g * dt
            arrow.vel.y += GRAVITY * dt;
            
            // Update 3D object representation
            arrow.el.object3D.position.copy(arrow.pos);
            
            // Align rotation with velocity direction
            const dir = arrow.vel.clone().normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
            arrow.el.object3D.quaternion.copy(quat);
            
            // Collision checks
            checkArrowCollisions(arrow);
            
            // Out of bounds check
            if (arrow.pos.y < -1 || arrow.pos.lengthSq() > 200 * 200) {
                arrow.state = 'dead';
                removeArrowEntity(arrow);
                activeArrows.splice(i, 1);
            }
        } else if (arrow.state === 'stuck') {
            arrow.life -= dt;
            if (arrow.life <= 0) {
                arrow.state = 'dead';
                removeArrowEntity(arrow);
                activeArrows.splice(i, 1);
            } else {
                // Fade out arrow cylinder before deletion
                const cyl = arrow.el.querySelector('a-cylinder');
                const tip = arrow.el.querySelector('a-cone');
                if (cyl) cyl.setAttribute('material', `shader: flat; opacity: ${Math.max(arrow.life, 0)}`);
                if (tip) tip.setAttribute('material', `shader: flat; opacity: ${Math.max(arrow.life, 0)}`);
            }
        }
    }
}

function removeArrowEntity(arrow) {
    if (arrow.el && arrow.el.parentNode) {
        arrow.el.parentNode.removeChild(arrow.el);
    }
}

// ============================================================================
// 6. TARGET MANAGEMENT AND SPAWNING
// ============================================================================
const targets = [];
let targetIdCounter = 0;

class Target {
    constructor(type, position) {
        this.id = targetIdCounter++;
        this.type = type; // 'ring', 'drone', 'balloon', 'start'
        this.position = position.clone();
        this.initialPos = position.clone();
        this.active = true;
        this.driftSpeed = 0.5 + Math.random() * 0.8;
        this.driftRange = 1.0 + Math.random() * 2.0;
        this.timeOffset = Math.random() * 100;
        this.radius = 0.65; // Hit radius
        
        this.el = document.createElement('a-entity');
        this.el.setAttribute('position', `${this.position.x} ${this.position.y} ${this.position.z}`);
        
        this.createVisuals();
        UI.targetContainer.appendChild(this.el);
    }

    createVisuals() {
        if (this.type === 'start') {
            this.radius = 0.8;
            this.el.setAttribute('class', 'target');
            
            // Outer Ring
            const outer = document.createElement('a-ring');
            outer.setAttribute('radius-inner', '0.72');
            outer.setAttribute('radius-outer', '0.8');
            outer.setAttribute('color', '#00f3ff');
            outer.setAttribute('material', 'shader: flat; side: double');
            this.el.appendChild(outer);
            
            // Inner Fill
            const disc = document.createElement('a-disk');
            disc.setAttribute('radius', '0.7');
            disc.setAttribute('color', '#1a053b');
            disc.setAttribute('material', 'transparent: true; opacity: 0.6');
            this.el.appendChild(disc);
            
            // Bullseye
            const bull = document.createElement('a-disk');
            bull.setAttribute('radius', '0.22');
            bull.setAttribute('color', '#ff007f');
            bull.setAttribute('material', 'shader: flat; side: double');
            this.el.appendChild(bull);

            // Add text label
            const text = document.createElement('a-text');
            text.setAttribute('value', 'START TARGET');
            text.setAttribute('align', 'center');
            text.setAttribute('position', '0 0.9 0');
            text.setAttribute('width', '4');
            text.setAttribute('color', '#00f3ff');
            text.setAttribute('font', 'mozillavr');
            this.el.appendChild(text);
            
        } else if (this.type === 'ring') {
            this.radius = 0.6;
            
            // Outer Blue Ring
            const outer = document.createElement('a-ring');
            outer.setAttribute('radius-inner', '0.45');
            outer.setAttribute('radius-outer', '0.6');
            outer.setAttribute('color', '#0066ff');
            outer.setAttribute('material', 'shader: flat; side: double; opacity: 0.95');
            this.el.appendChild(outer);

            // Mid Pink Ring
            const mid = document.createElement('a-ring');
            mid.setAttribute('radius-inner', '0.2');
            mid.setAttribute('radius-outer', '0.45');
            mid.setAttribute('color', '#ec4899');
            mid.setAttribute('material', 'shader: flat; side: double; opacity: 0.95');
            this.el.appendChild(mid);

            // Bullseye Yellow Disk
            const bull = document.createElement('a-disk');
            bull.setAttribute('radius', '0.2');
            bull.setAttribute('color', '#eab308');
            bull.setAttribute('material', 'shader: flat; side: double');
            this.el.appendChild(bull);
            
            // Backplate backing disc for solid arrows blocking
            const backing = document.createElement('a-disk');
            backing.setAttribute('radius', '0.6');
            backing.setAttribute('color', '#05020c');
            backing.setAttribute('position', '0 0 -0.01');
            backing.setAttribute('material', 'transparent: true; opacity: 0.1; side: double');
            this.el.appendChild(backing);

        } else if (this.type === 'balloon') {
            this.radius = 0.4;
            
            // Glowing neon sphere
            const sphere = document.createElement('a-sphere');
            sphere.setAttribute('radius', '0.38');
            sphere.setAttribute('color', '#d8b4fe');
            sphere.setAttribute('material', 'roughness: 0.1; metalness: 0.9; emissive: #a855f7; emissiveIntensity: 0.8');
            this.el.appendChild(sphere);
            
            // Balloon knot cylinder
            const knot = document.createElement('a-cone');
            knot.setAttribute('radius-bottom', '0.04');
            knot.setAttribute('height', '0.08');
            knot.setAttribute('position', '0 -0.42 0');
            knot.setAttribute('color', '#a855f7');
            this.el.appendChild(knot);
            
            // String dangling
            const line = document.createElement('a-entity');
            line.setAttribute('line', 'start: 0 -0.44 0; end: 0 -1.1 0; color: #a855f7; opacity: 0.5');
            this.el.appendChild(line);

        } else if (this.type === 'drone') {
            this.radius = 0.5;
            
            // Hexagon Core
            const core = document.createElement('a-cylinder');
            core.setAttribute('radius', '0.18');
            core.setAttribute('height', '0.12');
            core.setAttribute('rotation', '90 0 0');
            core.setAttribute('color', '#00f3ff');
            core.setAttribute('material', 'shader: flat; opacity: 0.95');
            this.el.appendChild(core);
            
            // Core energy eye
            const eye = document.createElement('a-sphere');
            eye.setAttribute('radius', '0.08');
            eye.setAttribute('color', '#ffffff');
            eye.setAttribute('material', 'shader: flat');
            eye.setAttribute('position', '0 0 0.08');
            this.el.appendChild(eye);
            
            // Rotating Outer ring
            const rotRing = document.createElement('a-ring');
            rotRing.setAttribute('radius-inner', '0.35');
            rotRing.setAttribute('radius-outer', '0.45');
            rotRing.setAttribute('color', '#ff007f');
            rotRing.setAttribute('material', 'shader: flat; side: double');
            rotRing.setAttribute('id', `drone-ring-${this.id}`);
            this.el.appendChild(rotRing);

            // Left thruster
            const thrusterL = document.createElement('a-box');
            thrusterL.setAttribute('width', '0.22');
            thrusterL.setAttribute('height', '0.06');
            thrusterL.setAttribute('depth', '0.06');
            thrusterL.setAttribute('color', '#00f3ff');
            thrusterL.setAttribute('position', '-0.5 0 0');
            this.el.appendChild(thrusterL);
            
            // Right thruster
            const thrusterR = document.createElement('a-box');
            thrusterR.setAttribute('width', '0.22');
            thrusterR.setAttribute('height', '0.06');
            thrusterR.setAttribute('depth', '0.06');
            thrusterR.setAttribute('color', '#00f3ff');
            thrusterR.setAttribute('position', '0.5 0 0');
            this.el.appendChild(thrusterR);
        }
        
        // Add orientation matching: targets should face towards the center player (origin)
        this.orientToOrigin();
    }

    orientToOrigin() {
        // Compute direction towards 0 1.2 0 (camera height)
        const targetDir = new THREE.Vector3(0, 1.2, 0).sub(this.position).normalize();
        
        // Set target alignment. By default, discs point along Z-axis.
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDir);
        this.el.object3D.quaternion.copy(quat);
    }

    update(dt, time) {
        if (!this.active) return;
        
        // Movement Mechanics
        if (this.type === 'ring') {
            // Horizontal drifting oscillation
            const offset = Math.sin(time * this.driftSpeed + this.timeOffset) * this.driftRange;
            this.position.x = this.initialPos.x + offset;
            
            // Small vertical bobbing
            this.position.y = this.initialPos.y + Math.cos(time * 1.5 + this.timeOffset) * 0.15;
            
            this.el.object3D.position.copy(this.position);
            
        } else if (this.type === 'drone') {
            // Figure-8 pattern movement
            const angle = time * this.driftSpeed + this.timeOffset;
            this.position.x = this.initialPos.x + Math.sin(angle) * this.driftRange * 1.5;
            this.position.y = this.initialPos.y + Math.sin(angle * 2) * (this.driftRange * 0.5);
            
            this.el.object3D.position.copy(this.position);
            
            // Spin the drone rotor ring visual
            const rotRing = this.el.querySelector(`#drone-ring-${this.id}`);
            if (rotRing) {
                const currentRot = rotRing.object3D.rotation.z;
                rotRing.object3D.rotation.z = currentRot + 4.0 * dt;
            }
            
        } else if (this.type === 'balloon') {
            // Rises upward indefinitely. If it rises too high, recycle it.
            this.position.y += this.driftSpeed * dt;
            
            // Small wind swaying
            this.position.x = this.initialPos.x + Math.sin(time * 0.8 + this.timeOffset) * 0.5;
            
            this.el.object3D.position.copy(this.position);
            
            if (this.position.y > 18) {
                this.deactivate();
            }
        }
    }

    deactivate() {
        this.active = false;
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}

function spawnTarget(type) {
    // Spatial configuration within a 60-degree window in front of player (FOV comfort)
    // Angles between -30deg and +30deg relative to negative Z
    const angleRad = (Math.random() * 60 - 30) * Math.PI / 180;
    
    let distance = 6 + Math.random() * 12; // 6m to 18m out
    if (type === 'drone') distance = 10 + Math.random() * 8;
    if (type === 'balloon') distance = 5 + Math.random() * 7;
    
    const x = Math.sin(angleRad) * distance;
    const z = -Math.cos(angleRad) * distance;
    
    let y = 1.0 + Math.random() * 3.5; // 1m to 4.5m high
    if (type === 'balloon') y = -0.5; // Start low on ground
    
    const pos = new THREE.Vector3(x, y, z);
    const targetObj = new Target(type, pos);
    targets.push(targetObj);
}

// Spawns initial Start Target
function spawnStartTarget() {
    clearAllTargets();
    const startTarget = new Target('start', new THREE.Vector3(0, 1.35, -4.5));
    targets.push(startTarget);
}

function clearAllTargets() {
    targets.forEach(t => t.deactivate());
    targets.length = 0;
}

// ============================================================================
// 7. COLLISION & ACCURACY COMPUTATION
// ============================================================================
function checkArrowCollisions(arrow) {
    // 1. Check intersection with active Targets
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        if (!target.active) continue;
        
        // Sphere collider check
        const dist = arrow.pos.distanceTo(target.position);
        if (dist < target.radius) {
            onHitSuccess(arrow, target, dist);
            return;
        }
        
        // Exact Plane-crossing check for rings (highly accurate for fast projectiles)
        if (target.type === 'ring' || target.type === 'start') {
            // Target is a plane. Arrow traveled from prevPos to pos.
            // Check if arrow crossed the plane at depth Z
            const targetZ = target.position.z;
            const prevZ = arrow.prevPos.z;
            const currZ = arrow.pos.z;
            
            // Check if Z crossed
            if ((prevZ >= targetZ && currZ <= targetZ) || (prevZ <= targetZ && currZ >= targetZ)) {
                // Linear interpolation factor
                const t = (targetZ - prevZ) / (currZ - prevZ);
                const crossX = arrow.prevPos.x + (arrow.pos.x - arrow.prevPos.x) * t;
                const crossY = arrow.prevPos.y + (arrow.pos.y - arrow.prevPos.y) * t;
                
                const intersectPos = new THREE.Vector3(crossX, crossY, targetZ);
                const radialDist = intersectPos.distanceTo(target.position);
                
                if (radialDist < target.radius) {
                    // Adjust arrow position to cross position to stick exactly on face
                    arrow.pos.copy(intersectPos);
                    onHitSuccess(arrow, target, radialDist);
                    return;
                }
            }
        }
    }
    
    // 2. Check collision with terrain (Ground)
    if (arrow.pos.y <= 0) {
        arrow.pos.y = 0;
        arrow.state = 'stuck';
        arrow.vel.set(0, 0, 0);
        audio.playGroundHit();
        spawnImpactRipple(arrow.pos.clone(), '#a855f7');
        return;
    }
    
    // 3. Check collision with mountains (simplifying with distance spheres)
    const mountains = UI.mountains.querySelectorAll('a-cone');
    mountains.forEach(mtn => {
        const mPos = new THREE.Vector3();
        mtn.object3D.getWorldPosition(mPos);
        const radius = parseFloat(mtn.getAttribute('radius-bottom'));
        const height = parseFloat(mtn.getAttribute('height'));
        
        // Simple cylinder bounding box check
        const dx = arrow.pos.x - mPos.x;
        const dz = arrow.pos.z - mPos.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        
        // Cone slope logic: radius shrinks as Y increases
        const relativeY = arrow.pos.y - mPos.y;
        if (relativeY >= 0 && relativeY <= height) {
            const shrinkRatio = 1 - (relativeY / height);
            const collisionRadius = radius * shrinkRatio;
            
            if (horizontalDist < collisionRadius) {
                arrow.state = 'stuck';
                arrow.vel.set(0, 0, 0);
                audio.playGroundHit();
                spawnImpactRipple(arrow.pos.clone(), '#8b5cf6');
            }
        }
    });
}

function onHitSuccess(arrow, target, hitOffset) {
    // Stick arrow
    arrow.state = 'stuck';
    arrow.vel.set(0, 0, 0);
    
    // Make arrow parented to target so it moves with it!
    target.el.object3D.worldToLocal(arrow.pos);
    // Adjust arrow rotation local to target
    const targetQuat = target.el.object3D.quaternion.clone().invert();
    arrow.el.object3D.quaternion.premultiply(targetQuat);
    arrow.el.object3D.position.copy(arrow.pos);
    
    // Move DOM element inside target element
    UI.arrowContainer.removeChild(arrow.el);
    target.el.appendChild(arrow.el);
    
    // Hit Actions
    if (target.type === 'start') {
        target.deactivate();
        startGame();
        return;
    }
    
    if (target.type === 'ring') {
        // Check accuracy bounds
        let scoreReward = 0;
        let ringName = '';
        let color = '#00f3ff';
        const hitPercent = 1.0 - (hitOffset / target.radius); // 0.0 to 1.0 (1.0 = bullseye)
        
        audio.playHit(hitPercent);
        
        if (hitOffset < 0.15) {
            scoreReward = 500;
            ringName = 'BULLSEYE!';
            color = '#eab308';
        } else if (hitOffset < 0.38) {
            scoreReward = 200;
            ringName = 'INNER RING';
            color = '#ec4899';
        } else {
            scoreReward = 100;
            ringName = 'HIT';
            color = '#0066ff';
        }
        
        game.score += scoreReward;
        spawnPointsText(scoreReward, ringName, target.position.clone(), color);
        spawnTargetHitExplosion(target.position.clone(), color);
        
        target.deactivate();
        
        // Remove from list
        const idx = targets.indexOf(target);
        if (idx > -1) targets.splice(idx, 1);
        
        // Spawn a replacement ring target immediately
        spawnTarget('ring');
    } 
    
    else if (target.type === 'balloon') {
        audio.playPowerup();
        
        // Balloon reward: score and arrows!
        game.score += 200;
        game.arrows = Math.min(game.arrows + 2, 15);
        
        spawnPointsText(200, '+2 ARROWS!', target.position.clone(), '#d8b4fe');
        spawnTargetHitExplosion(target.position.clone(), '#d8b4fe');
        
        target.deactivate();
        const idx = targets.indexOf(target);
        if (idx > -1) targets.splice(idx, 1);
    } 
    
    else if (target.type === 'drone') {
        audio.playPowerup();
        
        // Drone reward: higher points and arrows
        game.score += 300;
        game.arrows = Math.min(game.arrows + 3, 15);
        
        spawnPointsText(300, '+3 ARROWS!', target.position.clone(), '#00f3ff');
        spawnTargetHitExplosion(target.position.clone(), '#00f3ff');
        
        target.deactivate();
        const idx = targets.indexOf(target);
        if (idx > -1) targets.splice(idx, 1);
    }
    
    updateHUD();
}

// ============================================================================
// 8. VISUAL EFFECTS GENERATION (EXPLOSIONS & SCORE TEXT)
// ============================================================================
function spawnPointsText(points, label, position, color) {
    const textEl = document.createElement('a-entity');
    textEl.setAttribute('position', `${position.x} ${position.y + 0.6} ${position.z}`);
    textEl.setAttribute('text', `value: +${points}\n${label}; align: center; width: 4.5; color: ${color}; font: mozillavr`);
    
    UI.effectsContainer.appendChild(textEl);
    
    // Float upwards and fade out
    let duration = 1.2;
    const floatSpeed = 0.5;
    
    function animateText() {
        if (duration <= 0) {
            if (textEl.parentNode) textEl.parentNode.removeChild(textEl);
        } else {
            duration -= 0.016;
            const currentPos = textEl.object3D.position;
            textEl.setAttribute('position', `${currentPos.x} ${currentPos.y + floatSpeed * 0.016} ${currentPos.z}`);
            textEl.setAttribute('text', `value: +${points}\n${label}; align: center; width: 4.5; color: ${color}; font: mozillavr; opacity: ${duration}`);
            requestAnimationFrame(animateText);
        }
    }
    animateText();
}

function spawnTargetHitExplosion(position, color) {
    // Generate simple ring burst
    const ring = document.createElement('a-ring');
    ring.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    ring.setAttribute('radius-inner', '0.1');
    ring.setAttribute('radius-outer', '0.2');
    ring.setAttribute('color', color);
    ring.setAttribute('material', 'shader: flat; side: double');
    UI.effectsContainer.appendChild(ring);
    
    let life = 0.45;
    function animateExplosion() {
        if (life <= 0) {
            if (ring.parentNode) ring.parentNode.removeChild(ring);
        } else {
            life -= 0.016;
            const currentR = parseFloat(ring.getAttribute('radius-outer'));
            ring.setAttribute('radius-inner', `${currentR - 0.04}`);
            ring.setAttribute('radius-outer', `${currentR + 0.08}`);
            ring.setAttribute('material', `shader: flat; side: double; opacity: ${life * 2}`);
            requestAnimationFrame(animateExplosion);
        }
    }
    animateExplosion();
}

function spawnImpactRipple(position, color) {
    const ripple = document.createElement('a-ring');
    ripple.setAttribute('position', `${position.x} ${position.y + 0.01} ${position.z}`);
    ripple.setAttribute('rotation', '-90 0 0');
    ripple.setAttribute('radius-inner', '0.02');
    ripple.setAttribute('radius-outer', '0.05');
    ripple.setAttribute('color', color);
    ripple.setAttribute('material', 'shader: flat; side: double');
    UI.effectsContainer.appendChild(ripple);
    
    let life = 0.6;
    function animateRipple() {
        if (life <= 0) {
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        } else {
            life -= 0.016;
            const inner = parseFloat(ripple.getAttribute('radius-inner'));
            const outer = parseFloat(ripple.getAttribute('radius-outer'));
            ripple.setAttribute('radius-inner', `${inner + 0.06}`);
            ripple.setAttribute('radius-outer', `${outer + 0.08}`);
            ripple.setAttribute('material', `shader: flat; side: double; opacity: ${life}`);
            requestAnimationFrame(animateRipple);
        }
    }
    animateRipple();
}

// Generate starry constellation sky particles dynamically
function buildStars() {
    const numStars = 80;
    for (let i = 0; i < numStars; i++) {
        // Random spherical coordinates at radius = 80m
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        // Keep stars above ground (Y > 0)
        if (Math.sin(phi) < 0) continue;
        
        const r = 75;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = Math.abs(r * Math.sin(phi) * Math.sin(theta));
        const z = r * Math.cos(phi);
        
        const star = document.createElement('a-sphere');
        star.setAttribute('position', `${x} ${y} ${z}`);
        star.setAttribute('radius', `${0.12 + Math.random() * 0.18}`);
        star.setAttribute('color', Math.random() > 0.5 ? '#00f3ff' : '#ff007f');
        star.setAttribute('material', 'shader: flat; opacity: 0.6');
        UI.starsContainer.appendChild(star);
    }
}

// ============================================================================
// 9. GAME LIFECYCLE MANAGEMENT
// ============================================================================
function startGame() {
    audio.resume();
    audio.playStartFanfare();
    
    game.score = 0;
    game.arrows = 15;
    game.active = true;
    game.droneSpawnTimer = 3.0; // Spawn first drone in 3s
    game.balloonSpawnTimer = 1.0; // Spawn balloon in 1s
    
    // Close overlay card
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.uiLayer.classList.add('ui-layer-hidden');
    
    // Clear console "SHOOT TO START" label
    UI.vrBtnPlay.setAttribute('visible', 'false');
    
    // Open HUD
    UI.hud.classList.remove('hidden');
    
    clearAllTargets();
    
    // Spawn initial target rings (spawn 3 targets at different distances)
    spawnTarget('ring');
    spawnTarget('ring');
    spawnTarget('ring');
    
    updateHUD();
}

function updateHUD() {
    const formattedScore = String(game.score).padStart(4, '0');
    const formattedHighScore = String(game.highscore).padStart(4, '0');
    
    // 2D Hud
    UI.hudScore.innerText = formattedScore;
    UI.hudArrows.innerText = game.arrows;
    
    // 3D VR Console Hud
    UI.vrHudScore.setAttribute('value', `SCORE: ${formattedScore}`);
    UI.vrHudArrows.setAttribute('value', `ARROWS: ${game.arrows} / 15`);
    UI.vrHudHighScore.setAttribute('value', `BEST RECORD: ${formattedHighScore}`);
}

function checkGameOverDelay() {
    // Wait for flying arrows to finish before ending the game
    setTimeout(() => {
        const checkFlying = () => {
            const hasFlying = activeArrows.some(a => a.state === 'flying');
            if (hasFlying) {
                setTimeout(checkFlying, 200);
            } else {
                endGame();
            }
        };
        checkFlying();
    }, 500);
}

function endGame() {
    game.active = false;
    audio.playGameOverFanfare();
    
    // Update high scores
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('neon_archer_highscore', game.highscore);
    }
    
    // 2D HTML Overlays
    UI.statFinalScore.innerText = game.score;
    UI.statHighScore.innerText = game.highscore;
    
    UI.panelGameOver.classList.remove('hidden');
    UI.uiLayer.classList.remove('ui-layer-hidden');
    
    // 3D VR Console updates
    UI.vrBtnPlay.setAttribute('visible', 'true');
    UI.vrBtnPlayText.setAttribute('value', 'SHOOT TO PLAY AGAIN');
    
    updateHUD();
    clearAllTargets();
}

function updateVRSystemMsg() {
    if (game.inVR) {
        UI.vrStatus.innerText = "CYBERNETIC NEON VR ANCHOR DETECTED";
    } else {
        UI.vrStatus.innerText = "Calibrating cybernetic alignment...";
    }
}

// ============================================================================
// 10. SYSTEM INIT AND TICK ENGINE LOOP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 2D Button events
    UI.btnStart.addEventListener('click', () => {
        audio.resume();
        startGame();
    });
    UI.btnRestart.addEventListener('click', () => {
        audio.resume();
        startGame();
    });
    
    // 3D Console click event (mouse clicks/gaze raycast triggers startGame)
    UI.vrBtnPlay.addEventListener('click', () => {
        if (!game.active) {
            startGame();
        }
    });
    
    // Desktop and VR controllers system registrations
    desktop.init();
    vr.init();
    buildStars();
    spawnStartTarget();
    
    // Read High Score initial display
    updateHUD();
    
    // Audio initializations on page touches
    document.body.addEventListener('click', () => audio.resume(), { once: true });
});

// A-Frame Tick system hook for frame updates
AFRAME.registerComponent('neon-archer-tick-engine', {
    init: function () {
        this.lastTime = 0;
    },
    
    tick: function (time, timeDelta) {
        const dt = Math.min(timeDelta / 1000, 0.1); // clamp delta time to avoid jumps
        const timeSec = time / 1000;
        
        // 1. Update project arrows physics
        updatePhysics(dt);
        
        // 2. Update VR controls pulling
        if (game.inVR) {
            vr.update(dt);
        }
        
        // 3. Update moving targets positions
        targets.forEach(t => t.update(dt, timeSec));
        
        // 4. Spawner timers (only spawn during active games)
        if (game.active) {
            game.droneSpawnTimer -= dt;
            game.balloonSpawnTimer -= dt;
            
            // Spawn drones every 8 seconds
            if (game.droneSpawnTimer <= 0) {
                spawnTarget('drone');
                game.droneSpawnTimer = 7.0 + Math.random() * 5.0;
            }
            
            // Spawn balloons every 6 seconds
            if (game.balloonSpawnTimer <= 0) {
                spawnTarget('balloon');
                game.balloonSpawnTimer = 5.0 + Math.random() * 4.0;
            }
        }
    }
});

// Attach tick engine component to scene
document.getElementById('scene').setAttribute('neon-archer-tick-engine', '');
