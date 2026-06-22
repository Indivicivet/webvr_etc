/**
 * Cyber Disc (0007) - Game Application Logic
 * Immersive WebVR racquetball-style disc throwing game using A-Frame and Web Audio synthesis.
 */

// ============================================================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ============================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.chargeOsc = null;
        this.chargeGain = null;
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

    // Menu sound for starting the game
    playMenuStart() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + idx * 0.08 + 0.32);
        });
    }

    // Generic button click
    playMenuClick() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
    }

    // Disc grab chime
    playGrab() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    // Desktop charge-up synthesizer node setup
    startCharge() {
        this.resume();
        if (!this.ctx || this.chargeOsc) return;
        const t = this.ctx.currentTime;
        
        this.chargeGain = this.ctx.createGain();
        this.chargeGain.gain.setValueAtTime(0.02, t);
        this.chargeGain.connect(this.ctx.destination);

        this.chargeOsc = this.ctx.createOscillator();
        this.chargeOsc.type = 'triangle';
        this.chargeOsc.frequency.setValueAtTime(200, t);
        this.chargeOsc.connect(this.chargeGain);
        this.chargeOsc.start(t);
    }

    updateCharge(percent) {
        if (!this.ctx || !this.chargeOsc || !this.chargeGain) return;
        const t = this.ctx.currentTime;
        // Slide frequency and volume up
        this.chargeOsc.frequency.setTargetAtTime(200 + percent * 500, t, 0.05);
        this.chargeGain.gain.setTargetAtTime(0.02 + percent * 0.08, t, 0.05);
    }

    stopCharge() {
        if (this.chargeOsc) {
            try {
                this.chargeOsc.stop();
            } catch (e) {}
            this.chargeOsc = null;
            this.chargeGain = null;
        }
    }

    // Whoosh throw effect
    playThrow() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);

        // Noise element
        try {
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.12, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);
            noise.stop(t + 0.16);
        } catch (e) {}
    }

    // Ringing ping when bouncing off walls/floor
    playBounce() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    // Normal target smash
    playHit() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // High glass chime
        const freqs = [880, 1100, 1320];
        freqs.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.21);
        });

        // Noise sweep
        try {
            const bufferSize = this.ctx.sampleRate * 0.1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(2000, t);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.18, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);
            noise.stop(t + 0.1);
        } catch (e) {}
    }

    // Explosive sub boom for green core
    playBlast() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.41);

        // Low-pass rumble
        try {
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, t);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.2, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);
            noise.stop(t + 0.4);
        } catch (e) {}
    }

    // Hazard warning buzzer
    playWarning() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Play double harsh buzz
        [0, 0.15].forEach(delay => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t + delay);
            gain.gain.setValueAtTime(0.12, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.13);
        });
    }

    // Alarm beep for timer low warning
    playTimerAlarm() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); // B5 note
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
    }
}

const audio = new SoundEngine();

// ============================================================================
// 2. GAME STATE CONFIGURATION
// ============================================================================
const game = {
    score: 0,
    combo: 1,
    maxCombo: 1,
    highscore: parseInt(localStorage.getItem('cyber_disc_highscore') || '0', 10),
    active: false,
    timer: 60,
    timerInterval: null,
    comboTimer: null,
    comboTimeLeft: 0, // ms before combo resets
    
    // Dispenser freeze state (after hitting hazards)
    dispenserFrozen: false,
    dispenserFreezeTimer: null,
    
    // Wave tracking
    waveIndex: 0,
    
    // Desktop Interaction State
    desktopLoaded: false,
    isCharging: false,
    chargeStart: 0,
    chargeRatio: 0,
    
    // VR Hand state
    hands: {
        left: { holding: false, controller: null, velocityHistory: [], lastPos: new THREE.Vector3() },
        right: { holding: false, controller: null, velocityHistory: [], lastPos: new THREE.Vector3() }
    }
};

// Constant thresholds
const DISP_POS = new THREE.Vector3(0.45, 0.95, -0.35); // dispenser position
const GRAB_DIST = 0.35; // Proximity required to grab disc in VR (meters)

