/**
 * Gyro Tunnel Dodge - Game Core Logic
 * Implements gyro-based steering, endless tunnel wrapping, obstacle gates,
 * procedural synth audio engine, and a 3D holographic dashboard radar.
 */

// ==========================================
// 1. PROCEDURAL SYNTH SOUND ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.musicInterval = null;
        this.currentStep = 0;
        
        // Minor/space synthwave chord progression (frequencies in Hz)
        // A2, G2, F2, E2
        this.bassNotes = [
            110.00, 110.00, 110.00, 110.00, // A2
            98.00,  98.00,  98.00,  98.00,  // G2
            87.31,  87.31,  87.31,  87.31,  // F2
            82.41,  82.41,  82.41,  82.41   // E2
        ];
        
        // Arpeggiator notes running on top (A minor / C major feel)
        this.leadNotes = [
            440.00, 0, 523.25, 0, 659.25, 0, 880.00, 0, // A minor arpeggio
            392.00, 0, 493.88, 0, 587.33, 0, 783.99, 0, // G major arpeggio
            349.23, 0, 440.00, 0, 523.25, 0, 698.46, 0, // F major arpeggio
            329.63, 0, 415.30, 0, 493.88, 0, 659.25, 0  // E dominant arpeggio
        ];
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

    // Procedural Synth-wave Music Sequencer
    startMusic() {
        this.resume();
        if (!this.ctx || this.musicInterval) return;

        this.currentStep = 0;
        // 135 ms step interval (approx 110 BPM sixteenth notes)
        this.musicInterval = setInterval(() => {
            this.playSequenceStep();
        }, 135);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playSequenceStep() {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const t = this.ctx.currentTime;
        const step = this.currentStep % 16;
        
        // 1. Play Plucky Synth Bassline
        const bassFreq = this.bassNotes[step];
        this.playPluckBass(bassFreq, t);

        // 2. Play Arpeggiated Lead Melody (on alternate steps for texture)
        const leadFreq = this.leadNotes[this.currentStep % 32];
        if (leadFreq > 0 && Math.random() > 0.15) {
            this.playLeadArp(leadFreq, t);
        }

        this.currentStep++;
    }

    playPluckBass(freq, time) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(4, time);
        filter.frequency.setValueAtTime(freq * 4, time);
        // Quick filter envelope sweep for plucky "synth wave" bass sound
        filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.12);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.16);
    }

    playLeadArp(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = this.ctx.createDelay();
        const delayGain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        
        // Subtle stereo delay echo effect
        delay.delayTime.setValueAtTime(0.18, time);
        delayGain.gain.setValueAtTime(0.3, time);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Connect echo path
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.25);
    }

    // Pass obstacle successfully sound effect (wind whoosh sweep)
    playWhoosh() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Synthesize white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(5, t);
        // Sweep frequency up to simulate moving past an energy barrier
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(2200, t + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.3);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noiseNode.start(t);
        noiseNode.stop(t + 0.31);
    }

    // Shield damage collision sound (low rumble explosion)
    playCrash() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noiseOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(30, t + 0.45);

        noiseOsc.type = 'square';
        noiseOsc.frequency.setValueAtTime(65, t);
        noiseOsc.frequency.linearRampToValueAtTime(20, t + 0.45);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        noiseOsc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        noiseOsc.start(t);
        osc.stop(t + 0.51);
        noiseOsc.stop(t + 0.51);
    }

    // Low shield warning beep
    playWarningBeep() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.13);
    }

    // Start Fanfare chords
    playStartFanfare() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [196.00, 246.94, 293.66, 392.00, 493.88]; // G major arpeggio
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = t + idx * 0.08;
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(startTime + 0.46);
        });
    }

    // Game over sad descending progression
    playGameOverFanfare() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [311.13, 261.63, 220.00, 164.81]; // Eb4 -> C4 -> A3 -> E3
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = t + idx * 0.18;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(startTime + 0.61);
        });
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE MANAGEMENT
// ==========================================
const game = {
    active: false,
    score: 0,
    highscore: parseInt(localStorage.getItem('tunnel_dodge_highscore') || '0', 10),
    shields: 3,
    
    // Speed tracking
    baseSpeed: 16,        // Initial forward velocity (m/s)
    speed: 16,            // Current forward velocity
    maxSpeed: 45,         // Hard limit
    distanceTraveled: 0,
    
    // Player glider lanes (0-5 index)
    activeLane: 0,        // Nearest snapping lane index
    gliderAngle: 0,       // Current smooth visual angle (degrees)
    targetAngle: 0,       // Destination angle (degrees)
    
    // Calibration parameters
    calibrated: false,
    calibrationYaw: 0,
    calibrationRoll: 0,
    
    // Tunnel parameters
    tunnelRadius: 2.2,     // Radius of the hexagonal rings
    ringSpacing: 4.5,     // Spacing between rings along Z-axis
    numRings: 14,         // Total rings pool
    rings: [],            // List of active ring entities
    
    // Obstacle parameters
    obstacles: [],        // Active obstacle gates
    nextSpawnDistance: 30,// How far in meters before the next gate spawns
    obstacleRadius: 1.45,  // Offset of obstacle boxes from tunnel center
    
    // Desktop check fallback
    lastSteerTime: 0,
    isDesktop: false
};

