/**
 * Chromatic Gaze Matcher - Game Core Logic
 * Fully gaze-driven VR gameplay using A-Frame and synthesized Web Audio.
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
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
            
            // Zen chord progression (soft swells)
            const chords = [
                [130.81, 196.00, 293.66, 329.63, 392.00], // Cmaj9
                [174.61, 261.63, 329.63, 440.00, 523.25], // Fmaj7
                [110.00, 164.81, 261.63, 329.63, 392.00], // Am7
                [97.99, 146.83, 246.94, 329.63, 392.00]   // G6
            ];
            
            const chord = chords[Math.floor(Math.random() * chords.length)];
            const attack = 2.5;
            const sustain = 3.0;
            const release = 2.5;
            const duration = attack + sustain + release;
            
            chord.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                // Add soft detune for thick lush vibe
                osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.0, t);
                
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
        this.musicIntervalId = setInterval(playSwell, 7500);
    }
    
    stopAmbientMusic() {
        this.musicPlaying = false;
        if (this.musicIntervalId) {
            clearInterval(this.musicIntervalId);
            this.musicIntervalId = null;
        }
    }

    playZap() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Sweet high-pitched resonance chime (C6 to G6)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, t); // C6
        osc1.frequency.exponentialRampToValueAtTime(1567.98, t + 0.12); // G6
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.51, t); // E6
        osc2.frequency.exponentialRampToValueAtTime(2093.00, t + 0.12); // C7
        
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.22);
        osc2.stop(t + 0.22);
    }

    playBuzz() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.3;
        
        // Detuned low buzzer sound (sawtooth and square)
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(110, t); // A2
        osc1.frequency.linearRampToValueAtTime(75, t + duration);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(113, t); // detuned
        osc2.frequency.linearRampToValueAtTime(78, t + duration);
        
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + duration + 0.01);
        osc2.stop(t + duration + 0.01);
    }

    playWaveComplete() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        // Rising pentatonic chord chime
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.07;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.08, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.31);
        });
    }

    playStartFanfare() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        // Cyberpunk synth arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4 to G5
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.05;
            
            osc.type = 'triangle';
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

    playGameOver() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        // Descending cyber minor chord
        const notes = [392.00, 311.13, 261.63, 196.00, 130.81]; // G4, Eb4, C4, G3, C3
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.12;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.46);
        });
    }
}

const audio = new SoundEngine();

// ==========================================
// 1.5. VR CONTROLLER & HAPTIC SYSTEM
// ==========================================
let controllersConnected = 0;

function triggerVRHaptics(intensity = 0.5, duration = 100) {
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
    const gazeCursor = document.getElementById('gaze-cursor');
    if (!gazeCursor) return;
    
    const inVR = sceneEl && sceneEl.is('vr-mode');
    if (inVR) {
        if (controllersConnected > 0) {
            gazeCursor.setAttribute('visible', 'false');
            gazeCursor.setAttribute('raycaster', 'enabled: false');
        } else {
            gazeCursor.setAttribute('visible', 'true');
            gazeCursor.setAttribute('raycaster', 'enabled: true; objects: .target');
        }
    } else {
        gazeCursor.setAttribute('visible', 'false');
        gazeCursor.setAttribute('raycaster', 'enabled: false');
    }
}

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const COLORS = ['#00f3ff', '#ff007f', '#ffff00', '#9d00ff']; // Cyan, Magenta, Yellow, Purple

const game = {
    score: 0,
    highscore: parseInt(localStorage.getItem('chromatic_gaze_highscore') || '0', 10),
    multiplier: 1,
    wave: 0,
    timeRemaining: 20.0,
    active: false,
    currentTargetColor: '',
    targetCubesRemaining: 0,
    timerId: null,
    planeRotation: { x: 0, y: 0, z: 0 },
    
    // Baselines for coordinates of 8 orbital cubes
    cubeBaselines: [
        { x: 0.5, y: 0, z: 0 },
        { x: 0.354, y: 0.354, z: 0 },
        { x: 0, y: 0.5, z: 0 },
        { x: -0.354, y: 0.354, z: 0 },
        { x: -0.5, y: 0, z: 0 },
        { x: -0.354, y: -0.354, z: 0 },
        { x: 0, y: -0.5, z: 0 },
        { x: 0.354, y: -0.354, z: 0 }
    ]
};

// ==========================================
// 3. UI ELEMENT REFERENCES
// ==========================================
const UI = {
    // 2D Overlays
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    // 2D HUD Info
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudMultiplier: document.getElementById('hud-multiplier-val'),
    hudWave: document.getElementById('hud-wave-val'),
    hudTime: document.getElementById('hud-time-val'),
    
    // 2D Game Over Panel Info
    statFinalScore: document.getElementById('stat-final-score'),
    statFinalWave: document.getElementById('stat-final-wave'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    // 3D VR Elements
    vrBtnRestart: document.getElementById('vr-btn-restart'),
    vrHud: document.getElementById('vr-hud'),
    vrHudScore: document.getElementById('vr-hud-score'),
    vrHudMult: document.getElementById('vr-hud-mult'),
    vrHudTimer: document.getElementById('vr-hud-timer'),
    targetRing: document.getElementById('target-ring'),
    targetSphere: document.getElementById('target-sphere'),
    targetGlow: document.getElementById('target-glow'),
    puzzleGroup: document.getElementById('puzzle-group')
};

// ==========================================
// 4. A-FRAME SYSTEM CUSTOM COMPONENTS
// ==========================================
AFRAME.registerComponent('space-animate', {
    init: function () {
        // Star dust particles setup
        const dustContainer = document.getElementById('dust-particles');
        for (let i = 0; i < 35; i++) {
            const star = document.createElement('a-sphere');
            const x = (Math.random() - 0.5) * 8;
            const y = Math.random() * 3.5 + 0.2;
            const z = (Math.random() - 0.5) * 8 - 2;
            
            star.setAttribute('position', `${x} ${y} ${z}`);
            star.setAttribute('radius', (Math.random() * 0.015 + 0.008).toFixed(3));
            star.setAttribute('color', '#00f3ff');
            star.setAttribute('material', 'shader: flat; opacity: ' + (Math.random() * 0.4 + 0.2).toFixed(2));
            
            star.dataset.speed = (Math.random() * 0.6 + 0.2).toFixed(2);
            star.dataset.range = (Math.random() * 0.12 + 0.04).toFixed(2);
            star.dataset.baseY = y.toFixed(2);
            dustContainer.appendChild(star);
        }
    },
    
    tick: function (time, timeDelta) {
        const t = time * 0.001; // seconds
        
        // 1. Slowly breathe the central target sphere size and emission intensity
        if (UI.targetSphere) {
            const pulse = 1.0 + Math.sin(t * 2.2) * 0.07;
            UI.targetSphere.setAttribute('scale', `${pulse} ${pulse} ${pulse}`);
            if (game.active) {
                const emissiveIntensity = 0.45 + Math.sin(t * 3.5) * 0.2;
                UI.targetSphere.setAttribute('material', 'emissiveIntensity', emissiveIntensity);
            }
        }
        
        // 2. Clock-like rotation of the orbital group
        if (UI.puzzleGroup && game.active) {
            const dt = timeDelta * 0.001; // seconds
            const wave = game.wave || 1;
            let rx = 0;
            let ry = 0;
            let rz = 10; // base Z rate

            if (wave > 1) {
                // Plane tilts and rotates around all axes (dynamic wobble)
                rx = (wave - 1) * 3; // X rotation speed
                ry = (wave - 1) * 4; // Y rotation speed
                rz = 10 + (wave - 1) * 5; // Z rotation speed
            }

            // Accumulate rotation angles smoothly
            game.planeRotation.x = (game.planeRotation.x + rx * dt) % 360;
            game.planeRotation.y = (game.planeRotation.y + ry * dt) % 360;
            game.planeRotation.z = (game.planeRotation.z + rz * dt) % 360;

            UI.puzzleGroup.setAttribute('rotation', `${game.planeRotation.x} ${game.planeRotation.y} ${game.planeRotation.z}`);
            
            // 3. Make individual cubes spin on their own local axes
            const cubes = document.querySelectorAll('.color-cube');
            cubes.forEach((cube, index) => {
                const rotX = t * 25 + index * 30;
                const rotY = t * 15 + index * 45;
                cube.setAttribute('rotation', `${rotX} ${rotY} 0`);
            });
        }
        
        // 4. Animate floating star dust particles
        const stars = document.querySelectorAll('#dust-particles a-sphere');
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
    }
});

// Attach component to the scene
document.querySelector('a-scene').setAttribute('space-animate', '');

// ==========================================
// 5. INITIALIZATION & BINDINGS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sceneEl = document.querySelector('a-scene');
    const gazeCursor = document.getElementById('gaze-cursor');
    const leftController = document.getElementById('left-controller');
    const rightController = document.getElementById('right-controller');
    
    // Hide gaze cursor reticle on desktop by default (use mouse cursor instead)
    if (gazeCursor) {
        gazeCursor.setAttribute('visible', 'false');
        gazeCursor.setAttribute('raycaster', 'enabled: false');
    }
    
    // Toggle gaze reticle depending on VR entry/exit
    sceneEl.addEventListener('enter-vr', () => {
        audio.resume();
        audio.startAmbientMusic();
        UI.panelStart.classList.add('hidden');
        UI.panelGameOver.classList.add('hidden');
        UI.hud.classList.add('hidden');

        if (game.active) {
            UI.vrHud.setAttribute('visible', 'true');
            UI.vrBtnRestart.setAttribute('visible', 'false');
            UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
            UI.vrBtnRestart.classList.remove('target');
            UI.targetRing.setAttribute('visible', 'false');
            UI.targetRing.setAttribute('scale', '0.001 0.001 0.001');
            UI.targetRing.classList.remove('target');
        } else {
            UI.vrHud.setAttribute('visible', 'false');
            if (game.wave === 0) {
                UI.targetRing.setAttribute('visible', 'true');
                UI.targetRing.setAttribute('scale', '1 1 1');
                UI.targetRing.classList.add('target');
                UI.vrBtnRestart.setAttribute('visible', 'false');
                UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
                UI.vrBtnRestart.classList.remove('target');
            } else {
                UI.vrBtnRestart.setAttribute('visible', 'true');
                UI.vrBtnRestart.setAttribute('scale', '1 1 1');
                UI.vrBtnRestart.classList.add('target');
                UI.targetRing.setAttribute('visible', 'true');
                UI.targetRing.setAttribute('scale', '1 1 1');
                UI.targetRing.classList.add('target');
            }
        }
        updateCursorState();
    });
    
    sceneEl.addEventListener('exit-vr', () => {
        UI.vrHud.setAttribute('visible', 'false');
        UI.vrBtnRestart.setAttribute('visible', 'false');
        UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
        UI.vrBtnRestart.classList.remove('target');
        UI.targetRing.setAttribute('visible', 'false');
        UI.targetRing.setAttribute('scale', '0.001 0.001 0.001');
        UI.targetRing.classList.remove('target');

        if (game.active) {
            UI.hud.classList.remove('hidden');
        } else {
            if (game.wave === 0) {
                UI.panelStart.classList.remove('hidden');
            } else {
                UI.panelGameOver.classList.remove('hidden');
            }
        }
        updateCursorState();
    });

    // Monitor controller connections
    if (leftController) {
        leftController.addEventListener('controllerconnected', () => {
            controllersConnected++;
            updateCursorState();
        });
        leftController.addEventListener('controllerdisconnected', () => {
            controllersConnected = Math.max(0, controllersConnected - 1);
            updateCursorState();
        });
    }
    
    if (rightController) {
        rightController.addEventListener('controllerconnected', () => {
            controllersConnected++;
            updateCursorState();
        });
        rightController.addEventListener('controllerdisconnected', () => {
            controllersConnected = Math.max(0, controllersConnected - 1);
            updateCursorState();
        });
    }

    // Connect event listeners to UI buttons
    UI.btnStart.addEventListener('click', startGame);
    UI.btnRestart.addEventListener('click', startGame);
    
    // VR Gaze/Controller clicks
    UI.targetRing.addEventListener('click', startGame);
    UI.vrBtnRestart.addEventListener('click', startGame);

    UI.targetRing.addEventListener('mouseenter', () => {
        if (UI.targetRing.classList.contains('target')) {
            triggerVRHaptics(0.3, 60);
        }
    });
    UI.vrBtnRestart.addEventListener('mouseenter', () => {
        if (UI.vrBtnRestart.classList.contains('target')) {
            triggerVRHaptics(0.3, 60);
        }
    });
    
    // Gaze/Pointer events for orbital cubes
    const cubes = document.querySelectorAll('.color-cube');
    cubes.forEach(cube => {
        cube.addEventListener('click', () => {
            const idx = parseInt(cube.getAttribute('data-index'), 10);
            handleCubeZap(idx, cube);
        });
        cube.addEventListener('mouseenter', () => {
            if (game.active && cube.dataset.cleared === 'false') {
                triggerVRHaptics(0.2, 50);
            }
        });
    });

    // Populate initial Highscore display
    UI.statHighScore.innerText = game.highscore;
    
    // Audio resume on click anywhere and start zen music
    document.body.addEventListener('pointerdown', () => {
        audio.resume();
        audio.startAmbientMusic();
    });
});

// ==========================================
// 6. CORE GAME ACTIONS
// ==========================================
function startGame() {
    audio.resume();
    audio.playStartFanfare();
    
    // Reset Game State
    game.score = 0;
    game.multiplier = 1;
    game.wave = 0;
    game.timeRemaining = 20.0;
    game.active = true;
    game.planeRotation = { x: 0, y: 0, z: 0 };

    // Reset puzzle group rotation to zero tilt
    if (UI.puzzleGroup) {
        UI.puzzleGroup.setAttribute('rotation', '0 0 0');
    }
    
    // Hide Overlays
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    
    // Hide VR elements
    UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnRestart.setAttribute('visible', 'false');
    UI.vrBtnRestart.classList.remove('target');
    
    UI.targetRing.setAttribute('scale', '0.001 0.001 0.001');
    UI.targetRing.setAttribute('visible', 'false');
    UI.targetRing.classList.remove('target'); // Disable gaze selection
    
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl.is('vr-mode')) {
        UI.vrHud.setAttribute('visible', 'true');
        UI.hud.classList.add('hidden');
    } else {
        UI.hud.classList.remove('hidden');
        UI.vrHud.setAttribute('visible', 'false');
    }
    
    // Generate First Wave
    generateWave();
    
    // Start game tick timer (every 100ms)
    if (game.timerId) clearInterval(game.timerId);
    game.timerId = setInterval(updateTimer, 100);
}

function generateWave() {
    game.wave++;
    
    // Sync the accumulated rotation state with the actual post-animation rotation values
    if (UI.puzzleGroup) {
        const currentRot = UI.puzzleGroup.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        game.planeRotation = {
            x: currentRot.x || 0,
            y: currentRot.y || 0,
            z: currentRot.z || 0
        };
    }
    
    // Select a random target color
    const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    game.currentTargetColor = targetColor;
    
    // Set target visual state
    UI.targetSphere.setAttribute('color', targetColor);
    UI.targetSphere.setAttribute('material', 'emissive', targetColor);
    UI.targetSphere.setAttribute('material', 'emissiveIntensity', 0.65);
    UI.targetGlow.setAttribute('light', `color: ${targetColor}; intensity: 0.85; distance: 4`);
    
    // Generate color assignments for the 8 cubes
    // Guarantee 2 to 4 cubes are of the target color
    const numTargets = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    game.targetCubesRemaining = numTargets;
    
    const assignedColors = [];
    for (let i = 0; i < numTargets; i++) {
        assignedColors.push(targetColor);
    }
    
    const otherColors = COLORS.filter(c => c !== targetColor);
    while (assignedColors.length < 8) {
        const randomOther = otherColors[Math.floor(Math.random() * otherColors.length)];
        assignedColors.push(randomOther);
    }
    
    // Shuffle the color positions
    for (let i = assignedColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assignedColors[i], assignedColors[j]] = [assignedColors[j], assignedColors[i]];
    }
    
    // Reconfigure the orbital cubes
    const cubes = document.querySelectorAll('.color-cube');
    cubes.forEach((cube, idx) => {
        const color = assignedColors[idx];
        cube.setAttribute('color', color);
        cube.setAttribute('material', 'emissive', color);
        cube.setAttribute('material', 'emissiveIntensity', 0.25);
        cube.dataset.color = color;
        cube.dataset.cleared = 'false';
        
        // Restore standard scale and coordinates
        cube.removeAttribute('animation__scale');
        cube.removeAttribute('animation__shake');
        
        const baseline = game.cubeBaselines[idx];
        cube.setAttribute('position', `${baseline.x} ${baseline.y} ${baseline.z}`);
        
        // Animate scaling up to spawn them dynamically
        cube.setAttribute('scale', '0.001 0.001 0.001');
        cube.setAttribute('animation__scale', {
            property: 'scale',
            to: '1 1 1',
            dur: 350,
            delay: idx * 40,
            easing: 'easeOutBack'
        });
        
        cube.classList.add('target'); // Restore hoverability
    });
    
    updateHUDVisuals();
}

function handleCubeZap(idx, cube) {
    if (!game.active || cube.dataset.cleared === 'true') return;
    
    const cubeColor = cube.dataset.color;
    
    if (cubeColor === game.currentTargetColor) {
        // --- CORRECT MATCH ---
        cube.dataset.cleared = 'true';
        cube.classList.remove('target'); // Remove gaze target ability immediately
        
        // Scale down to zero animation
        cube.removeAttribute('animation__scale');
        cube.setAttribute('animation__scale', {
            property: 'scale',
            to: '0 0 0',
            dur: 200,
            easing: 'easeInQuad'
        });
        
        // Play correct chime and trigger haptic pulse
        audio.playZap();
        triggerVRHaptics(0.6, 120);
        
        // Stats increment
        game.score += 100 * game.multiplier;
        game.multiplier = Math.min(game.multiplier + 1, 5); // caps multiplier at x5
        game.timeRemaining = Math.min(game.timeRemaining + 2.0, 30.0); // caps timer at 30 seconds
        
        game.targetCubesRemaining--;
        updateHUDVisuals();
        
        // Check wave completion
        if (game.targetCubesRemaining <= 0) {
            triggerWaveComplete();
        }
    } else {
        // --- INCORRECT MATCH ---
        // Play buzzer and trigger double warning haptic pulse
        audio.playBuzz();
        triggerVRHaptics(0.8, 150);
        setTimeout(() => triggerVRHaptics(0.8, 150), 200);
        
        // Reset multiplier
        game.multiplier = 1;
        updateHUDVisuals();
        
        // Lock out the selection for 1 second and trigger a visual shake
        cube.classList.remove('target');
        
        const base = game.cubeBaselines[idx];
        cube.removeAttribute('animation__shake');
        cube.setAttribute('animation__shake', {
            property: 'position',
            to: `${base.x + 0.04} ${base.y} ${base.z}`,
            dur: 60,
            dir: 'alternate',
            loop: 6,
            easing: 'linear'
        });
        
        // Restore class after 1 second lockout
        setTimeout(() => {
            if (game.active && cube.dataset.cleared === 'false') {
                cube.classList.add('target');
                cube.setAttribute('position', `${base.x} ${base.y} ${base.z}`);
            }
        }, 1000);
    }
}

function triggerWaveComplete() {
    // Briefly disable active flag during wave transition to prevent clicks
    game.active = false;
    
    // Play transition sound
    audio.playWaveComplete();
    
    // Rapid spin transition of the puzzle group
    if (UI.puzzleGroup) {
        UI.puzzleGroup.removeAttribute('animation__spin');
        
        // Read current rotation
        const currentRot = UI.puzzleGroup.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        const targetZ = currentRot.z + 720;
        
        UI.puzzleGroup.setAttribute('animation__spin', {
            property: 'rotation',
            to: `0 0 ${targetZ}`,
            dur: 800,
            easing: 'easeInOutQuad'
        });
    }
    
    // Wait for spin animation before generating next wave
    setTimeout(() => {
        if (game.timerId) { // Verify game wasn't terminated
            game.active = true;
            generateWave();
        }
    }, 850);
}

function updateTimer() {
    if (!game.active) return;
    
    game.timeRemaining -= 0.1;
    
    if (game.timeRemaining <= 0) {
        game.timeRemaining = 0;
        gameOver();
    }
    
    // Update timer visuals
    UI.hudTime.innerText = game.timeRemaining.toFixed(1) + 's';
    UI.vrHudTimer.setAttribute('value', `TIME: ${game.timeRemaining.toFixed(1)}s`);
    
    // Dynamic color warning on timer
    if (game.timeRemaining <= 5.0) {
        UI.hudTime.style.color = 'var(--neon-magenta)';
        UI.vrHudTimer.setAttribute('color', '#ff007f');
    } else {
        UI.hudTime.style.color = '';
        UI.vrHudTimer.setAttribute('color', '#ff007f');
    }
}

function updateHUDVisuals() {
    // Update 2D Screen HUD
    UI.hudScore.innerText = String(game.score).padStart(4, '0');
    UI.hudMultiplier.innerText = `x${game.multiplier}`;
    UI.hudWave.innerText = game.wave;
    UI.hudTime.innerText = game.timeRemaining.toFixed(1) + 's';
    
    // Update 3D VR HUD
    UI.vrHudScore.setAttribute('value', `SCORE: ${String(game.score).padStart(4, '0')}`);
    UI.vrHudMult.setAttribute('value', `MULTIPLIER: x${game.multiplier}`);
    UI.vrHudTimer.setAttribute('value', `TIME: ${game.timeRemaining.toFixed(1)}s`);
}

function gameOver() {
    game.active = false;
    if (game.timerId) {
        clearInterval(game.timerId);
        game.timerId = null;
    }
    
    audio.playGameOver();
    
    // Check High Score
    let newRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('chromatic_gaze_highscore', game.highscore);
        newRecord = true;
    }
    
    // Display Game Over Overlay Panel (2D)
    UI.statFinalScore.innerText = game.score;
    UI.statFinalWave.innerText = game.wave;
    UI.statHighScore.innerText = game.highscore;
    
    if (newRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }
    
    // Clean up A-Frame scene visual indicators
    UI.targetSphere.setAttribute('color', '#444444');
    UI.targetSphere.setAttribute('material', 'emissive', '#222222');
    UI.targetSphere.setAttribute('material', 'emissiveIntensity', 0.0);
    UI.targetGlow.setAttribute('light', 'intensity: 0.0');
    
    // Scale down all cubes
    const cubes = document.querySelectorAll('.color-cube');
    cubes.forEach(cube => {
        cube.classList.remove('target');
        cube.removeAttribute('animation__scale');
        cube.setAttribute('animation__scale', {
            property: 'scale',
            to: '0 0 0',
            dur: 300,
            easing: 'easeInQuad'
        });
    });
    
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl.is('vr-mode')) {
        // Show VR UI elements
        UI.vrBtnRestart.setAttribute('visible', 'true');
        UI.vrBtnRestart.setAttribute('scale', '1 1 1');
        UI.vrBtnRestart.classList.add('target');
        
        UI.targetRing.setAttribute('visible', 'true');
        UI.targetRing.setAttribute('scale', '1 1 1');
        UI.targetRing.classList.add('target'); // Allow look-to-restart trigger
        
        // Hide VR HUD
        UI.vrHud.setAttribute('visible', 'false');

        // Hide 2D overlays
        UI.hud.classList.add('hidden');
        UI.panelGameOver.classList.add('hidden');
    } else {
        // Show 2D elements
        UI.hud.classList.add('hidden');
        UI.panelGameOver.classList.remove('hidden');

        // Hide VR elements
        UI.vrBtnRestart.setAttribute('visible', 'false');
        UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
        UI.vrBtnRestart.classList.remove('target');
        UI.targetRing.setAttribute('visible', 'false');
        UI.targetRing.setAttribute('scale', '0.001 0.001 0.001');
        UI.targetRing.classList.remove('target');
        UI.vrHud.setAttribute('visible', 'false');
    }
}