// UI elements cache
const UI = {
    uiLayer: document.getElementById('ui-layer'),
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudCombo: document.getElementById('hud-combo-val'),
    hudTimer: document.getElementById('hud-timer-val'),
    
    hudPowerPanel: document.getElementById('hud-power-panel'),
    powerPercent: document.getElementById('power-percent'),
    powerFill: document.getElementById('power-fill'),
    btnHudExit: document.getElementById('btn-hud-exit'),
    
    statFinalScore: document.getElementById('stat-final-score'),
    statMaxCombo: document.getElementById('stat-max-combo'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    // A-Frame specific
    scene: document.querySelector('a-scene'),
    discContainer: document.getElementById('disc-container'),
    targetContainer: document.getElementById('target-container'),
    dispenserText: document.getElementById('dispenser-hud-text'),
    desktopLoadedDisc: document.getElementById('desktop-loaded-disc'),
    desktopChargeGlow: document.getElementById('desktop-charge-glow'),
    
    vrStartPanel: document.getElementById('vr-ui-container'),
    vrBtnStart: document.getElementById('vr-btn-start'),
    vrBtnRestart: document.getElementById('vr-btn-restart'),
    vrUIText: document.getElementById('vr-ui-text'),
    
    vrHud: document.getElementById('vr-hud'),
    vrHudScore: document.getElementById('vr-hud-score'),
    vrHudTimer: document.getElementById('vr-hud-timer'),
    vrHudCombo: document.getElementById('vr-hud-combo')
};

// ============================================================================
// 3. GAME RUNTIME MANAGEMENT
// ============================================================================

function initGame() {
    // Synchronize UI Highscore initial state
    UI.statHighScore.innerText = game.highscore;
    
    // Wire up events
    UI.btnStart.addEventListener('click', () => { audio.playMenuClick(); enterCourt(); });
    UI.btnRestart.addEventListener('click', () => { audio.playMenuClick(); startGame(); });
    UI.btnHudExit.addEventListener('click', () => { audio.playMenuClick(); exitToMenu(); });
    
    // VR floating screen buttons
    UI.vrBtnStart.addEventListener('click', () => { audio.playMenuClick(); startGame(); });
    UI.vrBtnRestart.addEventListener('click', () => { audio.playMenuClick(); startGame(); });
    
    // Mouse down anywhere on scene (except overlays) triggers desktop charging if loaded
    document.body.addEventListener('mousedown', (e) => {
        if (!game.active || !game.desktopLoaded || game.dispenserFrozen) return;
        // Avoid clicks interacting with HTML buttons
        if (e.target.closest('#ui-layer') || e.target.closest('.hud-panel') || e.target.closest('.hud-power-panel') || e.target.closest('.mode-toggle-btn')) return;
        
        startDesktopCharge();
    });
    
    document.body.addEventListener('mouseup', () => {
        if (game.isCharging) {
            releaseDesktopDisc();
        }
    });

    // Handle dispenser clicks on Desktop
    document.getElementById('dispenser-anchor').addEventListener('click', () => {
        if (!game.active || game.dispenserFrozen || game.desktopLoaded) return;
        
        // Ensure no controllers are connected so this is desktop mode
        if (game.hands.left.controller || game.hands.right.controller) return;

        loadDesktopDisc();
    });

    // VR Controller setup listeners
    setupVRControllers();
}

function enterCourt() {
    UI.panelStart.classList.add('hidden');
    UI.hud.classList.remove('hidden');
}

function exitToMenu() {
    stopGame();
    UI.hud.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.panelStart.classList.remove('hidden');
    UI.vrStartPanel.setAttribute('visible', 'true');
    UI.vrBtnStart.setAttribute('visible', 'true');
    UI.vrBtnRestart.setAttribute('visible', 'false');
    UI.vrUIText.setAttribute('text', 'value', 'Point laser and click START to begin.');
}

function startGame() {
    audio.playMenuStart();
    
    // Reset state
    game.score = 0;
    game.combo = 1;
    game.maxCombo = 1;
    game.timer = 60;
    game.active = true;
    game.waveIndex = 0;
    game.desktopLoaded = false;
    game.isCharging = false;
    game.chargeRatio = 0;
    
    game.hands.left.holding = false;
    game.hands.right.holding = false;
    
    // UI hide/shows
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    
    // VR Floating panels
    UI.vrStartPanel.setAttribute('visible', 'false');
    UI.vrHud.setAttribute('visible', 'true');
    
    // Dispenser unfreeze
    unfreezeDispenser();
    
    // Update labels
    updateHUDText();
    
    // Clean existing objects
    UI.discContainer.innerHTML = '';
    UI.targetContainer.innerHTML = '';
    
    // Spawn Wave 1
    spawnWave();
    
    // Start Interval Timers
    if (game.timerInterval) clearInterval(game.timerInterval);
    game.timerInterval = setInterval(() => {
        if (!game.active) return;
        game.timer--;
        
        if (game.timer <= 0) {
            endGame();
        } else {
            // Low time warning beep
            if (game.timer <= 10) {
                audio.playTimerAlarm();
                UI.hudTimer.classList.add('timer-pulse');
            } else {
                UI.hudTimer.classList.remove('timer-pulse');
            }
            updateHUDText();
        }
    }, 1000);
}

function stopGame() {
    game.active = false;
    if (game.timerInterval) clearInterval(game.timerInterval);
    if (game.comboTimer) clearInterval(game.comboTimer);
    if (game.dispenserFreezeTimer) clearTimeout(game.dispenserFreezeTimer);
    
    audio.stopCharge();
    
    // Hide desktop disc and load HUD indicators
    UI.desktopLoadedDisc.setAttribute('visible', 'false');
    UI.powerFill.style.width = '0%';
    UI.powerPercent.innerText = '0%';
}

function endGame() {
    stopGame();
    audio.playMenuStart(); // Play retro game over/success sequence
    
    // Update Highscore
    let isNewRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('cyber_disc_highscore', game.highscore);
        isNewRecord = true;
    }
    
    // 2D summary overlay
    UI.statFinalScore.innerText = game.score;
    UI.statMaxCombo.innerText = 'x' + game.maxCombo;
    UI.statHighScore.innerText = game.highscore;
    
    if (isNewRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }
    
    UI.panelGameOver.classList.remove('hidden');
    
    // VR floating dashboard update
    UI.vrStartPanel.setAttribute('visible', 'true');
    UI.vrBtnStart.setAttribute('visible', 'false');
    UI.vrBtnRestart.setAttribute('visible', 'true');
    UI.vrUIText.setAttribute('text', 'value', `Match Over!\nFinal Score: ${game.score}\nMax Combo: x${game.maxCombo}`);
    UI.vrHud.setAttribute('visible', 'false');
}

