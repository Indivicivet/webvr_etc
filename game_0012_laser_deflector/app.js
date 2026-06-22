/**
 * Laser Deflector (0012) - Application Logic
 * Synthesized audio and dynamic 3D physics deflection in WebVR.
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneGain = null;
        this.ambientFilter = null;
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

    // High quality laser zap
    playZap(isGreen = false) {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const startFreq = isGreen ? 600 : 800;
        const endFreq = isGreen ? 100 : 150;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
    }

    // Satisfying metallic chime on reflection, or warning buzzer on mismatch
    playReflect(success = true) {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        if (success) {
            // High-pitched crystal harmony (A5 & E6)
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, t);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1320, t);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + 0.41);
            osc2.stop(t + 0.41);
        } else {
            // Low harsh warning buzz
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.linearRampToValueAtTime(80, t + 0.2);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.26);
        }
    }

    // Rising energy pitch during drone charge up
    playCharge(duration = 2.0) {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + duration);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
    }

    // Exploding drone boom
    playExplosion() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);

        // Lowpass filtered noise burst for crackling boom texture
        try {
            const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, t);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.12, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            noise.start(t);
            noise.stop(t + 0.3);
        } catch (e) {
            console.warn("Explosion noise synthesis failed: ", e);
        }
    }

    // Neon ambient humming
    startAmbience() {
        this.resume();
        if (!this.ctx || this.droneOsc1) return;

        const t = this.ctx.currentTime;

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0, t);
        this.droneGain.gain.linearRampToValueAtTime(0.08, t + 2.0); // smooth fade
        this.droneGain.connect(this.ctx.destination);

        this.ambientFilter = this.ctx.createBiquadFilter();
        this.ambientFilter.type = 'lowpass';
        this.ambientFilter.frequency.value = 250;
        this.ambientFilter.connect(this.droneGain);

        // Low C1/C2 harmony
        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc1.type = 'sawtooth';
        this.droneOsc1.frequency.value = 65.41; // C2
        this.droneOsc1.connect(this.ambientFilter);
        this.droneOsc1.start(t);

        this.droneOsc2 = this.ctx.createOscillator();
        this.droneOsc2.type = 'triangle';
        this.droneOsc2.frequency.value = 98.0; // G2 (Fifth)
        this.droneOsc2.connect(this.ambientFilter);
        this.droneOsc2.start(t);

        // Slow filter resonance sweep
        this.sweepInterval = setInterval(() => {
            if (this.ctx && this.ambientFilter) {
                const now = this.ctx.currentTime;
                const freq = 180 + Math.sin(now * 0.4) * 70;
                this.ambientFilter.frequency.setValueAtTime(freq, now);
            }
        }, 100);
    }

    stopAmbience() {
        if (this.sweepInterval) {
            clearInterval(this.sweepInterval);
        }
        if (this.droneGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.droneGain.gain.cancelScheduledValues(t);
            this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
            this.droneGain.gain.linearRampToValueAtTime(0, t + 1.0);
            
            setTimeout(() => {
                if (this.droneOsc1) { this.droneOsc1.stop(); this.droneOsc1.disconnect(); this.droneOsc1 = null; }
                if (this.droneOsc2) { this.droneOsc2.stop(); this.droneOsc2.disconnect(); this.droneOsc2 = null; }
                if (this.droneGain) { this.droneGain.disconnect(); this.droneGain = null; }
            }, 1050);
        }
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    score: 0,
    wave: 1,
    multiplier: 1,
    integrity: 3,
    dronesKilled: 0,
    highscore: parseInt(localStorage.getItem('laser_deflector_high') || '0', 10),
    active: false,
    
    // Arrays tracking entities
    drones: [],
    lasers: [],
    particles: [],
    
    // Control States
    isVR: false,
    desktopColor: 'magenta', // magenta, cyan, green
    vrCrossed: false
};

const SHIELD_COLORS = {
    magenta: '#ff007f',
    cyan: '#00f3ff',
    green: '#39ff14'
};

// UI Cache references
const UI = {
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudWave: document.getElementById('hud-wave-val'),
    hudMultiplier: document.getElementById('hud-multiplier-val'),
    hudIntegrity: document.getElementById('hud-integrity'),
    desktopTip: document.getElementById('desktop-tip'),
    
    // Stats elements
    statFinalScore: document.getElementById('stat-final-score'),
    statFinalWave: document.getElementById('stat-final-wave'),
    statDronesKilled: document.getElementById('stat-drones-killed'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    // 3D rig targets
    desktopShieldRig: document.getElementById('desktop-shield-rig'),
    desktopShieldMesh: document.getElementById('desktop-shield-mesh'),
    desktopShieldWire: document.getElementById('desktop-shield-wire'),
    desktopShieldText: document.getElementById('desktop-shield-text'),
    
    vrLeftShield: document.getElementById('vr-left-shield'),
    vrRightShield: document.getElementById('vr-right-shield'),
    leftController: document.getElementById('left-controller'),
    rightController: document.getElementById('right-controller'),
    impactLight: document.getElementById('impact-light'),
    
    droneContainer: document.getElementById('drone-container'),
    laserContainer: document.getElementById('laser-container'),
    particleContainer: document.getElementById('particle-container')
};

// ==========================================
// 3. A-FRAME CORE GAME-LOOP COMPONENT
// ==========================================
AFRAME.registerComponent('game-loop', {
    init: function () {
        this.tickTimer = 0;
    },

    tick: function (time, timeDelta) {
        if (!game.active) return;
        const dt = timeDelta * 0.001; // seconds

        // 1. Check if VR controllers are crossed
        checkVRCrossed();

        // 2. Update Drones
        updateDrones(dt);

        // 3. Update Lasers & Collisions
        updateLasers(dt);

        // 4. Update Particles
        updateParticles(dt);
        
        // 5. Slowly breathe sky ambient grid brightness
        const skyGrid = document.querySelector('a-plane[width="100"]');
        if (skyGrid) {
            const gridPulse = 0.04 + Math.sin(time * 0.001) * 0.02;
            skyGrid.setAttribute('material', 'opacity', gridPulse);
        }
    }
});

// Attach system component
document.querySelector('a-scene').setAttribute('game-loop', '');

// ==========================================
// 4. INITIALIZATION & CONTROLS BINDINGS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sceneEl = document.querySelector('a-scene');

    // Button event listeners
    UI.btnStart.addEventListener('click', startGame);
    UI.btnRestart.addEventListener('click', startGame);

    // Monitor VR entry/exit
    sceneEl.addEventListener('enter-vr', () => {
        game.isVR = true;
        UI.desktopTip.classList.add('hidden');
        UI.desktopShieldRig.setAttribute('visible', 'false');
        if (UI.leftController) UI.leftController.setAttribute('visible', 'true');
        if (UI.rightController) UI.rightController.setAttribute('visible', 'true');
        
        audio.resume();
        audio.startAmbience();
        UI.panelStart.classList.add('hidden');
        UI.panelGameOver.classList.add('hidden');
        UI.hud.classList.remove('hidden'); // keep HUD on mirror screen
    });

    sceneEl.addEventListener('exit-vr', () => {
        game.isVR = false;
        UI.desktopTip.classList.remove('hidden');
        UI.desktopShieldRig.setAttribute('visible', 'true');
        
        if (game.active) {
            UI.hud.classList.remove('hidden');
        } else {
            UI.panelStart.classList.remove('hidden');
        }
    });

    // Desktop mouse positioning controls
    window.addEventListener('mousemove', (e) => {
        if (!game.active || game.isVR) return;

        // Map client coordinates to -1.5m to 1.5m X range, 0.7m to 2.3m Y range
        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

        const targetX = mouseX * 1.5;
        const targetY = 1.5 + mouseY * 0.8;

        if (UI.desktopShieldRig) {
            UI.desktopShieldRig.setAttribute('position', `${targetX} ${targetY} -1.2`);
        }
    });

    // Desktop mouse click controls to change color
    window.addEventListener('mousedown', (e) => {
        if (!game.active || game.isVR) return;
        
        if (e.button === 0) {
            // Left click: Toggle between Magenta and Cyan
            setDesktopColor(game.desktopColor === 'magenta' ? 'cyan' : 'magenta');
        } else if (e.button === 2) {
            // Right click: Alternative toggle
            setDesktopColor(game.desktopColor === 'cyan' ? 'magenta' : 'cyan');
        }
    });

    // Spacebar to merge / hold Green shield
    window.addEventListener('keydown', (e) => {
        if (!game.active || game.isVR) return;
        if (e.code === 'Space') {
            setDesktopColor('green');
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!game.active || game.isVR) return;
        if (e.code === 'Space') {
            setDesktopColor('magenta'); // revert
        }
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => {
        if (game.active) e.preventDefault();
    });

    // User gesture initialization
    document.body.addEventListener('pointerdown', () => {
        audio.init();
    });

    // High score layout load
    UI.statHighScore.innerText = game.highscore;
});

// ==========================================
// 5. CORE GAME CONTROLLER
// ==========================================
function startGame() {
    audio.resume();
    audio.playReflect(true);
    audio.startAmbience();

    // Reset stats
    game.score = 0;
    game.wave = 1;
    game.multiplier = 1;
    game.integrity = 3;
    game.dronesKilled = 0;
    game.active = true;

    // Clean entities
    clearEntities();

    // Reset UI
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    
    if (game.isVR) {
        UI.desktopTip.classList.add('hidden');
        UI.desktopShieldRig.setAttribute('visible', 'false');
    } else {
        UI.desktopTip.classList.remove('hidden');
        UI.desktopShieldRig.setAttribute('visible', 'true');
        setDesktopColor('magenta');
    }

    updateHUD();

    // Start wave loop
    startNewWave();
}

function startNewWave() {
    updateHUD();
    
    // Spawn drones for the wave
    const droneCount = Math.min(game.wave + 1, 5);
    const coneAngle = 60; // Drones span 60 degrees

    for (let i = 0; i < droneCount; i++) {
        // Distribute drones evenly across the arc, with random variations
        const fraction = droneCount > 1 ? (i / (droneCount - 1)) - 0.5 : 0;
        const angle = fraction * coneAngle * (Math.PI / 180);
        
        // Spawn 8 meters away
        const spawnX = 8 * Math.sin(angle);
        const spawnZ = -8 * Math.cos(angle);
        const spawnY = 1.2 + Math.random() * 1.5;

        // Choose random starting type (Magenta, Cyan, Green for high waves)
        let colorType = Math.random() > 0.5 ? 'magenta' : 'cyan';
        if (game.wave >= 3 && Math.random() > 0.7) {
            colorType = 'green';
        }

        spawnDrone(spawnX, spawnY, spawnZ, colorType);
    }
}

// Clear all active objects in scene
function clearEntities() {
    game.drones.forEach(d => {
        if (d.el && d.el.parentNode) d.el.parentNode.removeChild(d.el);
    });
    game.lasers.forEach(l => {
        if (l.el && l.el.parentNode) l.el.parentNode.removeChild(l.el);
    });
    game.particles.forEach(p => {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    });

    game.drones = [];
    game.lasers = [];
    game.particles = [];
}

// Change desktop active shield color
function setDesktopColor(color) {
    game.desktopColor = color;
    const hex = SHIELD_COLORS[color];

    if (UI.desktopShieldMesh) {
        UI.desktopShieldMesh.setAttribute('color', hex);
        UI.desktopShieldMesh.setAttribute('material', 'emissive', hex);
    }
    if (UI.desktopShieldWire) {
        UI.desktopShieldWire.setAttribute('color', hex);
    }
    if (UI.desktopShieldText) {
        UI.desktopShieldText.setAttribute('value', color.toUpperCase());
        UI.desktopShieldText.setAttribute('color', '#ffffff');
    }
}

// Check VR controllers crossing to form green shield
function checkVRCrossed() {
    if (!game.isVR || !UI.leftController || !UI.rightController) return;

    const leftPos = UI.leftController.object3D.position;
    const rightPos = UI.rightController.object3D.position;
    
    // Check Euclidean distance
    const dist = leftPos.distanceTo(rightPos);

    if (dist < 0.26) {
        if (!game.vrCrossed) {
            game.vrCrossed = true;
            // Set both VR shields to Green
            setVRShieldVisuals('green');
        }
    } else {
        if (game.vrCrossed) {
            game.vrCrossed = false;
            // Restore Left=Magenta, Right=Cyan
            setVRShieldVisuals('normal');
        }
    }
}

function setVRShieldVisuals(mode) {
    if (mode === 'green') {
        const greenHex = SHIELD_COLORS.green;
        // Left
        UI.vrLeftShield.children[0].setAttribute('color', greenHex);
        UI.vrLeftShield.children[0].setAttribute('material', 'emissive', greenHex);
        UI.vrLeftShield.children[1].setAttribute('color', greenHex);
        // Right
        UI.vrRightShield.children[0].setAttribute('color', greenHex);
        UI.vrRightShield.children[0].setAttribute('material', 'emissive', greenHex);
        UI.vrRightShield.children[1].setAttribute('color', greenHex);
    } else {
        const mHex = SHIELD_COLORS.magenta;
        const cHex = SHIELD_COLORS.cyan;
        // Left Left Magenta
        UI.vrLeftShield.children[0].setAttribute('color', mHex);
        UI.vrLeftShield.children[0].setAttribute('material', 'emissive', mHex);
        UI.vrLeftShield.children[1].setAttribute('color', mHex);
        // Right Cyan
        UI.vrRightShield.children[0].setAttribute('color', cHex);
        UI.vrRightShield.children[0].setAttribute('material', 'emissive', cHex);
        UI.vrRightShield.children[1].setAttribute('color', cHex);
    }
}

// ==========================================
// 6. ENTITY SPAWNING AND BEHAVIORS
// ==========================================
function spawnDrone(x, y, z, colorType) {
    const droneEl = document.createElement('a-entity');
    droneEl.setAttribute('position', `${x} ${y} ${z}`);

    // Sleek metal sphere body
    const body = document.createElement('a-sphere');
    body.setAttribute('radius', '0.28');
    body.setAttribute('color', '#1b1733');
    body.setAttribute('material', 'roughness: 0.2; metalness: 0.8');
    droneEl.appendChild(body);

    // Glowing core ring (indicates active state)
    const ringColor = SHIELD_COLORS[colorType];
    const coreRing = document.createElement('a-torus');
    coreRing.setAttribute('radius', '0.31');
    coreRing.setAttribute('radius-tubular', '0.015');
    coreRing.setAttribute('color', ringColor);
    coreRing.setAttribute('material', `shader: flat; emissive: ${ringColor}; emissiveIntensity: 0.5`);
    coreRing.setAttribute('rotation', '0 0 0');
    droneEl.appendChild(coreRing);

    // Rotating firing nozzle
    const nozzle = document.createElement('a-cylinder');
    nozzle.setAttribute('radius', '0.04');
    nozzle.setAttribute('height', '0.2');
    nozzle.setAttribute('color', '#3a3459');
    nozzle.setAttribute('position', '0 0 0.26');
    nozzle.setAttribute('rotation', '90 0 0');
    droneEl.appendChild(nozzle);

    // Nozzle tip glow light
    const tipGlow = document.createElement('a-sphere');
    tipGlow.setAttribute('radius', '0.035');
    tipGlow.setAttribute('color', ringColor);
    tipGlow.setAttribute('position', '0 0 0.38');
    tipGlow.setAttribute('material', `shader: flat; emissive: ${ringColor}; emissiveIntensity: 0.3`);
    droneEl.appendChild(tipGlow);

    UI.droneContainer.appendChild(droneEl);

    // Aim drone nozzle at player head level (0, 1.6, 0)
    droneEl.object3D.lookAt(new THREE.Vector3(0, 1.6, 0));

    const drone = {
        id: Math.random().toString(36).substr(2, 9),
        el: droneEl,
        colorType: colorType,
        position: new THREE.Vector3(x, y, z),
        state: 'charging',
        chargeTimer: 0,
        chargeDuration: 2.0 + Math.random() * 1.5 - (game.wave * 0.1), // gets faster in later waves
        pulseSpeed: 4.0
    };
    
    // Clamp min charge duration to 1.0s
    if (drone.chargeDuration < 1.0) drone.chargeDuration = 1.0;

    game.drones.push(drone);
    audio.playCharge(drone.chargeDuration);
}

function spawnLaser(fromPos, colorType) {
    const laserEl = document.createElement('a-sphere');
    laserEl.setAttribute('radius', '0.12');
    laserEl.setAttribute('position', `${fromPos.x} ${fromPos.y} ${fromPos.z}`);
    
    const hex = SHIELD_COLORS[colorType];
    laserEl.setAttribute('color', hex);
    laserEl.setAttribute('material', `shader: flat; emissive: ${hex}; emissiveIntensity: 1.5`);

    // Inner core sphere (very bright center)
    const core = document.createElement('a-sphere');
    core.setAttribute('radius', '0.07');
    core.setAttribute('color', '#ffffff');
    core.setAttribute('material', 'shader: flat');
    laserEl.appendChild(core);

    UI.laserContainer.appendChild(laserEl);

    // Fire directly at the defense center (0, 1.6, 0)
    const target = new THREE.Vector3(0, 1.6, 0);
    const dir = new THREE.Vector3().copy(target).sub(fromPos).normalize();
    const speed = 3.5 + (game.wave * 0.3); // laser speed scales

    const laser = {
        el: laserEl,
        colorType: colorType,
        position: new THREE.Vector3().copy(fromPos),
        velocity: dir.multiplyScalar(speed),
        reflected: false,
        reflectedTargetDrone: null,
        trailTimer: 0
    };

    game.lasers.push(laser);
    audio.playZap(colorType === 'green');
}

function spawnExplosion(pos, colorHex, particleCount = 12) {
    for (let i = 0; i < particleCount; i++) {
        const pEl = document.createElement('a-sphere');
        pEl.setAttribute('radius', (0.04 + Math.random() * 0.04).toFixed(3));
        pEl.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
        pEl.setAttribute('color', colorHex);
        pEl.setAttribute('material', `shader: flat; opacity: 0.9; emissive: ${colorHex}; emissiveIntensity: 1.0`);

        UI.particleContainer.appendChild(pEl);

        // Spherical velocity vector distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 1.5 + Math.random() * 3;
        
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);

        game.particles.push({
            el: pEl,
            position: new THREE.Vector3(pos.x, pos.y, pos.z),
            velocity: new THREE.Vector3(vx, vy, vz),
            opacity: 0.9,
            life: 0.8 + Math.random() * 0.4
        });
    }
}

// ==========================================
// 7. CORE TICK HANDLERS
// ==========================================
function updateDrones(dt) {
    game.drones.forEach(drone => {
        if (drone.state === 'charging') {
            drone.chargeTimer += dt;
            
            // Pulse the emission intensity to indicate charging
            const intensity = 0.5 + Math.sin(drone.chargeTimer * drone.pulseSpeed) * 0.4;
            const core = drone.el.children[1];
            if (core) {
                core.setAttribute('material', 'emissiveIntensity', intensity);
            }

            if (drone.chargeTimer >= drone.chargeDuration) {
                // Fire!
                drone.state = 'cooldown';
                drone.chargeTimer = 0;
                spawnLaser(drone.position, drone.colorType);
            }
        } else if (drone.state === 'cooldown') {
            drone.chargeTimer += dt;
            if (drone.chargeTimer >= 1.5 + Math.random() * 1.5) {
                drone.state = 'charging';
                drone.chargeTimer = 0;
                drone.chargeDuration = Math.max(1.0, 1.8 + Math.random() * 1.2 - (game.wave * 0.1));
                audio.playCharge(drone.chargeDuration);
            }
        }
    });
}

function updateLasers(dt) {
    const toRemove = [];

    for (let i = 0; i < game.lasers.length; i++) {
        const laser = game.lasers[i];

        // Update physical position
        laser.position.addScaledVector(laser.velocity, dt);
        laser.el.setAttribute('position', `${laser.position.x} ${laser.position.y} ${laser.position.z}`);

        // Handle reflected state
        if (laser.reflected) {
            // Collision check with drones
            let hit = false;
            for (let j = 0; j < game.drones.length; j++) {
                const drone = game.drones[j];
                const dist = laser.position.distanceTo(drone.position);
                
                if (dist < 0.6) {
                    // Destroy Drone!
                    destroyDrone(drone);
                    hit = true;
                    break;
                }
            }

            // Clean if it flies away
            if (hit || laser.position.length() > 20) {
                toRemove.push(laser);
            }
            continue;
        }

        // --- Handle Incoming Shield Collisions ---
        let hitShield = false;
        let correctShield = false;
        let shieldPos = new THREE.Vector3();
        let targetShieldEl = null;

        if (game.isVR) {
            // VR: Check left and right shields separately
            if (UI.leftController && UI.rightController) {
                const leftPos = UI.leftController.object3D.position;
                const rightPos = UI.rightController.object3D.position;

                const distL = laser.position.distanceTo(leftPos);
                const distR = laser.position.distanceTo(rightPos);

                if (distL < 0.35) {
                    hitShield = true;
                    shieldPos.copy(leftPos);
                    targetShieldEl = UI.vrLeftShield;
                    correctShield = (game.vrCrossed && laser.colorType === 'green') || (!game.vrCrossed && laser.colorType === 'magenta');
                } else if (distR < 0.35) {
                    hitShield = true;
                    shieldPos.copy(rightPos);
                    targetShieldEl = UI.vrRightShield;
                    correctShield = (game.vrCrossed && laser.colorType === 'green') || (!game.vrCrossed && laser.colorType === 'cyan');
                }
            }
        } else {
            // Desktop: Check the single desktop shield
            const dPos = UI.desktopShieldRig.object3D.position;
            const dist = laser.position.distanceTo(dPos);

            if (dist < 0.45) {
                hitShield = true;
                shieldPos.copy(dPos);
                targetShieldEl = UI.desktopShieldRig;
                correctShield = (laser.colorType === game.desktopColor);
            }
        }

        if (hitShield) {
            if (correctShield) {
                // SUCCESSFUL REFLECTION!
                laser.reflected = true;
                audio.playReflect(true);
                flashImpactLight(shieldPos, laser.colorType);

                // Change laser visual state to white gold reflecting beam
                laser.el.setAttribute('color', '#ffff00');
                laser.el.setAttribute('material', 'emissive', '#ffff00');
                laser.el.setAttribute('material', 'emissiveIntensity', 2.0);
                
                // Physics Reflection Vector
                let reflectDir = new THREE.Vector3();
                if (game.isVR && targetShieldEl) {
                    // Compute world reflection vector from controller orientation
                    const normal = new THREE.Vector3(0, 0, -1);
                    normal.applyQuaternion(targetShieldEl.object3D.getWorldQuaternion(new THREE.Quaternion()));
                    normal.normalize();

                    const incomingDir = new THREE.Vector3().copy(laser.velocity).normalize();
                    
                    // R = I - 2 * (I . N) * N
                    const dot = incomingDir.dot(normal);
                    reflectDir.copy(incomingDir).subScaledVector(normal, 2 * dot).normalize();

                    // Safety checks: Make sure it goes forward (Z < 0)
                    if (reflectDir.z > 0) reflectDir.z = -reflectDir.z;
                } else {
                    // Desktop minimal: Find nearest drone and reflect laser towards it
                    const nearest = findNearestDrone(laser.position);
                    if (nearest) {
                        reflectDir.copy(nearest.position).sub(laser.position).normalize();
                    } else {
                        // Fallback straight forward reflection
                        reflectDir.set(0, 0.2, -1).normalize();
                    }
                }

                // Boost velocity on reflection
                laser.velocity.copy(reflectDir).multiplyScalar(10.0);
            } else {
                // MISMATCH ERROR: Explodes and damages integrity
                takeDamage(laser.position, laser.colorType);
                toRemove.push(laser);
            }
            continue;
        }

        // Missed defense and passed behind player
        if (laser.position.z > 0.3) {
            takeDamage(laser.position, laser.colorType);
            toRemove.push(laser);
        }
    }

    // Remove obsolete lasers
    toRemove.forEach(laser => {
        if (laser.el && laser.el.parentNode) {
            laser.el.parentNode.removeChild(laser.el);
        }
        const index = game.lasers.indexOf(laser);
        if (index > -1) game.lasers.splice(index, 1);
    });
}

function updateParticles(dt) {
    const toRemove = [];
    game.particles.forEach(p => {
        p.life -= dt;
        if (p.life <= 0) {
            toRemove.push(p);
            return;
        }

        // Gravity effect
        p.velocity.y -= 2.0 * dt;

        p.position.addScaledVector(p.velocity, dt);
        p.el.setAttribute('position', `${p.position.x} ${p.position.y} ${p.position.z}`);
        
        p.opacity = p.life / 1.2;
        p.el.setAttribute('material', 'opacity', p.opacity.toFixed(2));
    });

    toRemove.forEach(p => {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        const index = game.particles.indexOf(p);
        if (index > -1) game.particles.splice(index, 1);
    });
}

// ==========================================
// 8. GAMEPLAY ACTIONS
// ==========================================
function destroyDrone(drone) {
    audio.playExplosion();
    const hex = SHIELD_COLORS[drone.colorType];
    spawnExplosion(drone.position, hex, 18);

    // Remove from scene
    if (drone.el && drone.el.parentNode) {
        drone.el.parentNode.removeChild(drone.el);
    }
    
    // Remove from array
    const index = game.drones.indexOf(drone);
    if (index > -1) game.drones.splice(index, 1);

    // Update stats
    game.dronesKilled++;
    game.score += 100 * game.multiplier;
    game.multiplier++;

    updateHUD();

    // Check if wave is completed
    if (game.drones.length === 0) {
        game.wave++;
        // Short pause, then start next wave
        setTimeout(() => {
            if (game.active) startNewWave();
        }, 1200);
    }
}

function takeDamage(pos, laserColor) {
    audio.playReflect(false);
    
    const hex = SHIELD_COLORS[laserColor];
    spawnExplosion(pos, hex, 12);
    
    game.integrity = Math.max(0, game.integrity - 1);
    game.multiplier = 1; // reset combo multiplier

    updateHUD();

    // Trigger visual scene flash
    triggerSceneFlash('#ff003b');

    // Haptic pulse check
    triggerVRHaptics(0.8, 150);

    if (game.integrity <= 0) {
        endGame();
    }
}

function endGame() {
    game.active = false;
    audio.stopAmbience();

    // Check local records
    let isNewRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('laser_deflector_high', game.highscore.toString());
        isNewRecord = true;
    }

    // Set overlay stats
    UI.statFinalScore.innerText = game.score;
    UI.statFinalWave.innerText = game.wave;
    UI.statDronesKilled.innerText = game.dronesKilled;
    UI.statHighScore.innerText = game.highscore;

    if (isNewRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }

    // Toggle panel displays
    UI.panelGameOver.classList.remove('hidden');
    UI.hud.classList.add('hidden');
    UI.desktopTip.classList.add('hidden');
    
    clearEntities();
}

// ==========================================
// 9. HELPER FUNCTIONS
// ==========================================
function updateHUD() {
    if (UI.hudScore) UI.hudScore.innerText = game.score.toString();
    if (UI.hudWave) UI.hudWave.innerText = game.wave.toString();
    if (UI.hudMultiplier) UI.hudMultiplier.innerText = `x${game.multiplier}`;

    // Render integrity dots
    if (UI.hudIntegrity) {
        UI.hudIntegrity.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'integrity-dot';
            if (i >= game.integrity) {
                dot.className += ' damaged';
            }
            UI.hudIntegrity.appendChild(dot);
        }
    }
}

function findNearestDrone(laserPos) {
    if (game.drones.length === 0) return null;
    let minD = Infinity;
    let nearest = null;

    game.drones.forEach(drone => {
        const d = laserPos.distanceTo(drone.position);
        if (d < minD) {
            minD = d;
            nearest = drone;
        }
    });

    return nearest;
}

function flashImpactLight(pos, colorType) {
    if (!UI.impactLight) return;
    const hex = SHIELD_COLORS[colorType];
    UI.impactLight.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    UI.impactLight.setAttribute('light', `color: ${hex}; intensity: 2.0; distance: 5`);
    
    // Quick fadeout
    let intensity = 2.0;
    const fade = setInterval(() => {
        intensity -= 0.2;
        if (intensity <= 0) {
            intensity = 0;
            clearInterval(fade);
        }
        if (UI.impactLight) {
            UI.impactLight.setAttribute('light', 'intensity', intensity);
        }
    }, 30);
}

function triggerSceneFlash(colorHex) {
    const sky = document.querySelector('a-sky');
    if (!sky) return;
    
    sky.setAttribute('color', colorHex);
    setTimeout(() => {
        sky.setAttribute('color', '#05030a');
    }, 100);
}

function triggerVRHaptics(pulseStrength, duration) {
    if (!game.isVR) return;
    
    // Trigger on both controllers if they have actuators
    const controllers = [UI.leftController, UI.rightController];
    controllers.forEach(controller => {
        if (!controller) return;
        const trackedControls = controller.components['tracked-controls-webxr'] || controller.components['tracked-controls'];
        if (trackedControls && trackedControls.controller) {
            const gamepad = trackedControls.controller.gamepad;
            if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                gamepad.hapticActuators[0].pulse(pulseStrength, duration).catch(() => {});
            }
        }
    });
}