// ==========================================
// 3. HTML UI ELEMENT REFERENCES
// ==========================================
const UI = {
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudHighScore: document.getElementById('hud-highscore-val'),
    hudShieldCells: document.querySelectorAll('.shield-cell'),
    
    statFinalScore: document.getElementById('stat-final-score'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    desktopControlsHint: document.getElementById('desktop-controls-hint'),
    
    // VR Elements
    camera: document.getElementById('camera'),
    vrBtnStart: document.getElementById('vr-btn-start'),
    vrBtnRestart: document.getElementById('vr-btn-restart'),
    vrScoreVal: document.getElementById('vr-score-val'),
    vrShieldsVal: document.getElementById('vr-shields-val'),
    
    // Game Entities
    tunnelContainer: document.getElementById('tunnel-container'),
    obstacleContainer: document.getElementById('obstacle-container'),
    gliderVisual: document.getElementById('glider-visual'),
    radarGliderDot: document.getElementById('radar-glider-dot'),
    hologramRadar: document.getElementById('hologram-radar'),
    cockpitLight: document.getElementById('cockpit-light'),
    starfield: document.getElementById('starfield')
};

// ==========================================
// 4. SETUP AND INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Generate Space Starfield (Static far-away points)
    generateStarfield();

    // 2. Build scrollable wireframe tunnel rings
    generateTunnel();

    // 3. Attach UI click events (desktop / 2D screen)
    UI.btnStart.addEventListener('click', () => {
        calibrateGyro();
        startGame();
    });
    UI.btnRestart.addEventListener('click', startGame);

    // 4. Attach VR in-world click events (gaze-based fuse triggers)
    UI.vrBtnStart.addEventListener('click', () => {
        calibrateGyro();
        startGame();
    });
    UI.vrBtnRestart.addEventListener('click', startGame);

    // 5. Setup Keyboard steering listeners (A/D or Arrows)
    document.addEventListener('keydown', onKeyDown);

    // Mouse movement steering listener (Desktop)
    window.addEventListener('pointermove', onPointerMove);

    // 6. Handle click/tap to resume audio contexts safely
    document.body.addEventListener('pointerdown', () => audio.resume());

    // 7. Sync Highscore representation at load
    UI.hudHighScore.innerText = formatScore(game.highscore);
    
    // 8. Device diagnostics to reveal desktop guide
    detectDesktop();

    // 9. Sync VR mode state changes
    const sceneEl = document.querySelector('a-scene');
    sceneEl.addEventListener('enter-vr', () => {
        // If game is not active yet, make sure VR start button is visible
        if (!game.active) {
            UI.vrBtnStart.setAttribute('visible', 'true');
            UI.vrBtnStart.setAttribute('scale', '1 1 1');
        }
        // Hide 2D overlay panels as they are invisible in VR but might interfere with clicks or state
        UI.panelStart.classList.add('hidden');
        UI.panelGameOver.classList.add('hidden');
    });

    sceneEl.addEventListener('exit-vr', () => {
        // Hide VR menu buttons
        UI.vrBtnStart.setAttribute('visible', 'false');
        UI.vrBtnStart.setAttribute('scale', '0.001 0.001 0.001');
        UI.vrBtnRestart.setAttribute('visible', 'false');
        UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');

        // Restore 2D panels
        if (!game.active) {
            if (game.score === 0 && game.shields === 3) {
                UI.panelStart.classList.remove('hidden');
            } else {
                UI.panelGameOver.classList.remove('hidden');
            }
        }
    });
});