function updateHUDText() {
    // 2D HUD
    UI.hudScore.innerText = String(game.score).padStart(3, '0');
    UI.hudCombo.innerText = 'x' + game.combo;
    
    const minutes = Math.floor(game.timer / 60);
    const seconds = String(game.timer % 60).padStart(2, '0');
    UI.hudTimer.innerText = `${minutes}:${seconds}`;
    
    // VR HUD update text attributes
    if (UI.vrHud.getAttribute('visible') === 'true') {
        UI.vrHudScore.setAttribute('text', 'value', `SCORE: ${String(game.score).padStart(3, '0')}`);
        UI.vrHudTimer.setAttribute('text', 'value', `TIME: ${minutes}:${seconds}`);
        UI.vrHudCombo.setAttribute('text', 'value', `COMBO: x${game.combo}`);
    }
}

// ============================================================================
// 4. WAVE AND TARGET MANAGEMENT
// ============================================================================

function spawnWave() {
    game.waveIndex++;
    
    // Calculate layout based on wave index
    const targets = [];
    const wave = game.waveIndex;
    
    if (wave === 1) {
        // Simple static panels
        targets.push({ x: -1.5, y: 2.5, type: 'static' });
        targets.push({ x: 1.5, y: 2.5, type: 'static' });
        targets.push({ x: 0, y: 3.5, type: 'static' });
        targets.push({ x: -0.8, y: 1.5, type: 'static' });
        targets.push({ x: 0.8, y: 1.5, type: 'static' });
    } else if (wave === 2) {
        // Add 1 drone
        targets.push({ x: -2, y: 3.5, type: 'static' });
        targets.push({ x: 2, y: 3.5, type: 'static' });
        targets.push({ x: -1.2, y: 2.0, type: 'static' });
        targets.push({ x: 1.2, y: 2.0, type: 'static' });
        targets.push({ x: 0, y: 1.2, type: 'drone', droneSpeed: 1.8, droneRange: 2.5 });
    } else if (wave === 3) {
        // Green explosive core and hazard
        targets.push({ x: 0, y: 2.8, type: 'green-core' });
        targets.push({ x: -1.8, y: 2.8, type: 'static' });
        targets.push({ x: 1.8, y: 2.8, type: 'static' });
        targets.push({ x: -0.8, y: 1.4, type: 'hazard' });
        targets.push({ x: 0.8, y: 1.4, type: 'static' });
        targets.push({ x: 0, y: 4.0, type: 'drone', droneSpeed: 2.2, droneRange: 3.0 });
    } else {
        // Procedural Wave generation (Dynamic mix based on difficulty)
        const density = Math.min(8, 4 + Math.floor(wave / 2));
        const droneCount = Math.min(3, Math.floor(wave / 3));
        const hasGreen = Math.random() < 0.6;
        const hasHazard = Math.random() < 0.8;
        
        // Grid nodes on Z = -9.7 target wall
        // Coordinates: X from -3 to 3, Y from 1 to 4.2
        const gridPositions = [
            {x: -2.2, y: 3.8}, {x: 0, y: 3.8}, {x: 2.2, y: 3.8},
            {x: -2.2, y: 2.5}, {x: 0, y: 2.5}, {x: 2.2, y: 2.5},
            {x: -1.2, y: 1.3}, {x: 1.2, y: 1.3}
        ];
        
        // Shuffle grid
        gridPositions.sort(() => Math.random() - 0.5);
        
        let spawned = 0;
        
        // Always add 1 green core if flagged
        if (hasGreen && gridPositions.length > 0) {
            const p = gridPositions.pop();
            targets.push({ x: p.x, y: p.y, type: 'green-core' });
            spawned++;
        }
        
        // Always add 1 hazard if flagged
        if (hasHazard && gridPositions.length > 0) {
            const p = gridPositions.pop();
            targets.push({ x: p.x, y: p.y, type: 'hazard' });
        }
        
        // Add drones
        for (let i = 0; i < droneCount; i++) {
            targets.push({
                x: (Math.random() * 2 - 1) * 1.5,
                y: 1.8 + Math.random() * 2.2,
                type: 'drone',
                droneSpeed: 1.5 + Math.random() * 1.5 + (wave * 0.08),
                droneRange: 2.0 + Math.random() * 1.5
            });
        }
        
        // Fill rest with standard panels
        while (spawned < density && gridPositions.length > 0) {
            const p = gridPositions.pop();
            targets.push({ x: p.x, y: p.y, type: 'static' });
            spawned++;
        }
    }
    
    // Create elements in the DOM
    targets.forEach(t => {
        const el = document.createElement('a-entity');
        el.setAttribute('target-panel', {
            type: t.type,
            droneSpeed: t.droneSpeed || 0,
            droneRange: t.droneRange || 0,
            startX: t.x,
            startY: t.y
        });
        UI.targetContainer.appendChild(el);
    });
}

function checkRemainingTargets() {
    // Find all target entities
    const activeTargets = UI.targetContainer.querySelectorAll('[target-panel]');
    let nonHazardLeft = 0;
    
    activeTargets.forEach(target => {
        const type = target.getAttribute('target-panel').type;
        if (type !== 'hazard') {
            nonHazardLeft++;
        }
    });
    
    // If all non-hazard panels are cleared, spawn new wave!
    if (nonHazardLeft === 0) {
        // Smoothly delay wave spawn to let particles disperse
        setTimeout(() => {
            if (!game.active) return;
            // Clear hazards
            UI.targetContainer.innerHTML = '';
            spawnWave();
        }, 800);
    }
}

