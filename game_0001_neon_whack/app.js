/**
 * Neon Gaze Whack - Game Core Logic
 * Fully gaze-driven VR gameplay using A-Frame and synthesized Web Audio.
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
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

    playZap(isPower = false) {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = isPower ? 'sine' : 'triangle';
        const startFreq = isPower ? 500 : 350;
        const endFreq = isPower ? 1500 : 900;
        const duration = isPower ? 0.22 : 0.15;
        
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
        
        gain.gain.setValueAtTime(isPower ? 0.25 : 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + duration + 0.01);
    }

    playBuzz() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.4;
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(98, t); // G2-ish low hum
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(102, t); // detuned low beat
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + duration + 0.01);
        osc2.stop(t + duration + 0.01);
    }

    playTick(pitchPercent) {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.04;
        
        osc.type = 'sine';
        // Base frequency 700Hz, scaling up to 1600Hz as duration depletes
        const freq = 700 + (pitchPercent * 900);
        osc.frequency.setValueAtTime(freq, t);
        
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + duration + 0.01);
    }

    playStartFanfare() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        // Cyberpunk synth chords: C4, D#4, G4, C5
        const notes = [261.63, 311.13, 392.00, 523.25];
        
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
        // Declining cyber minor chord: G#4, E4, C4, G#3
        const notes = [415.30, 329.63, 261.63, 207.65];
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + index * 0.12;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.41);
        });
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    score: 0,
    lives: 3,
    highscore: parseInt(localStorage.getItem('neon_gaze_highscore') || '0', 10),
    active: false,
    
    // Core parameters
    baseSpawnInterval: 1800,  // ms between spawn attempts at start
    minSpawnInterval: 850,    // ms floor
    spawnTimer: 0,            // ms countdown to next spawn
    
    // Grid Node States
    nodes: Array.from({ length: 9 }, (_, i) => ({
        index: i,
        state: 'retracted',   // 'retracted', 'popping', 'active', 'retreating'
        type: 'standard',     // 'standard', 'power', 'hazard'
        z: -0.15,             // Local Z coordinate of cylinder
        timeLeft: 0,          // Remaining active duration
        duration: 0,          // Total active duration
        tickTimer: 0,         // Internal timer for countdown beep frequency
        element: null
    }))
};

// ==========================================
// 3. UI ELEMENT REFERENCES
// ==========================================
const UI = {
    // 2D Dashboard Screen Overlays
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    // 2D HUD Info
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudHighScore: document.getElementById('hud-highscore-val'),
    hudHearts: document.querySelectorAll('.heart-icon'),
    
    // 2D Game Over Stats
    statFinalScore: document.getElementById('stat-final-score'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    // 3D VR In-scene UI Panels
    vrBtnStart: document.getElementById('vr-btn-start'),
    vrBtnRestart: document.getElementById('vr-btn-restart'),
    vrHud: document.getElementById('vr-hud'),
    vrHudScore: document.getElementById('vr-hud-score'),
    vrHudLives: document.getElementById('vr-hud-lives'),
    consoleGlow: document.getElementById('console-glow')
};

// Initialize elements once DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Set cylinder core element references
    const targets = document.querySelectorAll('.target-core');
    targets.forEach(el => {
        const idx = parseInt(el.getAttribute('data-node'), 10);
        game.nodes[idx].element = el;
        
        // Target whacking event (A-Frame dispatch 'click' via fuse gaze)
        el.addEventListener('click', () => {
            onNodeZap(idx);
        });
    });

    // Wire Start and Restart actions (both desktop button click & gaze triggers)
    UI.btnStart.addEventListener('click', startGame);
    UI.btnRestart.addEventListener('click', startGame);
    
    UI.vrBtnStart.addEventListener('click', startGame);
    UI.vrBtnRestart.addEventListener('click', startGame);

    // Initial Highscore sync
    UI.hudHighScore.innerText = formatNumber(game.highscore);
    
    // Sound initialization on first user tap
    document.body.addEventListener('pointerdown', () => audio.resume());
});

// Helper: pad score digits
function formatNumber(num) {
    return String(num).padStart(3, '0');
}

// ==========================================
// 4. GAME PLAYPLAY ACTIONS
// ==========================================
function startGame() {
    audio.resume();
    audio.playStartFanfare();
    
    // Reset Game State
    game.score = 0;
    game.lives = 3;
    game.active = true;
    game.spawnTimer = 500; // spawn first core after 500ms
    
    // Reset all target nodes
    game.nodes.forEach(node => {
        node.state = 'retracted';
        node.z = -0.15;
        node.timeLeft = 0;
        node.duration = 0;
        node.tickTimer = 0;
        if (node.element) {
            node.element.setAttribute('position', `0 0 -0.15`);
        }
    });

    // Sync 2D HTML Dashboard Overlays
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    
    updateHUDVisuals();

    // Sync 3D VR Overlays
    UI.vrBtnStart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnStart.setAttribute('visible', 'false');
    UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnRestart.setAttribute('visible', 'false');
    
    UI.vrHud.setAttribute('visible', 'true');
    
    // Ambient color glow indicator
    UI.consoleGlow.setAttribute('light', 'color: #ff007f; intensity: 0.5');
}

function gameOver() {
    game.active = false;
    audio.playGameOverFanfare();

    // Persist High Scores
    let isNewRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('neon_gaze_highscore', game.highscore);
        isNewRecord = true;
    }

    // Retract any active targets
    game.nodes.forEach(node => {
        if (node.state !== 'retracted') {
            node.state = 'retreating';
        }
    });

    // Populate Game Over Stats
    UI.statFinalScore.innerText = game.score;
    UI.statHighScore.innerText = game.highscore;
    
    if (isNewRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }

    // Show Game Over Panels (both 2D and 3D)
    UI.panelGameOver.classList.remove('hidden');
    
    // Scale 3D Button to reveal it
    UI.vrBtnRestart.setAttribute('visible', 'true');
    UI.vrBtnRestart.setAttribute('scale', '1 1 1');
    
    // Set console glowing alert
    UI.consoleGlow.setAttribute('light', 'color: #ff5e00; intensity: 0.8');
}

function updateHUDVisuals() {
    const formattedScore = formatNumber(game.score);
    const formattedHighScore = formatNumber(game.highscore);
    
    // Sync screen HUD text fields
    UI.hudScore.innerText = formattedScore;
    UI.hudHighScore.innerText = formattedHighScore;
    
    // Trigger pop scale animation on score numbers
    UI.hudScore.classList.remove('score-pop');
    void UI.hudScore.offsetWidth; // trigger reflow
    UI.hudScore.classList.add('score-pop');
    
    // Sync Screen Heart icons
    UI.hudHearts.forEach((heart, idx) => {
        if (idx < game.lives) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
        }
    });

    // Sync 3D VR text fields
    UI.vrHudScore.setAttribute('value', `SCORE: ${formattedScore}`);
    
    let lifePipes = '';
    for (let i = 0; i < game.lives; i++) lifePipes += 'I';
    if (lifePipes === '') lifePipes = 'CRITICAL';
    
    UI.vrHudLives.setAttribute('value', `INTEGRITY: ${lifePipes}`);
    UI.vrHudLives.setAttribute('color', game.lives <= 1 ? '#ff5e00' : '#ff007f');
}

// ==========================================
// 5. GAZE INTERACTION CALLBACKS
// ==========================================
function onNodeZap(nodeIdx) {
    if (!game.active) return;
    
    const node = game.nodes[nodeIdx];
    // Can only zap if the core is fully popped or popping up
    if (node.state !== 'active' && node.state !== 'popping') return;

    // Trigger immediate retraction
    node.state = 'retreating';

    if (node.type === 'standard') {
        game.score += 1;
        audio.playZap(false);
        flashGlow('#00f3ff');
    } else if (node.type === 'power') {
        game.score += 3;
        audio.playZap(true);
        flashGlow('#39ff14');
    } else if (node.type === 'hazard') {
        game.lives -= 1;
        audio.playBuzz();
        flashGlow('#ff5e00');
    }

    updateHUDVisuals();
    
    if (game.lives <= 0) {
        gameOver();
    }
}

// Flash console light briefly on hits
function flashGlow(colorHex) {
    UI.consoleGlow.setAttribute('light', `color: ${colorHex}; intensity: 1.5`);
    setTimeout(() => {
        if (game.active) {
            UI.consoleGlow.setAttribute('light', 'color: #ff007f; intensity: 0.5');
        }
    }, 200);
}

// ==========================================
// 6. MAIN GAME STATE TICK/UPDATE LOOP
// ==========================================
let lastTime = performance.now();

function update(time) {
    const delta = Math.min(50, time - lastTime); // clamp delta to prevent giant steps on tab backgrounding
    lastTime = time;

    if (game.active) {
        // --- Core Spawning Controller ---
        game.spawnTimer -= delta;
        if (game.spawnTimer <= 0) {
            spawnCore();
        }
    }

    // --- Core Node Motion & Lifespan Updates ---
    game.nodes.forEach(node => {
        const popSpeed = 0.3 / 150; // cylinder length (0.3m) / 150ms pop duration
        
        switch (node.state) {
            case 'popping':
                node.z += delta * popSpeed;
                if (node.z >= 0.15) {
                    node.z = 0.15;
                    node.state = 'active';
                }
                break;
                
            case 'active':
                node.timeLeft -= delta;
                
                // Countdown beeper ticker (only for Standard and Power targets)
                if (node.type !== 'hazard') {
                    node.tickTimer -= delta;
                    if (node.tickTimer <= 0) {
                        // Pitch percent scales as timeLeft depletes (0 = start, 1 = empty)
                        const durationPercent = Math.max(0, Math.min(1, 1 - (node.timeLeft / node.duration)));
                        audio.playTick(durationPercent);
                        
                        // Scale tick frequency exponentially as time runs out (clamped 80ms - 400ms)
                        node.tickTimer = Math.max(80, Math.min(400, node.timeLeft * 0.28));
                    }
                }
                
                // Expiry retreat
                if (node.timeLeft <= 0) {
                    node.state = 'retreating';
                    
                    // Standard & Power nodes cause damage if they retreat undetected
                    if (node.type !== 'hazard') {
                        game.lives -= 1;
                        audio.playBuzz();
                        updateHUDVisuals();
                        
                        if (game.lives <= 0) {
                            gameOver();
                        }
                    }
                }
                break;
                
            case 'retreating':
                node.z -= delta * popSpeed;
                if (node.z <= -0.15) {
                    node.z = -0.15;
                    node.state = 'retracted';
                }
                break;
                
            case 'retracted':
            default:
                // No movement
                break;
        }

        // Apply updated Z position to A-Frame cylinder entity
        if (node.element) {
            node.element.setAttribute('position', `0 0 ${node.z}`);
        }
    });

    requestAnimationFrame(update);
}

// Trigger frame loop
requestAnimationFrame(update);

// Spawn a random core from retracted nodes
function spawnCore() {
    const retractedNodes = game.nodes.filter(n => n.state === 'retracted');
    if (retractedNodes.length === 0) {
        resetSpawnTimer();
        return;
    }

    // Pick random node
    const node = retractedNodes[Math.floor(Math.random() * retractedNodes.length)];
    
    // Choose core type: Standard (70%), Power (15%), Hazard (15%)
    const roll = Math.random();
    if (roll < 0.70) {
        node.type = 'standard';
        setCoreVisuals(node.element, '#ff007f'); // Pink
    } else if (roll < 0.85) {
        node.type = 'power';
        setCoreVisuals(node.element, '#39ff14'); // Green
    } else {
        node.type = 'hazard';
        setCoreVisuals(node.element, '#ff5e00'); // Orange
    }

    // Calculate dynamic duration based on current score
    // Difficulty curve: start at 1600ms active window, scaling down to 700ms at score 30
    const baseDur = Math.max(700, 1600 - game.score * 30);
    
    if (node.type === 'power') {
        node.duration = baseDur * 0.6; // 40% faster
    } else if (node.type === 'hazard') {
        node.duration = baseDur * 1.25; // 25% longer active window
    } else {
        node.duration = baseDur;
    }
    
    node.timeLeft = node.duration;
    node.tickTimer = 0; // beep immediately
    node.state = 'popping';

    resetSpawnTimer();
}

function setCoreVisuals(element, colorHex) {
    if (!element) return;
    element.setAttribute('color', colorHex);
    element.setAttribute('material', `color: ${colorHex}; emissive: ${colorHex}; emissiveIntensity: 0.6; roughness: 0.3; metalness: 0.3`);
}

function resetSpawnTimer() {
    // Spawning frequency scales down as score rises (starts at 1800ms, floor at 850ms)
    const baseInterval = Math.max(game.minSpawnInterval, game.baseSpawnInterval - game.score * 35);
    // Add minor random variation to spawn timings
    game.spawnTimer = baseInterval * (0.85 + Math.random() * 0.3);
}