function detectDesktop() {
    // Show keyboard tip if mouse movement or keys are likely inputs
    const checkDesktop = (e) => {
        game.isDesktop = true;
        UI.desktopControlsHint.classList.remove('hidden');
        document.removeEventListener('mousemove', checkDesktop);
        document.removeEventListener('keydown', checkDesktop);
    };
    document.addEventListener('mousemove', checkDesktop);
    document.addEventListener('keydown', checkDesktop);
}

function formatScore(num) {
    return String(Math.floor(num)).padStart(4, '0');
}

// Populate starfield with a few glowing points in the background
function generateStarfield() {
    for (let i = 0; i < 60; i++) {
        const star = document.createElement('a-sphere');
        const x = (Math.random() - 0.5) * 80;
        const y = (Math.random() - 0.5) * 80 + 1.6;
        const z = -Math.random() * 80 - 10;
        
        star.setAttribute('position', `${x} ${y} ${z}`);
        star.setAttribute('radius', '0.04');
        star.setAttribute('color', Math.random() > 0.5 ? '#00f0ff' : '#ff0055');
        star.setAttribute('material', 'shader: flat; opacity: 0.4');
        UI.starfield.appendChild(star);
    }
}

// Generate the hexagonal wireframe rings
function generateTunnel() {
    // Remove any existing rings
    UI.tunnelContainer.innerHTML = '';
    game.rings = [];

    const colors = ['#00f0ff', '#0077ff', '#0044ff'];

    for (let i = 0; i < game.numRings; i++) {
        const ring = document.createElement('a-cylinder');
        // A thin open cylinder with 6 radial segments is a wireframe hexagonal ring
        ring.setAttribute('segments-radial', '6');
        ring.setAttribute('open-ended', 'true');
        ring.setAttribute('radius', game.tunnelRadius);
        ring.setAttribute('height', '0.05');
        ring.setAttribute('rotation', '90 0 0');
        
        const zPos = -i * game.ringSpacing;
        ring.setAttribute('position', `0 1.6 ${zPos}`);
        
        // Distribute alternating colors
        const color = colors[i % colors.length];
        ring.setAttribute('color', color);
        
        // flat shader makes the wireframe look glowing and bright without heavy shadows
        ring.setAttribute('material', `shader: flat; wireframe: true; opacity: 0.15; transparent: true`);

        UI.tunnelContainer.appendChild(ring);

        // Store metadata for the endless scrolling animation
        game.rings.push({
            el: ring,
            z: zPos,
            roll: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12 + (i % 2 === 0 ? 5 : -5) // degrees per sec
        });
    }
}

// Reset camera gyro center
function calibrateGyro() {
    if (!UI.camera.object3D) return;
    
    // Capture current angles to use as baseline
    game.calibrationYaw = UI.camera.object3D.rotation.y;
    game.calibrationRoll = UI.camera.object3D.rotation.z;
    game.calibrated = true;
    
    console.log(`Gyro calibrated. Yaw offset: ${game.calibrationYaw.toFixed(2)}, Roll offset: ${game.calibrationRoll.toFixed(2)}`);
}

// ==========================================
// 5. GAME SYSTEM CONTROLLERS
// ==========================================
function startGame() {
    audio.resume();
    audio.playStartFanfare();
    audio.startMusic();

    // Reset game logic
    game.active = true;
    game.score = 0;
    game.shields = 3;
    game.speed = game.baseSpeed;
    game.distanceTraveled = 0;
    game.nextSpawnDistance = 25; // First obstacle spawns after 25 meters
    game.activeLane = 0;
    game.gliderAngle = 0;
    game.targetAngle = 0;

    // Clear active obstacles
    clearObstacles();

    // Reset HUD graphics
    updateHUDVisuals();

    // Hide menus & show gameplay dashboard
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');

    // Hide VR 3D menu boxes
    UI.vrBtnStart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnStart.setAttribute('visible', 'false');
    UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnRestart.setAttribute('visible', 'false');

    // Reset cockpit light color to healthy cyan
    UI.cockpitLight.setAttribute('light', 'color: #00f0ff; intensity: 0.3');
}