// Trigger combo multiplier decay countdown
function triggerComboSuccess() {
    game.combo++;
    if (game.combo > game.maxCombo) {
        game.maxCombo = game.combo;
    }
    
    // Reset multiplier decay timer: players have 4 seconds to score again
    game.comboTimeLeft = 4000;
    
    if (game.comboTimer) clearInterval(game.comboTimer);
    game.comboTimer = setInterval(() => {
        game.comboTimeLeft -= 200;
        
        // Visual indicator in HUD of combo decaying
        if (game.comboTimeLeft <= 1500) {
            UI.hudCombo.style.opacity = '0.5';
        } else {
            UI.hudCombo.style.opacity = '1.0';
        }
        
        if (game.comboTimeLeft <= 0) {
            game.combo = 1;
            clearInterval(game.comboTimer);
            updateHUDText();
            UI.hudCombo.style.opacity = '1.0';
        }
    }, 200);
    
    updateHUDText();
}

function triggerComboReset() {
    game.combo = 1;
    if (game.comboTimer) clearInterval(game.comboTimer);
    updateHUDText();
    UI.hudCombo.style.opacity = '1.0';
}

// Freeze dispenser temporarily
function freezeDispenser() {
    if (game.dispenserFrozen) return;
    game.dispenserFrozen = true;
    
    // Visual indicators
    document.getElementById('dispenser-preview-disc').setAttribute('visible', 'false');
    UI.dispenserText.setAttribute('text', {
        value: 'DISPENSER LOCKED',
        color: '#ff003c'
    });
    
    // Create frozen banner in overlay
    const warning = document.createElement('div');
    warning.id = 'dispenser-frozen-msg';
    warning.className = 'dispenser-frozen-overlay';
    warning.innerText = 'DISPENSER LOCK: -200 PTS';
    UI.uiLayer.appendChild(warning);
    
    // Release desktop disc if loaded
    if (game.desktopLoaded) {
        game.desktopLoaded = false;
        UI.desktopLoadedDisc.setAttribute('visible', 'false');
    }
    audio.stopCharge();
    game.isCharging = false;
    UI.powerFill.style.width = '0%';
    UI.powerPercent.innerText = '0%';

    // Freeze for 2.0 seconds
    if (game.dispenserFreezeTimer) clearTimeout(game.dispenserFreezeTimer);
    game.dispenserFreezeTimer = setTimeout(unfreezeDispenser, 2000);
}

function unfreezeDispenser() {
    game.dispenserFrozen = false;
    const warning = document.getElementById('dispenser-frozen-msg');
    if (warning) warning.remove();
    
    document.getElementById('dispenser-preview-disc').setAttribute('visible', 'true');
    UI.dispenserText.setAttribute('text', {
        value: 'CLICK DISPENSER',
        color: '#00d4ff'
    });
}

// ============================================================================
// 5. INTERACTION MECHANICS (DESKTOP & VR)
// ============================================================================

// Desktop grabbing
function loadDesktopDisc() {
    audio.playGrab();
    game.desktopLoaded = true;
    UI.desktopLoadedDisc.setAttribute('visible', 'true');
    UI.desktopChargeGlow.setAttribute('material', 'opacity', 0.0);
    UI.dispenserText.setAttribute('text', 'value', 'HOLD CLICK TO POWER');
}

function startDesktopCharge() {
    game.isCharging = true;
    game.chargeStart = performance.now();
    audio.startCharge();
}

function releaseDesktopDisc() {
    game.isCharging = false;
    audio.stopCharge();
    
    // Calculate final power based on duration (reaches 100% in 1.1 seconds)
    const duration = performance.now() - game.chargeStart;
    const charge = Math.min(1.0, duration / 1100);
    
    // Minimum charge required to launch
    if (charge < 0.05) {
        UI.powerFill.style.width = '0%';
        UI.powerPercent.innerText = '0%';
        UI.desktopChargeGlow.setAttribute('material', 'opacity', 0.0);
        return;
    }
    
    // Retrieve camera aim direction
    const mouseCursor = document.getElementById('mouse-cursor');
    if (!mouseCursor || !mouseCursor.components.raycaster) return;
    
    const ray = mouseCursor.components.raycaster.ray;
    if (!ray) return;
    
    // Create new flying disc
    const discSpeed = 10 + charge * 18; // Speed between 10m/s and 28m/s
    const spawnPos = new THREE.Vector3(0.2, 1.4, -0.4); // slightly offset from camera center
    
    // Convert camera offset relative position to world coordinates
    const cameraEl = document.getElementById('camera');
    const worldSpawnPos = new THREE.Vector3().copy(spawnPos).applyMatrix4(cameraEl.object3D.matrixWorld);
    
    const velocity = new THREE.Vector3().copy(ray.direction).normalize().multiplyScalar(discSpeed);
    
    spawnCyberDisc(worldSpawnPos, velocity);
    
    // Reset loaded state
    game.desktopLoaded = false;
    UI.desktopLoadedDisc.setAttribute('visible', 'false');
    UI.dispenserText.setAttribute('text', 'value', 'CLICK DISPENSER');
    
    // Reset HUD indicators
    UI.powerFill.style.width = '0%';
    UI.powerPercent.innerText = '0%';
}

