/**
 * Gravity Sorter - Core Game Logic
 * Physics-based puzzle sorting using WebXR/A-Frame and Web Audio synthesis.
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
        
        // Active beam hum parameters
        this.beamOsc = null;
        this.beamGain = null;
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

    // Deep cosmic hum drone
    startAmbience() {
        this.resume();
        if (!this.ctx || this.droneOsc1) return;

        const t = this.ctx.currentTime;
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0, t);
        this.droneGain.gain.linearRampToValueAtTime(0.05, t + 2.0); // slow fade-in
        this.droneGain.connect(this.ctx.destination);

        // C2 drone (65.41 Hz)
        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc1.type = 'sawtooth';
        this.droneOsc1.frequency.value = 65.41;
        
        // G2 drone (98.00 Hz) - perfect fifth detuned slightly for texture
        this.droneOsc2 = this.ctx.createOscillator();
        this.droneOsc2.type = 'sine';
        this.droneOsc2.frequency.value = 98.25;

        // Apply low pass filter to keep it deep and rumbling
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, t);

        this.droneOsc1.connect(filter);
        this.droneOsc2.connect(filter);
        filter.connect(this.droneGain);

        this.droneOsc1.start(t);
        this.droneOsc2.start(t);
    }

    stopAmbience() {
        if (this.droneGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.droneGain.gain.cancelScheduledValues(t);
            this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
            this.droneGain.gain.linearRampToValueAtTime(0, t + 1.0);
            
            setTimeout(() => {
                if (this.droneOsc1) { this.droneOsc1.stop(); this.droneOsc1 = null; }
                if (this.droneOsc2) { this.droneOsc2.stop(); this.droneOsc2 = null; }
                this.droneGain = null;
            }, 1100);
        }
    }

    // Dynamic gravity tractor beam sound
    startBeamHum() {
        this.resume();
        if (!this.ctx || this.beamOsc) return;

        const t = this.ctx.currentTime;
        this.beamGain = this.ctx.createGain();
        this.beamGain.gain.setValueAtTime(0.01, t);
        this.beamGain.connect(this.ctx.destination);

        this.beamOsc = this.ctx.createOscillator();
        this.beamOsc.type = 'triangle';
        this.beamOsc.frequency.setValueAtTime(140, t);
        
        // Add a tremolo LFO for crackle feel
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 35; // fast pulse
        lfoGain.gain.value = 25; // pitch modulation amplitude

        lfo.connect(lfoGain);
        lfoGain.connect(this.beamOsc.frequency);
        
        this.beamOsc.connect(this.beamGain);

        lfo.start(t);
        this.beamOsc.start(t);
    }

    // Modulate pitch and gain of the beam depending on debris distance (dist)
    updateBeamHum(dist) {
        if (!this.ctx || !this.beamOsc || !this.beamGain) return;
        
        const t = this.ctx.currentTime;
        // Closer distance -> higher frequency and louder volume
        // dist ranges roughly from 0.5m to 8.0m
        const clampedDist = Math.max(0.5, Math.min(8.0, dist));
        const normalized = 1.0 - (clampedDist - 0.5) / 7.5; // 0 (far) to 1 (close)
        
        const frequency = 120 + normalized * 240; // 120Hz to 360Hz
        const volume = 0.01 + normalized * 0.08; // quiet to intense hum
        
        this.beamOsc.frequency.setTargetAtTime(frequency, t, 0.05);
        this.beamGain.gain.setTargetAtTime(volume, t, 0.05);
    }

    stopBeamHum() {
        if (this.beamGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.beamGain.gain.setTargetAtTime(0, t, 0.08);
            setTimeout(() => {
                if (this.beamOsc) {
                    this.beamOsc.stop();
                    this.beamOsc = null;
                }
                this.beamGain = null;
            }, 150);
        }
    }

    playGrab() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);
        
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.16);
    }

    playFling() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Swoosh: descending pitch sweep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
        
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.21);
    }

    playChime() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Double cash register ring (C6 -> G6)
        const playRing = (freq, delay, vol) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            
            gain.gain.setValueAtTime(vol, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t + delay);
            osc.stop(t + delay + 0.26);
        };
        
        playRing(1046.50, 0, 0.08); // C6
        playRing(1567.98, 0.08, 0.06); // G6
    }

    playBuzz() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Low buzzy square/saw detune
        osc1.type = 'sawtooth';
        osc1.frequency.value = 95;
        osc2.type = 'square';
        osc2.frequency.value = 98;
        
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.45);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.46);
        osc2.stop(t + 0.46);
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    active: false,
    score: 0,
    sortedMass: 0,
    sortedCount: 0,
    timeLeft: 90,
    streak: 0,
    streakMultiplier: 1,
    highscore: parseInt(localStorage.getItem('gravity_sorter_highscore') || '0', 10),
    
    // Spawning parameters
    spawnInterval: 2000, // ms
    spawnTimer: 0,
    
    // Debris & particle collections
    debrisList: [],
    particles: [],
    
    // Grab states
    leftGrabbed: null,
    rightGrabbed: null,
    mouseGrabbed: null
};

// ==========================================
// 3. UI ELEMENT REFERENCES
// ==========================================
const UI = {
    // 2D overlays
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    // 2D HUD
    hud: document.getElementById('hud'),
    hudMass: document.getElementById('hud-mass-val'),
    hudScore: document.getElementById('hud-score-val'),
    hudTimer: document.getElementById('hud-time-val'),
    hudStreak: document.getElementById('hud-streak-val'),
    hudFeedback: document.getElementById('hud-feedback'),
    desktopInstruction: document.getElementById('desktop-instruction'),
    
    // 2D Stats
    statFinalCount: document.getElementById('stat-final-count'),
    statFinalMass: document.getElementById('stat-final-mass'),
    statFinalScore: document.getElementById('stat-final-score'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    // 3D VR Hologram HUD Text elements
    hud3dTime: document.getElementById('hud-3d-text-time'),
    hud3dScore: document.getElementById('hud-3d-text-score'),
    hud3dMass: document.getElementById('hud-3d-text-mass'),
    btn3dStart: document.getElementById('btn-3d-start'),
    
    // Containers in A-Frame
    debrisContainer: document.getElementById('debris-container'),
    starfield: document.getElementById('starfield'),
    camera: document.getElementById('camera'),
    leftController: document.getElementById('left-controller'),
    rightController: document.getElementById('right-controller'),
    
    // Laser beams
    beamLeft: document.getElementById('beam-left'),
    beamRight: document.getElementById('beam-right'),
    beamMouse: document.getElementById('beam-mouse')
};

let inVR = false;

// ==========================================
// 4. DEBRIS & PARTICLE CLASSES
// ==========================================

class Debris {
    constructor() {
        this.id = 'debris_' + Math.random().toString(36).substring(2, 9);
        this.grabbed = false;
        this.grabbedBy = null; // 'left', 'right', 'mouse'
        this.isFlung = false;
        
        // Types: fuel (Red), cell (Blue), isotope (Yellow)
        const types = ['fuel', 'cell', 'isotope'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        this.posHistory = [];
        this.initProperties();
        this.createElement();
    }

    initProperties() {
        // Red Fuel: cylinders
        if (this.type === 'fuel') {
            this.colorName = 'red';
            this.color = '#ff3366';
            this.shape = 'cylinder';
            this.mass = Math.floor(15 + Math.random() * 15); // 15 - 30kg
            this.width = 0.3;
            this.height = 0.45;
            this.depth = 0.3;
        } 
        // Blue Cell: boxes
        else if (this.type === 'cell') {
            this.colorName = 'blue';
            this.color = '#00ccff';
            this.shape = 'box';
            this.mass = Math.floor(10 + Math.random() * 15); // 10 - 25kg
            this.width = 0.35;
            this.height = 0.35;
            this.depth = 0.35;
        } 
        // Yellow Isotope: spheres
        else if (this.type === 'isotope') {
            this.colorName = 'yellow';
            this.color = '#ffcc00';
            this.shape = 'sphere';
            this.mass = Math.floor(25 + Math.random() * 25); // 25 - 50kg
            this.radius = 0.22;
        }

        // Spawn position far away (z = -8.5m to -10.0m)
        this.x = (Math.random() - 0.5) * 4.0; // x: -2.0 to 2.0
        this.y = 1.0 + Math.random() * 1.8;   // y: 1.0 to 2.8
        this.z = -8.5 - Math.random() * 1.5;
        
        // Initial drift velocity towards the salvage bay
        this.vx = (Math.random() - 0.5) * 0.5; // slight left/right
        this.vy = (Math.random() - 0.5) * 0.3; // slight up/down
        this.vz = 0.8 + Math.random() * 0.9;   // drift forward at 0.8 - 1.7 m/s
        
        // Spin rotations
        this.rx = Math.random() * 360;
        this.ry = Math.random() * 360;
        this.rz = Math.random() * 360;
        
        // Rotation speeds
        this.rvx = (Math.random() - 0.5) * 40;
        this.rvy = (Math.random() - 0.5) * 40;
        this.rvz = (Math.random() - 0.5) * 40;
    }

    createElement() {
        this.el = document.createElement(this.shape === 'sphere' ? 'a-sphere' : (this.shape === 'cylinder' ? 'a-cylinder' : 'a-box'));
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('class', 'debris');
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('rotation', `${this.rx} ${this.ry} ${this.rz}`);
        
        if (this.shape === 'sphere') {
            this.el.setAttribute('radius', this.radius);
        } else if (this.shape === 'cylinder') {
            this.el.setAttribute('radius', this.width / 2);
            this.el.setAttribute('height', this.height);
        } else {
            this.el.setAttribute('width', this.width);
            this.el.setAttribute('height', this.height);
            this.el.setAttribute('depth', this.depth);
        }

        // Materials setup - glow and metalness
        let roughness = 0.25;
        let metalness = 0.75;
        this.el.setAttribute('material', `shader: standard; color: ${this.color}; roughness: ${roughness}; metalness: ${metalness}; emissive: ${this.color}; emissiveIntensity: 0.25`);
        
        // Inner frame core for visuals
        if (this.shape === 'box') {
            const inner = document.createElement('a-box');
            inner.setAttribute('width', this.width * 0.8);
            inner.setAttribute('height', this.height * 0.8);
            inner.setAttribute('depth', this.depth * 0.8);
            inner.setAttribute('material', `shader: flat; color: #ffffff; opacity: 0.15; transparent: true`);
            this.el.appendChild(inner);
        }

        // Desktop mouse down trigger fallback
        this.el.addEventListener('mousedown', (evt) => {
            if (inVR) return; // ignore desktop mouse grab if player is in VR
            if (!this.grabbed && game.active) {
                this.grabbed = true;
                this.grabbedBy = 'mouse';
                game.mouseGrabbed = this;
                audio.playGrab();
                audio.startBeamHum();
            }
        });

        UI.debrisContainer.appendChild(this.el);
    }

    update(dt) {
        if (!this.el || !this.el.object3D) return;

        const pos = this.el.object3D.position;
        const rot = this.el.object3D.rotation;

        if (this.grabbed) {
            // Tractor attraction towards target anchor
            let anchor = new THREE.Vector3();
            
            if (this.grabbedBy === 'left') {
                UI.leftController.object3D.getWorldPosition(anchor);
            } else if (this.grabbedBy === 'right') {
                UI.rightController.object3D.getWorldPosition(anchor);
            } else {
                // Mouse fallback: anchor is a point 1.8m in front of camera
                const direction = new THREE.Vector3();
                UI.camera.object3D.getWorldDirection(direction);
                direction.multiplyScalar(-1.75); // negate and stretch
                const camPos = new THREE.Vector3();
                UI.camera.object3D.getWorldPosition(camPos);
                anchor.copy(camPos).add(direction);
            }

            // Lerp debris position to anchor point
            pos.lerp(anchor, 0.14); // smooth gravity tractor speed
            
            // Spin slowly while captured
            rot.y += 0.5 * dt;
            rot.x += 0.3 * dt;

            // Track spatial history for velocity launch
            this.posHistory.push({
                pos: pos.clone(),
                time: performance.now()
            });
            if (this.posHistory.length > 5) {
                this.posHistory.shift();
            }

            // Update dynamic audio hum pitch based on distance
            const controllerPos = new THREE.Vector3();
            if (this.grabbedBy === 'left') {
                UI.leftController.object3D.getWorldPosition(controllerPos);
            } else if (this.grabbedBy === 'right') {
                UI.rightController.object3D.getWorldPosition(controllerPos);
            } else {
                UI.camera.object3D.getWorldPosition(controllerPos);
            }
            const dist = pos.distanceTo(controllerPos);
            audio.updateBeamHum(dist);

            // Update laser beam visuals
            this.updateBeamVisual(controllerPos, pos);

        } else {
            // Free drift / physics movement
            if (this.isFlung) {
                // Apply Gravity and drag friction
                this.vy -= 8.5 * dt; // slow falling physics
                this.vx *= 0.985;
                this.vy *= 0.985;
                this.vz *= 0.985;
            }

            pos.x += this.vx * dt;
            pos.y += this.vy * dt;
            pos.z += this.vz * dt;

            rot.x += THREE.MathUtils.degToRad(this.rvx) * dt;
            rot.y += THREE.MathUtils.degToRad(this.rvy) * dt;
            rot.z += THREE.MathUtils.degToRad(this.rvz) * dt;

            // Out-of-bounds boundary cleanup
            // Falls down (y < -1.5) or drifts past player (z > 3.0) or too far right/left/away
            if (pos.y < -1.5 || pos.z > 3.0 || Math.abs(pos.x) > 10.0 || pos.z < -16.0) {
                this.missDebris();
            } else {
                // Check if inside any chute trigger zones
                this.checkChutes(pos);
            }
        }
    }

    updateBeamVisual(source, target) {
        let beamEl = null;
        if (this.grabbedBy === 'left') beamEl = UI.beamLeft;
        else if (this.grabbedBy === 'right') beamEl = UI.beamRight;
        else beamEl = UI.beamMouse;

        if (!beamEl) return;

        const distance = source.distanceTo(target);
        const midpoint = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5);

        beamEl.object3D.position.copy(midpoint);
        beamEl.object3D.scale.set(1, distance, 1);

        const direction = new THREE.Vector3().subVectors(target, source).normalize();
        const alignAxis = new THREE.Vector3(0, 1, 0); // cylinder points up natively
        const quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, direction);
        beamEl.object3D.quaternion.copy(quaternion);

        // Modulate opacity and radius scale for energy crackle
        const timeVal = performance.now();
        const opacity = 0.5 + Math.sin(timeVal * 0.035) * 0.15;
        const widthScale = 1.0 + Math.sin(timeVal * 0.05) * 0.2;
        beamEl.setAttribute('material', `opacity: ${opacity}`);
        beamEl.object3D.scale.x = widthScale;
        beamEl.object3D.scale.z = widthScale;
        beamEl.setAttribute('visible', 'true');
    }

    hideBeamVisual() {
        let beamEl = null;
        if (this.grabbedBy === 'left') beamEl = UI.beamLeft;
        else if (this.grabbedBy === 'right') beamEl = UI.beamRight;
        else beamEl = UI.beamMouse;

        if (beamEl) {
            beamEl.setAttribute('visible', 'false');
        }
    }

    fling() {
        this.grabbed = false;
        this.isFlung = true;
        this.hideBeamVisual();
        audio.stopBeamHum();

        if (this.posHistory.length >= 2) {
            const oldest = this.posHistory[0];
            const newest = this.posHistory[this.posHistory.length - 1];
            const elapsed = (newest.time - oldest.time) / 1000;

            if (elapsed > 0.015) {
                // Calculate directional velocity
                const velocityVec = new THREE.Vector3().subVectors(newest.pos, oldest.pos).multiplyScalar(1.0 / elapsed);
                
                // Add fling multiplier for extra punch
                velocityVec.multiplyScalar(1.35);
                
                // Clamp launch speed to reasonable values
                const speed = velocityVec.length();
                const maxSpeed = 16.0;
                if (speed > maxSpeed) {
                    velocityVec.normalize().multiplyScalar(maxSpeed);
                }

                this.vx = velocityVec.x;
                this.vy = velocityVec.y;
                this.vz = velocityVec.z;
                
                // Add random fling spin speed
                this.rvx = (Math.random() - 0.5) * 350;
                this.rvy = (Math.random() - 0.5) * 350;
                this.rvz = (Math.random() - 0.5) * 350;
            }
        }
        
        audio.playFling();
        this.grabbedBy = null;
    }

    checkChutes(pos) {
        // Red Chute position: (-1.8, 1.4, -2.6)
        const redChutePos = new THREE.Vector3(-1.8, 1.4, -2.6);
        // Blue Chute position: (1.8, 1.4, -2.6)
        const blueChutePos = new THREE.Vector3(1.8, 1.4, -2.6);
        // Yellow Chute position: (0, 0.45, -2.1)
        const yellowChutePos = new THREE.Vector3(0, 0.45, -2.1);

        const distRed = pos.distanceTo(redChutePos);
        const distBlue = pos.distanceTo(blueChutePos);
        const distYellow = pos.distanceTo(yellowChutePos);

        const triggerRadius = 0.55;

        if (distRed < triggerRadius) {
            this.evaluateSort('red', redChutePos);
        } else if (distBlue < triggerRadius) {
            this.evaluateSort('blue', blueChutePos);
        } else if (distYellow < triggerRadius) {
            this.evaluateSort('yellow', yellowChutePos);
        }
    }

    evaluateSort(chuteColor, centerPos) {
        if (!game.active) {
            this.destroy();
            return;
        }

        if (this.colorName === chuteColor) {
            // SUCCESSFUL SORT
            audio.playChime();
            
            game.streak++;
            if (game.streak >= 10) game.streakMultiplier = 3;
            else if (game.streak >= 5) game.streakMultiplier = 2;
            else game.streakMultiplier = 1;

            const scoreGained = 100 * game.streakMultiplier;
            game.score += scoreGained;
            game.sortedMass += this.mass;
            game.sortedCount++;

            showFeedback(`+${this.mass}kg`, 'success');
            spawnExplosion(centerPos, this.color);
            updateHUDVisuals();
        } else {
            // INCORRECT SORT PENALTY
            audio.playBuzz();
            
            game.streak = 0;
            game.streakMultiplier = 1;
            
            // Deduct 5 seconds from shifting timer
            game.timeLeft = Math.max(0, game.timeLeft - 5);
            
            showFeedback(`MISMATCH! -5s`, 'penalty');
            spawnExplosion(centerPos, '#ff3333'); // angry red blast
            updateHUDVisuals();
        }

        this.destroy();
    }

    missDebris() {
        // Silently clear out debris that drifted past or dropped out
        // Penalize streak since the operator let debris slip by
        if (game.active && this.z > 2.0) {
            game.streak = 0;
            game.streakMultiplier = 1;
            showFeedback('DEBRIS ESCAPED!', 'penalty');
            updateHUDVisuals();
        }
        this.destroy();
    }

    destroy() {
        this.hideBeamVisual();
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        const index = game.debrisList.indexOf(this);
        if (index !== -1) {
            game.debrisList.splice(index, 1);
        }
    }
}

class Particle {
    constructor(x, y, z, color) {
        this.id = 'part_' + Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = color;
        
        // Explode outward radially
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 1.0 + Math.random() * 3.5;
        
        this.vx = Math.sin(phi) * Math.cos(theta) * speed;
        this.vy = Math.sin(phi) * Math.sin(theta) * speed;
        this.vz = Math.cos(phi) * speed;
        
        this.life = 0.0;
        this.maxLife = 0.4 + Math.random() * 0.3; // 400 - 700ms
        this.scale = 1.0;
        
        this.createElement();
    }

    createElement() {
        this.el = document.createElement('a-sphere');
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('radius', 0.035);
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('material', `shader: flat; color: ${this.color}; opacity: 0.95; transparent: true`);
        
        UI.debrisContainer.appendChild(this.el);
    }

    update(dt) {
        this.life += dt;
        
        // Apply inertia friction and slight gravity pull
        this.vx *= 0.93;
        this.vy *= 0.93;
        this.vz *= 0.93;
        this.vy -= 1.8 * dt; // slow falling
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;

        const ratio = this.life / this.maxLife;
        this.scale = Math.max(0.01, 1.0 - ratio);
        const opacity = Math.max(0.01, 0.95 * (1.0 - ratio));

        this.el.object3D.position.set(this.x, this.y, this.z);
        this.el.object3D.scale.set(this.scale, this.scale, this.scale);
        this.el.setAttribute('material', 'opacity', opacity);

        if (this.life >= this.maxLife) {
            this.destroy();
        }
    }

    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        const index = game.particles.indexOf(this);
        if (index !== -1) {
            game.particles.splice(index, 1);
        }
    }
}

// ==========================================
// 5. INTERACTIVE FUNCTION HELPERS
// ==========================================

function spawnExplosion(pos, color) {
    const count = 18 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
        const p = new Particle(pos.x, pos.y, pos.z, color);
        game.particles.push(p);
    }
}

function showFeedback(text, type) {
    UI.hudFeedback.innerText = text;
    UI.hudFeedback.className = ''; // reset classes
    void UI.hudFeedback.offsetWidth; // trigger reflow
    
    if (type === 'success') {
        UI.hudFeedback.classList.add('show-success');
    } else {
        UI.hudFeedback.classList.add('show-penalty');
    }
    
    // Hide text after 1.2s
    setTimeout(() => {
        UI.hudFeedback.className = '';
    }, 1200);
}

function updateHUDVisuals() {
    // Standard format numbers
    const massStr = `${game.sortedMass} kg`;
    const scoreStr = String(game.score);
    const streakStr = `x${game.streakMultiplier}`;
    const timerStr = `${Math.ceil(game.timeLeft)}s`;

    // 2D screens overlay
    UI.hudMass.innerText = massStr;
    UI.hudScore.innerText = scoreStr;
    UI.hudStreak.innerText = streakStr;
    UI.hudTimer.innerText = timerStr;

    // 3D VR Hologram dashboard
    UI.hud3dTime.setAttribute('value', `SHIFT TIME: ${timerStr}`);
    UI.hud3dScore.setAttribute('value', `SCORE: ${scoreStr}`);
    UI.hud3dMass.setAttribute('value', `MASS: ${massStr} (STREAK: ${streakStr})`);
}

function flingDebris(debrisObj) {
    if (debrisObj) {
        debrisObj.fling();
    }
}

function spawnDebris() {
    const d = new Debris();
    game.debrisList.push(d);
}

function clearAllObjects() {
    // Clean remaining debris
    while (game.debrisList.length > 0) {
        game.debrisList[0].destroy();
    }
    // Clean remaining particles
    while (game.particles.length > 0) {
        game.particles[0].destroy();
    }
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ==========================================
// 6. CORE GAME STATE CONTROLS
// ==========================================

function startShift() {
    clearAllObjects();
    
    game.score = 0;
    game.sortedMass = 0;
    game.sortedCount = 0;
    game.timeLeft = 90.0;
    game.streak = 0;
    game.streakMultiplier = 1;
    game.active = true;
    
    // Reset spawn timers
    game.spawnInterval = 2000;
    game.spawnTimer = 500; // spawn first debris in 500ms
    
    // Hide UI cards
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    
    // Enable 3D green start button push feedback
    UI.btn3dStart.setAttribute('color', '#113311'); // dim out button while playing
    UI.btn3dStart.setAttribute('scale', '1 0.3 1');
    
    // Audio engine active
    audio.resume();
    audio.startAmbience();
    audio.playGrab();
    
    updateHUDVisuals();
}

function endShift() {
    game.active = false;
    audio.stopAmbience();
    audio.stopBeamHum();
    clearAllObjects();
    
    // Check local storage highscore
    let isNewRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('gravity_sorter_highscore', game.highscore);
        isNewRecord = true;
    }

    // Populate gameover scores
    UI.statFinalCount.innerText = `${game.sortedCount} items`;
    UI.statFinalMass.innerText = `${game.sortedMass} kg`;
    UI.statFinalScore.innerText = formatNumber(game.score);
    UI.statHighScore.innerText = formatNumber(game.highscore);
    
    if (isNewRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }

    // Reset 3D green start button
    UI.btn3dStart.setAttribute('color', '#00ff66');
    UI.btn3dStart.setAttribute('scale', '1 1 1');

    // Show gameover overlays
    UI.hud.classList.add('hidden');
    UI.panelGameOver.classList.remove('hidden');
}

// ==========================================
// 7. INPUT TRIGGER LISTENERS & CONTROLLER INTERFACE
// ==========================================

function getTargetedDebris(controllerEl) {
    if (controllerEl && controllerEl.components && controllerEl.components.raycaster) {
        const intersections = controllerEl.components.raycaster.intersections;
        if (intersections && intersections.length > 0) {
            for (let i = 0; i < intersections.length; i++) {
                const el = intersections[i].el;
                if (el && el.classList.contains('debris')) {
                    return el;
                }
            }
        }
    }
    return null;
}

function findDebrisByEl(el) {
    return game.debrisList.find(d => d.el === el);
}

function setupControllerEvents(controllerEl, handName) {
    const handleGrabStart = () => {
        if (!game.active) return;
        const target = getTargetedDebris(controllerEl);
        if (target) {
            const debrisObj = findDebrisByEl(target);
            if (debrisObj && !debrisObj.grabbed) {
                debrisObj.grabbed = true;
                debrisObj.grabbedBy = handName;
                if (handName === 'left') game.leftGrabbed = debrisObj;
                else game.rightGrabbed = debrisObj;
                
                audio.playGrab();
                audio.startBeamHum();
                
                // Haptics rumble if available
                triggerHapticFeedback(controllerEl, 0.7, 90);
            }
        }
    };

    const handleGrabEnd = () => {
        if (handName === 'left') {
            if (game.leftGrabbed) {
                flingDebris(game.leftGrabbed);
                game.leftGrabbed = null;
            }
        } else {
            if (game.rightGrabbed) {
                flingDebris(game.rightGrabbed);
                game.rightGrabbed = null;
            }
        }
    };

    controllerEl.addEventListener('triggerdown', handleGrabStart);
    controllerEl.addEventListener('triggerup', handleGrabEnd);
    controllerEl.addEventListener('gripdown', handleGrabStart);
    controllerEl.addEventListener('gripup', handleGrabEnd);
}

function triggerHapticFeedback(controllerEl, force, duration) {
    const gamepadComponent = controllerEl.components['tracked-controls-webxr'] || controllerEl.components['tracked-controls'];
    if (gamepadComponent && gamepadComponent.controller) {
        const gamepad = gamepadComponent.controller.gamepad;
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
            gamepad.hapticActuators[0].pulse(force, duration).catch(() => {});
        }
    }
}

// ==========================================
// 8. TICK LOOP RENDERER
// ==========================================

let lastFrameTime = performance.now();

function update(time) {
    const deltaMs = Math.min(50, time - lastFrameTime); // clamp dt lag spikes
    const deltaSeconds = deltaMs / 1000.0;
    lastFrameTime = time;

    if (game.active) {
        // Shift time decrease
        game.timeLeft -= deltaSeconds;
        if (game.timeLeft <= 0.0) {
            game.timeLeft = 0.0;
            endShift();
        }

        // Spawner cooldown ticking
        game.spawnTimer -= deltaMs;
        if (game.spawnTimer <= 0) {
            spawnDebris();
            
            // Speed up spawn interval based on sorted count (difficulty multiplier)
            const speedLevel = Math.min(25, game.sortedCount);
            const nextInterval = Math.max(850, game.spawnInterval - (speedLevel * 45));
            game.spawnTimer = nextInterval * (0.8 + Math.random() * 0.4); // organic spacing
        }

        // Periodically update the HUD timer and stats
        updateHUDVisuals();
    }

    // Update active debris (backwards iteration due to splicing)
    for (let i = game.debrisList.length - 1; i >= 0; i--) {
        game.debrisList[i].update(deltaSeconds);
    }

    // Update active explosion particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
        game.particles[i].update(deltaSeconds);
    }

    requestAnimationFrame(update);
}

// ==========================================
// 9. ON DOM LOAD INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Populate 120 star points in background
    const starfield = UI.starfield;
    if (starfield) {
        for (let i = 0; i < 120; i++) {
            const star = document.createElement('a-sphere');
            const dist = 15 + Math.random() * 12;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            const sx = Math.sin(phi) * Math.cos(theta) * dist;
            const sy = Math.sin(phi) * Math.sin(theta) * dist;
            // Spawn stars mostly in front of player
            const sz = -5 - Math.random() * 20;

            star.setAttribute('radius', 0.02 + Math.random() * 0.05);
            star.setAttribute('position', `${sx} ${sy} ${sz}`);
            star.setAttribute('material', 'shader: flat; color: #ffffff; opacity: 0.8');
            starfield.appendChild(star);
        }
    }

    // Setup A-Scene details
    const sceneEl = document.querySelector('a-scene');
    
    // VR entry/exit detection
    sceneEl.addEventListener('enter-vr', () => {
        inVR = true;
        const gaze = document.getElementById('gaze-reticle');
        if (gaze) gaze.setAttribute('visible', 'false');
        UI.desktopInstruction.classList.add('hidden');
    });

    sceneEl.addEventListener('exit-vr', () => {
        inVR = false;
        const gaze = document.getElementById('gaze-reticle');
        if (gaze) gaze.setAttribute('visible', 'true');
        if (game.active) {
            UI.desktopInstruction.classList.remove('hidden');
        }
    });

    // 2D Button triggers
    UI.btnStart.addEventListener('click', () => {
        startShift();
        if (!inVR) {
            UI.desktopInstruction.classList.remove('hidden');
        }
    });

    UI.btnRestart.addEventListener('click', () => {
        startShift();
        if (!inVR) {
            UI.desktopInstruction.classList.remove('hidden');
        }
    });

    // 3D Hangar Console start button trigger
    UI.btn3dStart.addEventListener('click', () => {
        if (!game.active) {
            startShift();
            if (!inVR) {
                UI.desktopInstruction.classList.remove('hidden');
            }
        }
    });

    // Setup VR controllers trigger bindings
    setupControllerEvents(UI.leftController, 'left');
    setupControllerEvents(UI.rightController, 'right');

    // Desktop Mouse Grab Release fallback
    window.addEventListener('mouseup', () => {
        if (game.mouseGrabbed) {
            flingDebris(game.mouseGrabbed);
            game.mouseGrabbed = null;
        }
    });

    // Kickoff frame loop
    requestAnimationFrame(update);
});