function gameOver() {
    game.active = false;
    audio.stopMusic();
    audio.playGameOverFanfare();

    // Save and compare high score
    let newRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('tunnel_dodge_highscore', game.highscore);
        newRecord = true;
    }

    // Populate Game Over Screen details
    UI.statFinalScore.innerText = Math.floor(game.score);
    UI.statHighScore.innerText = Math.floor(game.highscore);
    
    if (newRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }

    // Transition overlay panels
    UI.panelGameOver.classList.remove('hidden');
    UI.hud.classList.add('hidden');

    // Display VR 3D Restart Box
    UI.vrBtnRestart.setAttribute('visible', 'true');
    UI.vrBtnRestart.setAttribute('scale', '1 1 1');

    // Alert color glow for cockpit cockpitLight
    UI.cockpitLight.setAttribute('light', 'color: #ff0055; intensity: 0.6');
}

function clearObstacles() {
    // Remove elements from the A-Frame container
    UI.obstacleContainer.innerHTML = '';
    game.obstacles = [];
}

// ==========================================
// 6. INPUT AND STEERING INTERACTION
// ==========================================
function onKeyDown(e) {
    if (!game.active) return;
    
    let laneChange = 0;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        laneChange = 1; // Left (Counter-Clockwise)
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        laneChange = -1; // Right (Clockwise)
    }

    if (laneChange !== 0) {
        // Switch lane target index (0 to 5)
        const nextLane = (game.activeLane + laneChange + 6) % 6;
        setLaneTarget(nextLane);
        game.lastSteerTime = performance.now();
    }
}

function onPointerMove(e) {
    if (!game.active) return;
    if (e.pointerType !== 'mouse') return;

    // Ignore mouse movement if we are in VR mode
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl && sceneEl.is('vr-mode')) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = e.clientX - cx;
    const dy = cy - e.clientY; // Invert Y

    const dist = Math.sqrt(dx * dx + dy * dy);
    // Dead zone of 40px around screen center
    if (dist > 40) {
        let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (mouseAngle < 0) mouseAngle += 360;
        
        const nearestLane = Math.round(mouseAngle / 60) % 6;
        setLaneTarget(nearestLane);
        game.lastSteerTime = performance.now();
    }
}

function setLaneTarget(laneIndex) {
    game.activeLane = laneIndex;
    
    // Map lane 0-5 to angles: 0, 60, 120, 180, 240, 300 degrees
    game.targetAngle = laneIndex * 60;
    
    // Handle wrap-around interpolation logic (e.g. going from 0 to 300 degrees should turn right, not spin full circle left)
    // We adjust current gliderAngle to be within close proximity to target
    let diff = game.targetAngle - game.gliderAngle;
    while (diff < -180) { game.gliderAngle -= 360; diff = game.targetAngle - game.gliderAngle; }
    while (diff > 180) { game.gliderAngle += 360; diff = game.targetAngle - game.gliderAngle; }
}