// VR Controllers grabbing and release logic
function setupVRControllers() {
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');
    
    const onControllerConnected = (evt) => {
        const hand = evt.target.id === 'left-hand' ? 'left' : 'right';
        game.hands[hand].controller = evt.detail.component;
        
        // Hide gaze reticle since we have hand lasers
        document.getElementById('gaze-reticle').setAttribute('visible', 'false');
        
        // Hide dispenser screen prompt since VR is immersive
        UI.dispenserText.setAttribute('text', 'value', 'REACH TO GRAB');
    };
    
    const onControllerDisconnected = (evt) => {
        const hand = evt.target.id === 'left-hand' ? 'left' : 'right';
        game.hands[hand].controller = null;
        game.hands[hand].holding = false;
        
        if (!game.hands.left.controller && !game.hands.right.controller) {
            // Restore gaze cursor
            document.getElementById('gaze-reticle').setAttribute('visible', 'true');
            UI.dispenserText.setAttribute('text', 'value', 'CLICK DISPENSER');
        }
    };
    
    // Attach event listeners
    [leftHand, rightHand].forEach(el => {
        el.addEventListener('controllerconnected', onControllerConnected);
        el.addEventListener('controllerdisconnected', onControllerDisconnected);
        
        // Listen to grip/trigger down
        const onGrabStart = () => {
            if (!game.active || game.dispenserFrozen) return;
            const hand = el.id === 'left-hand' ? 'left' : 'right';
            if (game.hands[hand].holding) return;
            
            // Check distance from controller to dispenser pedestal
            const handPos = new THREE.Vector3();
            el.object3D.getWorldPosition(handPos);
            const dist = handPos.distanceTo(DISP_POS);
            
            if (dist <= GRAB_DIST) {
                // Grab disc!
                game.hands[hand].holding = true;
                audio.playGrab();
                
                // Haptic pulse feedback
                triggerVRHaptics(el, 0.7, 70);
                
                // Spawn a visual disc parented to the controller
                const localDisc = document.createElement('a-entity');
                localDisc.id = `${el.id}-held-disc`;
                localDisc.innerHTML = `
                    <a-torus radius="0.12" radius-tubular="0.015" color="#00d4ff" material="shader: flat" rotation="90 0 0"></a-torus>
                    <a-cylinder radius="0.09" height="0.01" color="#00d4ff" material="shader: flat; opacity: 0.4"></a-cylinder>
                `;
                el.appendChild(localDisc);
            }
        };
        
        const onGrabEnd = () => {
            const hand = el.id === 'left-hand' ? 'left' : 'right';
            if (!game.hands[hand].holding) return;
            
            game.hands[hand].holding = false;
            
            // Remove local visual disc representation
            const localDisc = document.getElementById(`${el.id}-held-disc`);
            if (localDisc) localDisc.remove();
            
            // Calculate throwing velocity
            const handPos = new THREE.Vector3();
            el.object3D.getWorldPosition(handPos);
            
            let throwVelocity = new THREE.Vector3();
            const history = game.hands[hand].velocityHistory;
            
            if (history.length >= 2) {
                // Calculate average velocity vector from tracked history
                let sumX = 0, sumY = 0, sumZ = 0;
                history.forEach(v => {
                    sumX += v.x;
                    sumY += v.y;
                    sumZ += v.z;
                });
                throwVelocity.set(sumX / history.length, sumY / history.length, sumZ / history.length);
                
                // Amplify velocity in VR for easier throw dynamics
                throwVelocity.multiplyScalar(1.4);
            }
            
            const speed = throwVelocity.length();
            
            // Fallback direction if tracking velocity is very low
            if (speed < 2.0) {
                // Throw forward relative to hand orientation
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(el.object3D.quaternion);
                throwVelocity.copy(direction).multiplyScalar(12.0); // default speed: 12m/s
            } else {
                // Cap speed between 6.0 and 26.0 m/s
                const clampedSpeed = Math.min(26.0, Math.max(6.0, speed));
                throwVelocity.normalize().multiplyScalar(clampedSpeed);
            }
            
            spawnCyberDisc(handPos, throwVelocity);
        };
        
        el.addEventListener('triggerdown', onGrabStart);
        el.addEventListener('gripdown', onGrabStart);
        el.addEventListener('triggerup', onGrabEnd);
        el.addEventListener('gripup', onGrabEnd);
    });
}

function triggerVRHaptics(handEl, intensity, duration) {
    const trackedControls = handEl.components['tracked-controls-webxr'] || handEl.components['tracked-controls'];
    if (trackedControls && trackedControls.controller) {
        const gamepad = trackedControls.controller.gamepad;
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
            gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
        }
    }
}

// Spawn flying disc entity
function spawnCyberDisc(position, velocity) {
    audio.playThrow();
    
    const disc = document.createElement('a-entity');
    disc.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    disc.setAttribute('cyber-disc', {
        vx: velocity.x,
        vy: velocity.y,
        vz: velocity.z
    });
    
    UI.discContainer.appendChild(disc);
}

// ============================================================================
// 6. CUSTOM A-FRAME COMPONENTS
// ============================================================================

// Component to handle frame-by-frame physics of active discs
AFRAME.registerComponent('cyber-disc', {
    schema: {
        vx: { type: 'number', default: 0 },
        vy: { type: 'number', default: 0 },
        vz: { type: 'number', default: -12 }
    },
    
    init: function () {
        this.velocity = new THREE.Vector3(this.data.vx, this.data.vy, this.data.vz);
        this.gravity = 2.2; // slight downward drop
        this.restitution = 0.75; // bounce retention ratio
        this.discRadius = 0.14;
        this.lifetime = 0;
        
        // Add visual components
        this.el.innerHTML = `
            <a-torus radius="0.12" radius-tubular="0.015" color="#00d4ff" material="shader: flat; emissive: #00d4ff; emissiveIntensity: 1.5" rotation="90 0 0"></a-torus>
            <a-cylinder radius="0.09" height="0.01" color="#00d4ff" material="shader: flat; opacity: 0.5" position="0 0 0"></a-cylinder>
            <a-sphere radius="0.02" color="#ffffff" material="shader: flat" position="0 0 0"></a-sphere>
        `;
    },
    
    tick: function (time, dt) {
        if (!game.active) {
            this.el.remove();
            return;
        }
        
        // Cap dt to prevent clipping during frame hitches
        const dtSec = Math.min(0.05, dt / 1000);
        this.lifetime += dtSec;
        
        if (this.lifetime > 5.0) {
            this.el.remove();
            return;
        }
        
        const pos = this.el.object3D.position;
        
        // Apply Euler physics step
        pos.addScaledVector(this.velocity, dtSec);
        this.velocity.y -= this.gravity * dtSec;
        
        // Spin the disc object
        this.el.object3D.rotation.y += 10 * dtSec;
        
        // Boundary checking - Left/Right Walls (X: -4 to 4)
        if (pos.x < -4.0 + this.discRadius) {
            pos.x = -4.0 + this.discRadius;
            this.velocity.x = -this.velocity.x * this.restitution;
            audio.playBounce();
        } else if (pos.x > 4.0 - this.discRadius) {
            pos.x = 4.0 - this.discRadius;
            this.velocity.x = -this.velocity.x * this.restitution;
            audio.playBounce();
        }
        
        // Boundary checking - Floor/Ceiling (Y: 0 to 5)
        if (pos.y < 0.05) {
            pos.y = 0.05;
            this.velocity.y = -this.velocity.y * this.restitution;
            audio.playBounce();
            
            // Terminate if sliding flat along floor
            if (Math.abs(this.velocity.y) < 0.3 && Math.abs(this.velocity.x) < 0.3) {
                this.el.remove();
                return;
            }
        } else if (pos.y > 5.0 - this.discRadius) {
            pos.y = 5.0 - this.discRadius;
            this.velocity.y = -this.velocity.y * this.restitution;
            audio.playBounce();
        }
        
        // Boundary checking - Back Target Wall (Z: -10m)
        if (pos.z <= -9.8) {
            // Collision check
            checkTargetWallCollisions(pos.x, pos.y);
            this.el.remove(); // destroy disc
        }
        
        // Boundary checking - Behind player (Z: > 2.0m)
        if (pos.z > 2.0) {
            this.el.remove();
        }
    }
});

// Component to manage target properties and state
AFRAME.registerComponent('target-panel', {
    schema: {
        type: { type: 'string', default: 'static' }, // static, drone, green-core, hazard
        droneSpeed: { type: 'number', default: 2.0 },
        droneRange: { type: 'number', default: 3.0 },
        startX: { type: 'number', default: 0 },
        startY: { type: 'number', default: 2.5 }
    },
    
    init: function () {
        this.type = this.data.type;
        this.el.object3D.position.set(this.data.startX, this.data.startY, -9.7);
        this.timeOffset = Math.random() * 100;
        
        // Define dimensions for collision (radius)
        this.radius = 0.32;
        if (this.type === 'green-core') this.radius = 0.28;
        
        // Design components based on type
        let color = '#ff6a00';
        let geometry = 'primitive: box; width: 0.55; height: 0.55; depth: 0.08';
        let material = `color: #ff6a00; roughness: 0.2; metalness: 0.8; emissive: #ff6a00; emissiveIntensity: 0.6`;
        
        if (this.type === 'drone') {
            color = '#ff007f';
            geometry = 'primitive: box; width: 0.6; height: 0.35; depth: 0.08';
            material = `color: #ff007f; roughness: 0.2; metalness: 0.8; emissive: #ff007f; emissiveIntensity: 0.8`;
        } else if (this.type === 'green-core') {
            color = '#39ff14';
            geometry = 'primitive: sphere; radius: 0.25';
            material = `color: #39ff14; roughness: 0.3; metalness: 0.6; emissive: #39ff14; emissiveIntensity: 1.0`;
        } else if (this.type === 'hazard') {
            color = '#ff003c';
            geometry = 'primitive: box; width: 0.5; height: 0.5; depth: 0.08';
            material = `color: #ff003c; roughness: 0.1; metalness: 0.9; emissive: #ff003c; emissiveIntensity: 1.0`;
        }
        
        this.el.setAttribute('geometry', geometry);
        this.el.setAttribute('material', material);
        this.el.classList.add('target-interactive');
        
        // Add decorative wireframe outlines or side wings
        if (this.type === 'drone') {
            // Drone wings
            const leftWing = document.createElement('a-cone');
            leftWing.setAttribute('position', '-0.4 0 0');
            leftWing.setAttribute('rotation', '0 0 90');
            leftWing.setAttribute('radius-bottom', '0.12');
            leftWing.setAttribute('height', '0.3');
            leftWing.setAttribute('color', '#ff007f');
            leftWing.setAttribute('material', 'shader: flat');
            this.el.appendChild(leftWing);
            
            const rightWing = document.createElement('a-cone');
            rightWing.setAttribute('position', '0.4 0 0');
            rightWing.setAttribute('rotation', '0 0 -90');
            rightWing.setAttribute('radius-bottom', '0.12');
            rightWing.setAttribute('height', '0.3');
            rightWing.setAttribute('color', '#ff007f');
            rightWing.setAttribute('material', 'shader: flat');
            this.el.appendChild(rightWing);
        } else if (this.type === 'hazard') {
            // Hazard symbol (yellow triangle overlay)
            const warningSign = document.createElement('a-cone');
            warningSign.setAttribute('position', '0 0 0.05');
            warningSign.setAttribute('radius-bottom', '0.15');
            warningSign.setAttribute('height', '0.25');
            warningSign.setAttribute('color', '#ffffff');
            warningSign.setAttribute('material', 'shader: flat');
            this.el.appendChild(warningSign);
        }
    },
    
    tick: function (time, dt) {
        if (!game.active) return;
        const tSec = time / 1000 + this.timeOffset;
        
        // Drone horizontal movement
        if (this.type === 'drone') {
            const x = this.data.startX + Math.sin(tSec * this.data.droneSpeed) * this.data.droneRange;
            // Bound drone within court walls
            const clampedX = Math.max(-3.5, Math.min(3.5, x));
            this.el.object3D.position.x = clampedX;
        }
        
        // Subtly hover hazard or green cores up/down
        if (this.type === 'green-core' || this.type === 'hazard') {
            const hover = Math.sin(tSec * 3.5) * 0.08;
            this.el.object3D.position.y = this.data.startY + hover;
        }
        
        // Rotate green core dynamically
        if (this.type === 'green-core') {
            this.el.object3D.rotation.y += (dt / 1000) * 1.5;
            this.el.object3D.rotation.x += (dt / 1000) * 0.8;
        }
    }
});