// Reads camera rotation and maps it to lane indices
function updateSteeringFromGyro() {
    if (!UI.camera.object3D || !game.calibrated) return;

    // Get current raw angles
    const rawYaw = UI.camera.object3D.rotation.y;
    const rawRoll = UI.camera.object3D.rotation.z;

    // Apply baseline offset calibration
    const relativeYaw = rawYaw - game.calibrationYaw;
    const relativeRoll = rawRoll - game.calibrationRoll;

    // Convert to degrees
    const yawDeg = relativeYaw * (180 / Math.PI);
    const rollDeg = relativeRoll * (180 / Math.PI);

    // If keyboard is actively being used, prioritize keyboard controls briefly
    if (performance.now() - game.lastSteerTime < 800) return;

    // Yaw turns head left/right. Roll tilts head left/right.
    // Sum them with custom sensitivities to determine steering deflection.
    // Yaw sensitivity: 3.5x multiplier. Roll sensitivity: 4.5x multiplier.
    const yawSensitivity = 3.5;
    const rollSensitivity = 4.5;
    const steerDeflection = (yawDeg * yawSensitivity) + (rollDeg * rollSensitivity);

    // Limit deflection threshold before registering steering change (dead zone of 15 degrees)
    const deadZone = 12;
    if (Math.abs(steerDeflection) > deadZone) {
        // Map the steerDeflection to the 6 lanes (60 degrees sectors)
        // If deflection is positive (steered left / counter-clockwise), we shift lane indices positive.
        // Clamp steer to full circle (-180 to 180).
        let scaledSteer = Math.max(-180, Math.min(180, steerDeflection));
        
        // Map steer deflection range (-150 to 150) to angle sector offsets
        // Centered around 0 degrees (Lane 0). Steering left increases angle.
        let targetTheta = scaledSteer;
        if (targetTheta < 0) targetTheta += 360; // Map to [0, 360]
        
        // Snap to nearest lane index
        const nearestLane = Math.round(targetTheta / 60) % 6;
        setLaneTarget(nearestLane);
    }
}

// ==========================================
// 7. COLLISION CHECKS AND SCORING
// ==========================================
function triggerDamage() {
    game.shields -= 1;
    audio.playCrash();
    
    // Visual flash of red cockpit light
    UI.cockpitLight.setAttribute('light', 'color: #ff0055; intensity: 1.8');
    setTimeout(() => {
        if (game.active) {
            // Restore regular ambient cockpit light
            UI.cockpitLight.setAttribute('light', 'color: #00f0ff; intensity: 0.3');
        }
    }, 300);

    // Play warning sound if shields critically low
    if (game.shields === 1) {
        setTimeout(() => {
            if (game.active) audio.playWarningBeep();
        }, 400);
    }

    updateHUDVisuals();

    if (game.shields <= 0) {
        gameOver();
    }
}

function triggerPass() {
    game.score += 10;
    audio.playWhoosh();
    updateHUDVisuals();
}

function updateHUDVisuals() {
    const scoreVal = formatScore(game.score);
    const highscoreVal = formatScore(game.highscore);

    // Update 2D overlays
    UI.hudScore.innerText = scoreVal;
    UI.hudHighScore.innerText = highscoreVal;

    // Pop animation on score text
    UI.hudScore.classList.remove('score-pop');
    void UI.hudScore.offsetWidth; // force redraw reflow
    UI.hudScore.classList.add('score-pop');

    // Sync Shield indicators (hearts)
    UI.hudShieldCells.forEach((cell, idx) => {
        if (idx < game.shields) {
            cell.classList.remove('lost');
        } else {
            cell.classList.add('lost');
        }
    });

    // Update VR 3D Text fields
    UI.vrScoreVal.setAttribute('value', scoreVal);
    
    let shieldsStr = '';
    for (let i = 0; i < game.shields; i++) shieldsStr += 'I';
    if (shieldsStr === '') shieldsStr = 'CRITICAL';
    
    UI.vrShieldsVal.setAttribute('value', shieldsStr);
    UI.vrShieldsVal.setAttribute('color', game.shields <= 1 ? '#ff0055' : '#00f0ff');
}

// ==========================================
// 8. DYNAMIC OBSTACLE GENERATOR
// ==========================================
function spawnObstacleGate() {
    // Generate a random gate configuration
    // Select 1 to 4 lanes to block (ensuring player has at least 2 open lanes to escape)
    const numBlockedLanes = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 blocked lanes
    const pool = [0, 1, 2, 3, 4, 5];
    const blockedLanes = [];

    // Shuffle pool to pick random lane indices
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let i = 0; i < numBlockedLanes; i++) {
        blockedLanes.push(pool[i]);
    }

    // Gate Z spawning depth
    const spawnZ = -55;

    const gate = {
        z: spawnZ,
        blockedLanes: blockedLanes,
        passed: false,
        elements: []
    };

    // Render red energy barrier entities in blocked lanes
    blockedLanes.forEach(laneIdx => {
        const angleRad = laneIdx * 60 * (Math.PI / 180);
        
        // Position offset from center
        const x = game.obstacleRadius * Math.cos(angleRad);
        const y = 1.6 + game.obstacleRadius * Math.sin(angleRad);

        const barrier = document.createElement('a-box');
        barrier.setAttribute('position', `${x} ${y} ${spawnZ}`);
        
        // Shape box to fit the hexagonal lane wall
        barrier.setAttribute('width', '1.3');
        barrier.setAttribute('height', '0.15');
        barrier.setAttribute('depth', '1.2');
        
        // Rotate box to align parallel to the tunnel face
        const rotateZ = (laneIdx * 60) - 90;
        barrier.setAttribute('rotation', `0 0 ${rotateZ}`);

        // Red glowing aesthetic
        barrier.setAttribute('color', '#ff0055');
        barrier.setAttribute('material', 'shader: flat; emissive: #ff0055; emissiveIntensity: 1.0; opacity: 0.7; transparent: true');

        UI.obstacleContainer.appendChild(barrier);
        gate.elements.push(barrier);
    });

    // Add holographic 3D radar elements
    // The radar has a matching visual representations (3D dots on the holographic cockpit radar)
    gate.radarElements = [];
    blockedLanes.forEach(laneIdx => {
        const radAngle = laneIdx * 60 * (Math.PI / 180);
        
        // Holographic miniature coordinates (R = 0.03)
        const rx = 0.03 * Math.cos(radAngle);
        const ry = 0.03 * Math.sin(radAngle);

        const rDot = document.createElement('a-sphere');
        rDot.setAttribute('radius', '0.003');
        rDot.setAttribute('color', '#ff0055');
        rDot.setAttribute('material', 'shader: flat; opacity: 0.8');
        
        // Position at far end of holographic cylinder (Z = -0.2m)
        rDot.setAttribute('position', `${rx} ${ry} -0.2`);

        UI.hologramRadar.appendChild(rDot);
        gate.radarElements.push(rDot);
    });

    game.obstacles.push(gate);
}

// ==========================================
// 9. CORE GAME FRAME TICK LOOP
// ==========================================
let lastTime = performance.now();

function gameTick(time) {
    // Calculate delta capped to prevent giant leaps during backgrounding
    const dt = Math.min(50, time - lastTime);
    lastTime = time;

    // Process system movements regardless of active state (decorations scroll slowly)
    animateTunnelRings(dt);

    if (game.active) {
        // 1. Calculate distance traveled and update speed
        const deltaDist = game.speed * (dt / 1000);
        game.distanceTraveled += deltaDist;
        game.score += deltaDist * 0.5; // continuous distance scoring

        // Dynamic speed ramping difficulty curve (increases slowly up to maxSpeed)
        game.speed = Math.min(game.maxSpeed, game.baseSpeed + (game.score * 0.05));

        // 2. Gyro input check
        updateSteeringFromGyro();

        // 3. Smoothly interpolate glider visual to target lane angle
        smoothGliderMovement(dt);

        // 4. Update 3D Holographic cockpit mini-glider indicator
        updateRadarIndicator();

        // 5. Spawn new obstacle gates
        game.nextSpawnDistance -= deltaDist;
        if (game.nextSpawnDistance <= 0) {
            spawnObstacleGate();
            // Reset spawn timer (closer gates at higher speed to sustain pacing)
            const minSpacing = 16;
            const maxSpacing = 28;
            game.nextSpawnDistance = Math.max(minSpacing, maxSpacing - (game.speed * 0.2) + Math.random() * 4);
        }

        // 6. Animate and resolve collisions on active obstacle gates
        updateObstacles(dt);
    } else {
        // If not playing, keep menu buttons centered in view for convenience
        // Slowly drift cockpit wings for visual polish
        const drift = Math.sin(time * 0.002) * 0.05;
        UI.gliderVisual.setAttribute('position', `0 ${1.55 + drift} -2.5`);
        UI.gliderVisual.setAttribute('rotation', `0 0 ${Math.sin(time * 0.001) * 3}`);

        // Rotate holographic radar idle
        UI.hologramRadar.setAttribute('rotation', `-15 ${time * 0.015} 0`);
    }

    requestAnimationFrame(gameTick);
}

// Start frame tick loop
requestAnimationFrame(gameTick);