// Component to handle target shatter explosions
AFRAME.registerComponent('shatter-particles', {
    schema: {
        color: { type: 'string', default: '#ff6a00' },
        count: { type: 'number', default: 12 },
        scale: { type: 'number', default: 1.0 }
    },
    
    init: function () {
        this.particles = [];
        const pos = this.el.object3D.position;
        const color = this.data.color;
        
        for (let i = 0; i < this.data.count; i++) {
            const el = document.createElement('a-entity');
            
            // Random particle dimensions
            const pSize = 0.04 + Math.random() * 0.08 * this.data.scale;
            el.setAttribute('geometry', {
                primitive: Math.random() > 0.5 ? 'box' : 'sphere',
                width: pSize, height: pSize, depth: pSize, radius: pSize/2
            });
            el.setAttribute('material', {
                color: color,
                shader: 'flat',
                opacity: 0.9,
                transparent: true
            });
            
            // Spurt outwards
            const vx = (Math.random() - 0.5) * 6.5 * this.data.scale;
            const vy = (Math.random() - 0.3) * 5.5 * this.data.scale + 2.0;
            const vz = (Math.random() + 0.1) * 4.5 * this.data.scale; // bounce back
            
            el.setAttribute('position', '0 0 0');
            this.el.appendChild(el);
            
            this.particles.push({
                el: el,
                pos: new THREE.Vector3(0, 0, 0),
                vel: new THREE.Vector3(vx, vy, vz),
                opacity: 0.9
            });
        }
        
        this.gravity = 9.8;
        this.lifetime = 0;
    },
    
    tick: function (time, dt) {
        const dtSec = dt / 1000;
        this.lifetime += dtSec;
        
        if (this.lifetime > 1.2) {
            this.el.remove();
            return;
        }
        
        this.particles.forEach(p => {
            // Apply physics step
            p.pos.addScaledVector(p.vel, dtSec);
            p.vel.y -= this.gravity * dtSec;
            
            p.el.setAttribute('position', `${p.pos.x} ${p.pos.y} ${p.pos.z}`);
            
            // Fade opacity
            p.opacity -= dtSec * 0.85;
            p.el.setAttribute('material', 'opacity', Math.max(0, p.opacity));
        });
    }
});

// ============================================================================
// 7. COLLISION & EXPLOSION PHYSICS
// ============================================================================

function checkTargetWallCollisions(discX, discY) {
    const activeTargets = UI.targetContainer.querySelectorAll('[target-panel]');
    let hitSomething = false;
    
    activeTargets.forEach(target => {
        const component = target.components['target-panel'];
        if (!component) return;
        
        const targetPos = target.object3D.position;
        const radius = component.radius;
        
        // 2D distance check
        const dist = Math.sqrt(Math.pow(targetPos.x - discX, 2) + Math.pow(targetPos.y - discY, 2));
        
        if (dist <= radius + 0.15) { // disc radius is 0.15
            hitSomething = true;
            destroyTarget(target, component.type);
        }
    });
    
    // Play splash explosion particles at the wall impact coordinate
    spawnWallImpactParticles(discX, discY, hitSomething ? '#ffffff' : '#00d4ff');
    
    if (hitSomething) {
        checkRemainingTargets();
    }
}