// Scrolls and rotates the wireframe hexagon rings for forward speed velocity illusion
function animateTunnelRings(dt) {
    const scrollDelta = (game.active ? game.speed : 4.0) * (dt / 1000);

    game.rings.forEach(ring => {
        ring.z += scrollDelta;
        
        // Wrap ring back to distance when it goes behind viewer
        if (ring.z > 2.5) {
            // Reposition back behind the furthers ring
            ring.z -= game.numRings * game.ringSpacing;
            // Scramble rotation slightly to keep tunnel looking organic
            ring.roll = Math.random() * 360;
        }

        // Slow spin vortex rotation
        ring.roll += ring.rotationSpeed * (dt / 1000);

        ring.el.setAttribute('position', `0 1.6 ${ring.z}`);
        ring.el.setAttribute('rotation', `0 0 ${ring.roll}`);
    });
}

// Smoothly glides ship wings towards active input lane
function smoothGliderMovement(dt) {
    // Lerp interpolation (smoothing factor 12x)
    const lerpFactor = 12 * (dt / 1000);
    game.gliderAngle += (game.targetAngle - game.gliderAngle) * lerpFactor;

    // Convert to world coordinate space (centered around y=1.6m, Z = -2.5m)
    const angleRad = game.gliderAngle * (Math.PI / 180);
    
    // Radius radius offset Rg = 1.05m
    const radius = 1.05;
    const gx = radius * Math.cos(angleRad);
    const gy = 1.6 + radius * Math.sin(angleRad);

    UI.gliderVisual.setAttribute('position', `${gx} ${gy} -2.5`);
    
    // Rotate ship to lie flat against hex wall (tangent rotation: angle - 90)
    const wingRoll = game.gliderAngle - 90;
    UI.gliderVisual.setAttribute('rotation', `0 0 ${wingRoll}`);
}

// Sync mini-glider indicator dot on cockpit mini-radar
function updateRadarIndicator() {
    const radAngle = game.gliderAngle * (Math.PI / 180);
    // Radial radius on hologram surface is 0.03m
    const rx = 0.03 * Math.cos(radAngle);
    const ry = 0.03 * Math.sin(radAngle);
    UI.radarGliderDot.setAttribute('position', `${rx} ${ry} 0`);
}

// Animates obstacle barriers towards camera and checks active intersections
function updateObstacles(dt) {
    const gliderZ = -2.5; // depth of the player wings
    const collisionDepthTolerance = 0.35; // depth collision window

    // Parse backward to permit item removal
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const gate = game.obstacles[i];
        
        // Move gate forward
        gate.z += game.speed * (dt / 1000);

        // A. Update in-world physical barrier entity positions
        gate.elements.forEach(element => {
            const pos = element.getAttribute('position');
            element.setAttribute('position', `${pos.x} ${pos.y} ${gate.z}`);
        });

        // B. Update 3D holographic cockpit radar representations
        // Map 3D relative distance to radar depth (Z goes from -0.2m to 0.0m)
        const relativeDist = gate.z - gliderZ;
        
        if (relativeDist < 0) {
            // Obstacle is in front of the glider
            const holoZ = Math.max(-0.2, (relativeDist / -60) * -0.2);
            gate.radarElements.forEach(rDot => {
                const rPos = rDot.getAttribute('position');
                rDot.setAttribute('position', `${rPos.x} ${rPos.y} ${holoZ}`);
            });
        }

        // C. Collision check when gate reaches glider Z-depth
        if (!gate.passed && Math.abs(gate.z - gliderZ) < collisionDepthTolerance) {
            // Resolve if player is in one of the blocked lanes
            if (gate.blockedLanes.includes(game.activeLane)) {
                // Collided!
                triggerDamage();
                // Flag to prevent double collision trigger
                gate.passed = true;
            }
        }

        // D. Clear and score when gate passes behind player view
        if (gate.z > 1.0) {
            if (!gate.passed) {
                // Dodged successfully!
                triggerPass();
            }

            // Remove 3D barrier entities
            gate.elements.forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });

            // Remove holographic indicators
            gate.radarElements.forEach(rDot => {
                if (rDot.parentNode) rDot.parentNode.removeChild(rDot);
            });

            // Splice gate from list
            game.obstacles.splice(i, 1);
        }
    }
}