function destroyTarget(target, type) {
    const pos = target.object3D.position.clone();
    
    if (type === 'hazard') {
        // Deduct points
        game.score = Math.max(0, game.score - 200);
        triggerComboReset();
        audio.playWarning();
        
        // Spawn red particles
        spawnShatterParticles(pos, '#ff003c', 16, 0.9);
        
        // Freeze dispenser
        freezeDispenser();
        
        target.remove();
    } else if (type === 'green-core') {
        // Add points
        const points = 200 * game.combo;
        game.score += points;
        triggerComboSuccess();
        audio.playBlast();
        
        // Visual blast wave cylinder
        spawnBlastWave(pos);
        
        // Blast particles
        spawnShatterParticles(pos, '#39ff14', 28, 1.8);
        
        target.remove();
        
        // Blast Radius chain reaction: destroy all non-hazard targets within 2.5 meters
        const activeTargets = UI.targetContainer.querySelectorAll('[target-panel]');
        activeTargets.forEach(otherTarget => {
            if (otherTarget === target) return;
            
            const otherPos = otherTarget.object3D.position;
            const dist = pos.distanceTo(otherPos);
            
            if (dist <= 2.5) {
                // Smooth delay to represent expansion shockwave
                setTimeout(() => {
                    if (!game.active || !otherTarget.parentNode) return;
                    const otherType = otherTarget.components['target-panel'].type;
                    
                    if (otherType !== 'hazard') {
                        destroyTarget(otherTarget, otherType);
                        checkRemainingTargets();
                    }
                }, dist * 80);
            }
        });
    } else {
        // Normal panels & drones
        const basePoints = type === 'drone' ? 300 : 100;
        const points = basePoints * game.combo;
        game.score += points;
        triggerComboSuccess();
        audio.playHit();
        
        // Particle explosion matching theme color
        const color = type === 'drone' ? '#ff007f' : '#ff6a00';
        spawnShatterParticles(pos, color, 14, 1.0);
        
        target.remove();
    }
}

function spawnShatterParticles(pos, color, count, scale) {
    const sys = document.createElement('a-entity');
    sys.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    sys.setAttribute('shatter-particles', {
        color: color,
        count: count,
        scale: scale
    });
    UI.targetContainer.appendChild(sys);
}

function spawnWallImpactParticles(x, y, color) {
    const sys = document.createElement('a-entity');
    sys.setAttribute('position', `${x} ${y} -9.9`);
    sys.setAttribute('shatter-particles', {
        color: color,
        count: 6,
        scale: 0.5
    });
    UI.targetContainer.appendChild(sys);
}

function spawnBlastWave(pos) {
    const blast = document.createElement('a-ring');
    blast.setAttribute('position', `${pos.x} ${pos.y} -9.8`);
    blast.setAttribute('radius-inner', '0.1');
    blast.setAttribute('radius-outer', '0.2');
    blast.setAttribute('color', '#39ff14');
    blast.setAttribute('material', 'shader: flat; opacity: 0.8; transparent: true');
    UI.targetContainer.appendChild(blast);
    
    // Animate expand and fade out
    let radius = 0.2;
    let opacity = 0.8;
    const interval = setInterval(() => {
        if (!game.active || !blast.parentNode) {
            clearInterval(interval);
            return;
        }
        radius += 0.15;
        opacity -= 0.05;
        
        blast.setAttribute('radius-outer', radius);
        blast.setAttribute('radius-inner', radius - 0.1);
        blast.setAttribute('material', 'opacity', Math.max(0, opacity));
        
        if (opacity <= 0) {
            blast.remove();
            clearInterval(interval);
        }
    }, 20);
}

// ============================================================================
// 8. TICK ANIMATION LOOP (FOR CONTROLLERS AND DESKTOP)
// ============================================================================

AFRAME.registerComponent('scene-logic', {
    init: function () {
        this.lastTime = performance.now();
    },
    
    tick: function (time, dt) {
        // Cap dt to prevent spikes
        const dtSec = Math.min(0.05, dt / 1000);
        
        // 1. Process desktop power charging display
        if (game.active && game.isCharging) {
            const duration = performance.now() - game.chargeStart;
            const charge = Math.min(1.0, duration / 1100);
            game.chargeRatio = charge;
            
            // Update audio frequency
            audio.updateCharge(charge);
            
            // Update HUD power bar
            UI.powerFill.style.width = `${charge * 100}%`;
            UI.powerPercent.innerText = `${Math.floor(charge * 100)}%`;
            
            // Update desktop visual glow
            UI.desktopChargeGlow.setAttribute('material', 'opacity', charge * 0.8);
            const scale = 1.0 + charge * 0.4;
            UI.desktopChargeGlow.setAttribute('scale', `${scale} ${scale} ${scale}`);
        }
        
        // 2. Track controller positions for velocity estimation on release
        ['left', 'right'].forEach(hand => {
            const hState = game.hands[hand];
            const handEl = document.getElementById(`${hand}-hand`);
            if (handEl && hState.controller) {
                const currentPos = new THREE.Vector3();
                handEl.object3D.getWorldPosition(currentPos);
                
                // Estimate velocity vector
                const velocity = new THREE.Vector3()
                    .copy(currentPos)
                    .sub(hState.lastPos)
                    .multiplyScalar(1 / dtSec);
                
                // Add to history ring buffer (maintain 6 frames)
                hState.velocityHistory.push(velocity);
                if (hState.velocityHistory.length > 6) {
                    hState.velocityHistory.shift();
                }
                
                hState.lastPos.copy(currentPos);
            }
        });
        
        // Rotate floating disc in dispenser (always, for visual polish)
        const dispDisc = document.getElementById('dispenser-preview-disc');
        if (dispDisc && dispDisc.getAttribute('visible') === 'true') {
            dispDisc.object3D.rotation.y += dtSec * 1.5;
            // Add slight levitation bob
            dispDisc.object3D.position.y = 0.95 + Math.sin(time / 400) * 0.03;
        }
    }
});

// Register component on scene
UI.scene.setAttribute('scene-logic', '');

// Trigger initialization
document.addEventListener('DOMContentLoaded', initGame);
