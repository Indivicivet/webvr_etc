/**
 * Gaze Audio Conductor (Game 0006)
 * Fully gaze-driven musical mix game using A-Frame VR and Web Audio API Synthesis.
 */

// ==========================================
// 1. SYNTHESIZED WEB AUDIO ENGINE
// ==========================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.schedulerTimerId = null;
        
        // Tempo & Timing
        this.bpm = 126;
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.barCount = 0;
        this.scheduleAheadTime = 0.12; // Schedule notes 120ms ahead
        this.lookahead = 30.0;         // Poll every 30ms

        // Dynamic Tracks Routing
        this.tracks = {
            drums: { gainNode: null, filterNode: null, maxVol: 0.85 },
            bass: { gainNode: null, filterNode: null, maxVol: 0.80 },
            synth: { gainNode: null, filterNode: null, maxVol: 0.70 },
            lead: { gainNode: null, filterNode: null, maxVol: 0.65 }
        };

        // Master Output
        this.masterGain = null;
        this.delayNode = null; // Reverb/Delay line for the Lead track
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) return;
        
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Setup Noise Buffer for Drums (Hihat / Snare)
        const bufferSize = this.ctx.sampleRate * 2.0;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Setup Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Setup Delay Node for Lead Channel
        this.delayNode = this.ctx.createDelay(1.0);
        this.delayFeedback = this.ctx.createGain();
        
        // 8th note delay time at 126 BPM = (60 / 126) / 2 = 0.238 seconds
        this.delayNode.delayTime.setValueAtTime(0.238, this.ctx.currentTime);
        this.delayFeedback.gain.setValueAtTime(0.42, this.ctx.currentTime);
        
        // Connect Delay loop
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);

        // Initialize gain and filter for each track
        Object.keys(this.tracks).forEach(name => {
            const track = this.tracks[name];
            
            track.gainNode = this.ctx.createGain();
            track.filterNode = this.ctx.createBiquadFilter();
            track.filterNode.type = 'lowpass';
            
            // Set initial state: muted, filtered closed (except drums which is slightly audible)
            const initialVol = (name === 'drums') ? 0.15 : 0.0;
            track.gainNode.gain.setValueAtTime(initialVol, this.ctx.currentTime);
            track.filterNode.frequency.setValueAtTime(280, this.ctx.currentTime);
            
            // Connect track: Source -> Filter -> Gain -> Master
            track.filterNode.connect(track.gainNode);
            
            // Connect Lead specifically through the delay line
            if (name === 'lead') {
                track.gainNode.connect(this.masterGain);
                
                // Also send Lead to Delay
                const delaySend = this.ctx.createGain();
                delaySend.gain.setValueAtTime(0.35, this.ctx.currentTime);
                track.gainNode.connect(delaySend);
                delaySend.connect(this.delayNode);
                this.delayNode.connect(this.masterGain);
            } else {
                track.gainNode.connect(this.masterGain);
            }
        });
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startLoop() {
        this.resume();
        if (this.schedulerTimerId) return;

        this.nextNoteTime = this.ctx.currentTime;
        this.currentStep = 0;
        this.barCount = 0;
        
        const schedulerTick = () => {
            while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
                this.scheduleStep(this.currentStep, this.nextNoteTime);
                
                // Increment Step (16th notes loop)
                const secondsPerBeat = 60.0 / this.bpm;
                this.nextNoteTime += 0.25 * secondsPerBeat;
                
                this.currentStep++;
                if (this.currentStep >= 16) {
                    this.currentStep = 0;
                    this.barCount++;
                }
            }
            this.schedulerTimerId = setTimeout(schedulerTick, this.lookahead);
        };
        
        schedulerTick();
    }

    stopLoop() {
        if (this.schedulerTimerId) {
            clearTimeout(this.schedulerTimerId);
            this.schedulerTimerId = null;
        }
    }

    // Dynamic parameter updates based on gaze
    updateTrackVolume(name, isActive) {
        if (!this.ctx) return;
        const track = this.tracks[name];
        const t = this.ctx.currentTime;
        
        // Target values
        let targetVol = isActive ? track.maxVol : 0.02;
        if (name === 'drums' && !isActive) targetVol = 0.15; // Drums always slightly audible

        const targetFreq = isActive ? 16000 : 280;
        
        // Ramping speeds: faster ramp-up (tc 0.08s) than ramp-down (tc 0.6s)
        const volTimeConstant = isActive ? 0.06 : 0.45;
        const filterTimeConstant = isActive ? 0.08 : 0.40;
        
        track.gainNode.gain.setTargetAtTime(targetVol, t, volTimeConstant);
        track.filterNode.frequency.setTargetAtTime(targetFreq, t, filterTimeConstant);
    }

    // Schedule Synth Triggers
    scheduleStep(step, time) {
        // Only trigger synth components if the track has some audible volume
        if (game.currentVolume.drums > 0.03) {
            this.triggerDrums(step, time);
        }
        if (game.currentVolume.bass > 0.03) {
            this.triggerBass(step, time);
        }
        if (game.currentVolume.synth > 0.03) {
            this.triggerSynth(step, time);
        }
        if (game.currentVolume.lead > 0.03) {
            this.triggerLead(step, time);
        }
    }

    // 1. DRUMS SYNTHESIS
    triggerDrums(step, time) {
        // Kick: steps 0, 4, 8, 12
        if (step === 0 || step === 4 || step === 8 || step === 12) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.frequency.setValueAtTime(130, time);
            osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
            
            gain.gain.setValueAtTime(1.0, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
            
            osc.connect(gain);
            gain.connect(this.tracks.drums.filterNode);
            
            osc.start(time);
            osc.stop(time + 0.12);

            // Trigger visual beat pulse
            this.triggerVisualPulse('drums');
        }

        // Hi-Hat: off-beat open hat on 2, 6, 10, 14. Closed hat on others.
        if (step % 2 === 0) {
            const isOpen = (step === 2 || step === 6 || step === 10 || step === 14);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(7500, time);
            
            const gain = this.ctx.createGain();
            const vol = isOpen ? 0.12 : 0.06;
            const decay = isOpen ? 0.16 : 0.04;
            
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.tracks.drums.filterNode);
            
            noise.start(time);
            noise.stop(time + decay + 0.01);
        }

        // Snare / Clap: steps 4 and 12 (backbeat)
        if (step === 4 || step === 12) {
            // Noise component
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100, time);
            filter.Q.setValueAtTime(2.0, time);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.25, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.tracks.drums.filterNode);
            
            noise.start(time);
            noise.stop(time + 0.15);

            // Sine body component
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.frequency.setValueAtTime(175, time);
            
            oscGain.gain.setValueAtTime(0.18, time);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
            
            osc.connect(oscGain);
            oscGain.connect(this.tracks.drums.filterNode);
            osc.start(time);
            osc.stop(time + 0.09);
        }
    }

    // 2. ACID BASS SYNTHESIS
    triggerBass(step, time) {
        // Syncopated 16-step bassline pattern
        // Groove: X . . X . . X . X . X X . . X . (1, 4, 7, 9, 11, 12, 15)
        const bassPattern = [true, false, false, true, false, false, true, false, true, false, true, true, false, false, true, false];
        if (!bassPattern[step]) return;

        // C Minor Chord Roots: Cm (C), Ab (Ab), Eb (Eb), Bb (Bb)
        const roots = [
            32.70, // C1 (for C2, multiply by 2 = 65.41 Hz)
            25.96, // Ab0 (for Ab1 = 51.91 Hz)
            38.89, // Eb1 (for Eb2 = 77.78 Hz)
            29.14  // Bb0 (for Bb1 = 58.27 Hz)
        ];
        
        const activeChordIdx = this.barCount % 4;
        const baseFreq = roots[activeChordIdx] * 2.0; // Play in octave 2

        // Synthesize Bass Note
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, time);
        
        // Sweeping filter envelope for acid/squelchy feel
        bassFilter.type = 'lowpass';
        bassFilter.Q.setValueAtTime(5.0, time);
        bassFilter.frequency.setValueAtTime(750, time);
        bassFilter.frequency.exponentialRampToValueAtTime(180, time + 0.13);
        
        oscGain.gain.setValueAtTime(0.48, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        
        osc.connect(bassFilter);
        bassFilter.connect(oscGain);
        oscGain.connect(this.tracks.bass.filterNode);
        
        osc.start(time);
        osc.stop(time + 0.18);

        this.triggerVisualPulse('bass');
    }

    // 3. RETRO CHORD PAD SYNTHESIS
    triggerSynth(step, time) {
        // Chord hits on: step 0 (long), step 6 (short), step 8 (med), step 14 (short)
        const padHits = [
            { trigger: 0, duration: 0.65 },
            { trigger: 6, duration: 0.20 },
            { trigger: 8, duration: 0.45 },
            { trigger: 14, duration: 0.20 }
        ];

        const hit = padHits.find(h => h.trigger === step);
        if (!hit) return;

        // Define lush chord structures in octave 3
        const chords = [
            [130.81, 155.56, 196.00, 261.63], // Cm: C3, Eb3, G3, C4
            [103.83, 130.81, 155.56, 207.65], // Ab: Ab2, C3, Eb3, Ab3
            [155.56, 196.00, 233.08, 311.13], // Eb: Eb3, G3, Bb3, Eb4
            [116.54, 146.83, 174.61, 233.08]  // Bb: Bb2, D3, F3, Bb3
        ];

        const chordNotes = chords[this.barCount % 4];
        
        // Play chord (trigger 4 oscillators detuned in pairs)
        chordNotes.forEach(freq => {
            // Pair 1: -6 cents
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(freq, time);
            osc1.detune.setValueAtTime(-6, time);
            
            // Pair 2: +6 cents
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq, time);
            osc2.detune.setValueAtTime(6, time);

            const attack = 0.08;
            const release = 0.15;
            
            // Envelope setup
            gain1.gain.setValueAtTime(0, time);
            gain1.gain.linearRampToValueAtTime(0.18, time + attack);
            gain1.gain.setValueAtTime(0.18, time + hit.duration - release);
            gain1.gain.exponentialRampToValueAtTime(0.001, time + hit.duration);
            
            gain2.gain.setValueAtTime(0, time);
            gain2.gain.linearRampToValueAtTime(0.18, time + attack);
            gain2.gain.setValueAtTime(0.18, time + hit.duration - release);
            gain2.gain.exponentialRampToValueAtTime(0.001, time + hit.duration);
            
            osc1.connect(gain1);
            osc2.connect(gain2);
            gain1.connect(this.tracks.synth.filterNode);
            gain2.connect(this.tracks.synth.filterNode);
            
            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + hit.duration + 0.02);
            osc2.stop(time + hit.duration + 0.02);
        });

        this.triggerVisualPulse('synth');
    }

    // 4. SPACIOUS PENTATONIC LEAD MELODY
    triggerLead(step, time) {
        // Melodic lead sequencer - play on steps: 0, 3, 6, 8, 11, 14
        const melodySteps = [
            { step: 0, noteIdx: 0 },
            { step: 3, noteIdx: 1 },
            { step: 6, noteIdx: 2 },
            { step: 8, noteIdx: 3 },
            { step: 11, noteIdx: 4 },
            { step: 14, noteIdx: 5 }
        ];

        const currentMelody = melodySteps.find(m => m.step === step);
        if (!currentMelody) return;

        // Compose a 4-bar shifting pentatonic melody in C minor
        // Notes: C4, D4, Eb4, F4, G4, Bb4, C5, D5, Eb5, F5, G5, Bb5, C6
        const pentatonicScale = [
            261.63, 293.66, 311.13, 349.23, 392.00, 466.16, // Octave 4
            523.25, 587.33, 622.25, 698.46, 783.99, 932.33, // Octave 5
            1046.50                                         // C6
        ];

        // Structured melody patterns per chord bar
        const melodyPhrases = [
            [6, 8, 10, 9, 8, 6],    // Bar 1 (Cm): C5, Eb5, G5, F5, Eb5, C5
            [8, 10, 11, 10, 8, 6],  // Bar 2 (Ab): Eb5, G5, Bb5, G5, Eb5, C5
            [10, 11, 12, 11, 10, 8],// Bar 3 (Eb): G5, Bb5, C6, Bb5, G5, Eb5
            [9, 10, 11, 10, 9, 7]    // Bar 4 (Bb): F5, G5, Bb5, G5, F5, D5
        ];

        const activePhrase = melodyPhrases[this.barCount % 4];
        const noteIdx = activePhrase[currentMelody.noteIdx];
        const targetFreq = pentatonicScale[noteIdx];

        // Synthesize Lead Note
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const leadFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(targetFreq, time);
        osc1.detune.setValueAtTime(-8, time);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(targetFreq, time);
        osc2.detune.setValueAtTime(8, time);

        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(1800, time);
        leadFilter.Q.setValueAtTime(1.5, time);

        const duration = 0.22;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(leadFilter);
        osc2.connect(leadFilter);
        leadFilter.connect(gain);
        gain.connect(this.tracks.lead.filterNode);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.02);
        osc2.stop(time + duration + 0.02);

        this.triggerVisualPulse('lead');
    }

    // Trigger visual pulse state
    triggerVisualPulse(trackName) {
        // Sets a beat visual flag checked by A-Frame frame loop
        game.beatPulseTriggered[trackName] = true;
    }

    // Interactive fanfares
    playChime() {
        this.resume();
        const t = this.ctx.currentTime;
        // Ascending major arpeggio
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(t);
            osc.stop(noteStart + 0.26);
        });
    }

    playStartFanfare() {
        this.resume();
        const t = this.ctx.currentTime;
        // Cyberpunk synth chords: C4, Eb4, G4, Bb4, C5
        const chord = [261.63, 311.13, 392.00, 466.16, 523.25];
        
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.08;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(t);
            osc.stop(noteStart + 0.42);
        });
    }

    playGameOverFanfare() {
        this.resume();
        const t = this.ctx.currentTime;
        // Depressive descending chord: Bb4, Gb4, D4, Bb3
        const chord = [466.16, 369.99, 293.66, 233.08];
        
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + idx * 0.12;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(t);
            osc.stop(noteStart + 0.52);
        });
    }

    playBuzz() {
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.35;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(105, t);
        osc.frequency.linearRampToValueAtTime(80, t + duration);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + duration + 0.01);
    }
}

const audio = new AudioEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    // Game States: 'MENU', 'PLAYING', 'GAMEOVER'
    state: 'MENU',
    
    // Play Modes: 'CHALLENGE', 'JAM'
    mode: 'CHALLENGE',
    
    score: 0,
    combo: 1,
    recipesCompleted: 0,
    timeRemaining: 45,
    highScore: parseInt(localStorage.getItem('gaze_conductor_highscore') || '0', 10),
    
    // Active Gaze Check
    gazeState: {
        drums: false,
        bass: false,
        synth: false,
        lead: false
    },
    
    // Track Volume Modeler (Interpolated values matching the audio nodes for gameplay checks)
    currentVolume: {
        drums: 0.15, // Starts slightly audible
        bass: 0,
        synth: 0,
        lead: 0
    },

    // Beat Pulse states
    beatPulseTriggered: {
        drums: false,
        bass: false,
        synth: false,
        lead: false
    },

    // Current target mix recipe
    currentRecipe: null,
    harmonyMeter: 0, // 0 to 100
    mismatchTimer: 0, // tracks how long a recipe is incorrect to reset combo

    // Time tracks
    lastTime: 0
};

// Challenge recipes definition
const RECIPES = [
    { name: "DRUMS + BASS", active: ['drums', 'bass'], inactive: ['synth', 'lead'] },
    { name: "DRUMS + SYNTH", active: ['drums', 'synth'], inactive: ['bass', 'lead'] },
    { name: "DRUMS + LEAD", active: ['drums', 'lead'], inactive: ['bass', 'synth'] },
    { name: "BASS + SYNTH", active: ['bass', 'synth'], inactive: ['drums', 'lead'] },
    { name: "SYNTH + LEAD", active: ['synth', 'lead'], inactive: ['drums', 'bass'] },
    { name: "DRUMS + BASS + SYNTH", active: ['drums', 'bass', 'synth'], inactive: ['lead'] },
    { name: "DRUMS + BASS + LEAD", active: ['drums', 'bass', 'lead'], inactive: ['synth'] },
    { name: "DRUMS + SYNTH + LEAD", active: ['drums', 'synth', 'lead'], inactive: ['bass'] },
    { name: "ALL STEMS", active: ['drums', 'bass', 'synth', 'lead'], inactive: [] }
];

// ==========================================
// 3. UI SCREEN TRANSITIONS
// ==========================================
const UI = {
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    hud: document.getElementById('hud'),
    vrStatusMsg: document.getElementById('vr-status-msg'),

    scoreVal: document.getElementById('hud-score-val'),
    comboVal: document.getElementById('hud-combo-val'),
    timerVal: document.getElementById('hud-timer-val'),
    recipeStems: document.getElementById('recipe-stems'),
    recipeTitle: document.getElementById('recipe-mode-label'),
    meterFill: document.getElementById('harmony-fill'),
    harmonyPercent: document.getElementById('harmony-percent'),
    meterLabel: document.getElementById('meter-label'),

    finalScore: document.getElementById('stat-final-score'),
    recipesCount: document.getElementById('stat-recipes-count'),
    highScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),

    init() {
        // Start buttons
        document.getElementById('btn-start-challenge').addEventListener('click', () => this.startGame('CHALLENGE'));
        document.getElementById('btn-start-jam').addEventListener('click', () => this.startGame('JAM'));
        
        // Restart & Exit buttons
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame(game.mode));
        document.getElementById('btn-hud-exit').addEventListener('click', () => this.exitToMenu());
        
        this.updateVRStatus();
    },

    async updateVRStatus() {
        if ('xr' in navigator) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-vr');
                if (supported) {
                    this.vrStatusMsg.textContent = "⚡ VR Ready! Enter VR at bottom-right or play on desktop.";
                    this.vrStatusMsg.style.color = "#39ff14";
                } else {
                    this.vrStatusMsg.textContent = "💻 VR hardware not detected. Play on desktop.";
                    this.vrStatusMsg.style.color = "#a39cb8";
                }
            } catch (err) {
                this.vrStatusMsg.textContent = "💻 Play in standard Desktop Mode.";
                this.vrStatusMsg.style.color = "#a39cb8";
            }
        } else {
            this.vrStatusMsg.textContent = "🌐 WebXR not supported. Playing on Desktop.";
            this.vrStatusMsg.style.color = "#a39cb8";
        }
    },

    startGame(mode) {
        audio.resume();
        audio.startLoop();
        audio.playStartFanfare();

        game.state = 'PLAYING';
        game.mode = mode;
        game.score = 0;
        game.combo = 1;
        game.recipesCompleted = 0;
        game.timeRemaining = 45;
        game.harmonyMeter = 0;
        game.mismatchTimer = 0;

        // Reset gaze
        Object.keys(game.gazeState).forEach(k => {
            game.gazeState[k] = false;
            audio.updateTrackVolume(k, false);
        });

        // UI toggles
        this.panelStart.classList.add('hidden');
        this.panelGameOver.classList.add('hidden');
        this.hud.classList.remove('hidden');

        // Setup HUD display for Modes
        if (mode === 'JAM') {
            this.recipeTitle.textContent = "Free Jam Studio";
            this.recipeStems.textContent = "Look around to mix tracks";
            this.meterLabel.textContent = "Mix Level";
            this.timerVal.parentElement.style.opacity = '0';
            this.scoreVal.parentElement.style.opacity = '0';
            this.harmonyPercent.textContent = "100%";
            this.meterFill.style.width = "100%";
            this.meterFill.style.background = "linear-gradient(90deg, #a300ff, #00f0ff)";
            
            // Hide target badges
            document.getElementById('recipe-badges').style.display = 'none';
        } else {
            this.recipeTitle.textContent = "Active Target";
            this.meterLabel.textContent = "Harmony Match";
            this.timerVal.parentElement.style.opacity = '1';
            this.scoreVal.parentElement.style.opacity = '1';
            this.meterFill.style.background = "linear-gradient(90deg, #a300ff, #39ff14)";
            document.getElementById('recipe-badges').style.display = 'flex';
            
            this.selectNewRecipe();
            this.updateHUD();
        }

        // Start countdown timer if challenge
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (mode === 'CHALLENGE') {
            this.timerInterval = setInterval(() => {
                if (game.state === 'PLAYING') {
                    game.timeRemaining--;
                    this.timerVal.textContent = `0:${game.timeRemaining.toString().padStart(2, '0')}`;
                    
                    if (game.timeRemaining <= 10) {
                        this.timerVal.classList.add('timer-pulse');
                    } else {
                        this.timerVal.classList.remove('timer-pulse');
                    }

                    if (game.timeRemaining <= 0) {
                        this.endGame();
                    }
                }
            }, 1000);
        }
    },

    selectNewRecipe() {
        let next;
        do {
            next = RECIPES[Math.floor(Math.random() * RECIPES.length)];
        } while (game.currentRecipe && next.name === game.currentRecipe.name);

        game.currentRecipe = next;
        this.recipeStems.textContent = next.name;

        // Reset badge highlights
        ['drums', 'bass', 'synth', 'lead'].forEach(name => {
            const badge = document.getElementById(`badge-${name}`);
            if (next.active.includes(name)) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        });
    },

    updateHUD() {
        this.scoreVal.textContent = game.score.toString().padStart(4, '0');
        this.comboVal.textContent = `x${game.combo}`;
        this.timerVal.textContent = `0:${game.timeRemaining.toString().padStart(2, '0')}`;
        
        this.harmonyPercent.textContent = `${Math.floor(game.harmonyMeter)}%`;
        this.meterFill.style.width = `${game.harmonyMeter}%`;
    },

    endGame() {
        game.state = 'GAMEOVER';
        audio.stopLoop();
        audio.playGameOverFanfare();
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Save high score if higher
        let newRecord = false;
        if (game.score > game.highScore) {
            game.highScore = game.score;
            localStorage.setItem('gaze_conductor_highscore', game.highScore);
            newRecord = true;
        }

        // Display stats
        this.finalScore.textContent = game.score;
        this.recipesCount.textContent = game.recipesCompleted;
        this.highScore.textContent = game.highScore;
        
        if (newRecord) {
            this.newRecordIndicator.classList.remove('hidden');
        } else {
            this.newRecordIndicator.classList.add('hidden');
        }

        // UI swaps
        this.hud.classList.add('hidden');
        this.panelGameOver.classList.remove('hidden');
    },

    exitToMenu() {
        game.state = 'MENU';
        audio.stopLoop();
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.hud.classList.add('hidden');
        this.panelGameOver.classList.add('hidden');
        this.panelStart.classList.remove('hidden');
    }
};

// ==========================================
// 4. FLOATING CYBERDUST PARTICLES
// ==========================================
let dustParticles = [];
function initParticles() {
    const dustContainer = document.querySelector('#dust-container');
    const count = 55;
    dustParticles = [];

    // Clear any existing elements
    dustContainer.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('a-entity');
        
        // Arrange particles in a cylinder volume around center
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.8 + Math.random() * 5.0;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const y = Math.random() * 4.5;
        
        particle.setAttribute('position', { x: x, y: y, z: z });
        
        // 3D shapes: spheres or octahedrons
        particle.setAttribute('geometry', {
            primitive: Math.random() > 0.5 ? 'octahedron' : 'sphere',
            radius: 0.015 + Math.random() * 0.025
        });
        
        const colors = ['#ff0055', '#00f0ff', '#a300ff', '#ffbb00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.setAttribute('material', {
            color: color,
            emissive: color,
            emissiveIntensity: 0.6,
            shader: 'flat',
            transparent: true,
            opacity: 0.15 + Math.random() * 0.35
        });
        
        dustContainer.appendChild(particle);
        dustParticles.push({
            el: particle,
            pos: { x: x, y: y, z: z },
            speed: 0.12 + Math.random() * 0.22,
            driftSpeed: 0.3 + Math.random() * 0.5,
            driftAxis: Math.random() * Math.PI
        });
    }
}

// ==========================================
// 5. CANVAS CORE GRID GENERATOR
// ==========================================
function generateGridFloor() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Core ground background
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw neon purple grid
    ctx.strokeStyle = '#a300ff';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.25;
    
    const step = 64;
    for (let x = 0; x <= 512; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, x);
        ctx.lineTo(512, x);
        ctx.stroke();
    }
    
    // Draw cyan highlight dots at intersection lines
    ctx.fillStyle = '#00f0ff';
    ctx.globalAlpha = 0.45;
    for (let x = 0; x <= 512; x += step) {
        for (let y = 0; y <= 512; y += step) {
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Create Three.js texture repeats
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    
    // Apply grid texture to plane
    const floorEl = document.querySelector('#grid-floor');
    if (floorEl) {
        const mesh = floorEl.getObject3D('mesh');
        if (mesh && mesh.material) {
            mesh.material.map = texture;
            mesh.material.needsUpdate = true;
        }
    }
}

// ==========================================
// 6. MAIN ANIMATION & GAME LOGIC TICK
// ==========================================
function registerFrameTick() {
    // We bind to A-Frame's animation loop using requestAnimationFrame
    const tick = (time) => {
        requestAnimationFrame(tick);
        
        if (!game.lastTime) game.lastTime = time;
        const dt = (time - game.lastTime) / 1000.0; // convert to seconds
        game.lastTime = time;
        
        // Prevent massive jumps on tab out
        if (dt > 0.1) return;

        // 1. Interpolate Volumes to track Gaze States
        ['drums', 'bass', 'synth', 'lead'].forEach(name => {
            let targetVol = game.gazeState[name] ? 1.0 : 0.0;
            if (name === 'drums' && !game.gazeState[name]) targetVol = 0.15; // drums floor
            
            const speed = game.gazeState[name] ? 5.5 : 0.65; // quicker fade-in than fade-out
            game.currentVolume[name] += (targetVol - game.currentVolume[name]) * speed * dt;
            
            // Bounds check
            if (game.currentVolume[name] < 0) game.currentVolume[name] = 0;
            if (game.currentVolume[name] > 1) game.currentVolume[name] = 1;
        });

        // 2. Animate spotlights sweeping
        const spotlightLeft = document.querySelector('#spotlight-left-beam');
        const spotlightRight = document.querySelector('#spotlight-right-beam');
        
        if (spotlightLeft) {
            const angleY = 30 + Math.sin(time * 0.0008) * 25;
            const angleX = 40 + Math.cos(time * 0.0005) * 6;
            spotlightLeft.setAttribute('rotation', { x: angleX, y: angleY, z: 0 });
        }
        if (spotlightRight) {
            const angleY = -30 + Math.sin(time * 0.0007 + 1.6) * 25;
            const angleX = 40 + Math.cos(time * 0.0006 + 0.4) * 6;
            spotlightRight.setAttribute('rotation', { x: angleX, y: angleY, z: 0 });
        }

        // 3. Animate floaty cyberdust
        dustParticles.forEach(p => {
            p.pos.y += p.speed * dt;
            p.pos.x += Math.sin(time * 0.001 * p.driftSpeed + p.driftAxis) * 0.003;
            p.pos.z += Math.cos(time * 0.001 * p.driftSpeed + p.driftAxis) * 0.003;
            
            // Loop particles back to bottom
            if (p.pos.y > 4.5) {
                p.pos.y = 0.05;
            }
            p.el.setAttribute('position', p.pos);
        });

        // 4. Update and animate Floating Instrument Nodes
        animateInstrumentNodes(time, dt);

        // 5. Game Logic matching (Only in Challenge Play mode)
        if (game.state === 'PLAYING' && game.mode === 'CHALLENGE') {
            checkChallengeRecipes(dt);
        }
    };
    
    requestAnimationFrame(tick);
}

// Dynamic node rotations, floating movements, and beat spikes
function animateInstrumentNodes(time, dt) {
    const tSec = time * 0.001;

    // --- DRUMS NODE ---
    const drumsMesh = document.querySelector('#node-drums-mesh');
    if (drumsMesh) {
        // Base scale: 0.32. Hover target: 0.40
        let target = game.gazeState.drums ? 0.40 : 0.32;
        let s = drumsMesh.getAttribute('scale');
        
        // If beat triggered, spike scale
        if (game.beatPulseTriggered.drums) {
            s.x = 0.56;
            s.y = 0.56;
            s.z = 0.56;
            game.beatPulseTriggered.drums = false; // Reset flag
        }
        
        // Interpolate scale back to target
        let nextS = s.x + (target - s.x) * 6.5 * dt;
        drumsMesh.setAttribute('scale', { x: nextS, y: nextS, z: nextS });

        // Hovered spin speed
        let r = drumsMesh.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        let spinSpeed = game.gazeState.drums ? 130 : 25;
        drumsMesh.setAttribute('rotation', { x: r.x + spinSpeed * dt, y: r.y + spinSpeed * dt * 1.3, z: r.z });

        // Update floor glow ring opacity and radius
        const ring = document.querySelector('#ring-drums');
        if (ring) {
            const opacity = game.gazeState.drums ? 0.7 : 0.2;
            const rOuter = game.gazeState.drums ? 0.48 : 0.42;
            ring.setAttribute('material', 'opacity', opacity);
            ring.setAttribute('radius-outer', rOuter);
        }
    }

    // --- BASS NODE ---
    const bassMesh = document.querySelector('#node-bass-mesh');
    if (bassMesh) {
        let target = game.gazeState.bass ? 1.25 : 1.0;
        let s = bassMesh.getAttribute('scale');
        
        if (game.beatPulseTriggered.bass) {
            s.x = 1.48;
            s.y = 1.48;
            s.z = 1.48;
            game.beatPulseTriggered.bass = false;
        }
        
        let nextS = s.x + (target - s.x) * 6.5 * dt;
        bassMesh.setAttribute('scale', { x: nextS, y: nextS, z: nextS });

        // Float ring slightly and rotate
        let r = bassMesh.getAttribute('rotation') || { x: 90, y: 0, z: 0 };
        let spinSpeed = game.gazeState.bass ? 160 : 35;
        bassMesh.setAttribute('rotation', { x: r.x, y: r.y, z: r.z + spinSpeed * dt });

        const ring = document.querySelector('#ring-bass');
        if (ring) {
            const opacity = game.gazeState.bass ? 0.7 : 0.2;
            const rOuter = game.gazeState.bass ? 0.48 : 0.42;
            ring.setAttribute('material', 'opacity', opacity);
            ring.setAttribute('radius-outer', rOuter);
        }
    }

    // --- SYNTH NODE ---
    const synthMesh = document.querySelector('#node-synth-mesh');
    const synthCore = document.querySelector('#node-synth-core');
    if (synthMesh && synthCore) {
        let target = game.gazeState.synth ? 1.25 : 1.0;
        let s = synthMesh.getAttribute('scale');
        let sc = synthCore.getAttribute('scale');
        
        if (game.beatPulseTriggered.synth) {
            s.x = 1.45;
            s.y = 1.45;
            s.z = 1.45;
            sc.x = 1.5;
            sc.y = 1.5;
            sc.z = 1.5;
            game.beatPulseTriggered.synth = false;
        }
        
        let nextS = s.x + (target - s.x) * 6.5 * dt;
        let nextSC = sc.x + (target * 0.8 - sc.x) * 6.5 * dt;
        synthMesh.setAttribute('scale', { x: nextS, y: nextS, z: nextS });
        synthCore.setAttribute('scale', { x: nextSC, y: nextSC, z: nextSC });

        // Spin wireframe box opposite way
        let r = synthMesh.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        let spinSpeed = game.gazeState.synth ? 90 : 20;
        synthMesh.setAttribute('rotation', { x: r.x + spinSpeed * dt, y: r.y - spinSpeed * dt * 1.5, z: r.z });

        const ring = document.querySelector('#ring-synth');
        if (ring) {
            const opacity = game.gazeState.synth ? 0.7 : 0.2;
            const rOuter = game.gazeState.synth ? 0.48 : 0.42;
            ring.setAttribute('material', 'opacity', opacity);
            ring.setAttribute('radius-outer', rOuter);
        }
    }

    // --- LEAD NODE ---
    const leadMesh = document.querySelector('#node-lead-mesh');
    if (leadMesh) {
        let target = game.gazeState.lead ? 0.32 : 0.25; // x & z base scale
        let s = leadMesh.getAttribute('scale');
        
        if (game.beatPulseTriggered.lead) {
            s.x = 0.44;
            s.y = 0.95;
            s.z = 0.44;
            game.beatPulseTriggered.lead = false;
        }
        
        // Interpolating x, y (height), and z
        let nextX = s.x + (target - s.x) * 6.5 * dt;
        let nextY = s.y + (target * 2.2 - s.y) * 6.5 * dt; // height scale ratio is 2.2
        leadMesh.setAttribute('scale', { x: nextX, y: nextY, z: nextX });

        // Rapid vertical spin
        let r = leadMesh.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        let spinSpeed = game.gazeState.lead ? 240 : 50;
        leadMesh.setAttribute('rotation', { x: r.x, y: r.y + spinSpeed * dt, z: r.z });

        const ring = document.querySelector('#ring-lead');
        if (ring) {
            const opacity = game.gazeState.lead ? 0.7 : 0.2;
            const rOuter = game.gazeState.lead ? 0.48 : 0.42;
            ring.setAttribute('material', 'opacity', opacity);
            ring.setAttribute('radius-outer', rOuter);
        }
    }

    // Gentle float height offset applied to all parent node entities using Math.sin
    ['drums', 'bass', 'synth', 'lead'].forEach((name, idx) => {
        const el = document.querySelector(`#node-${name}`);
        if (el) {
            const basePos = name === 'drums' || name === 'lead' ? 1.5 : 1.4;
            const floatOffset = Math.sin(tSec * 1.5 + idx) * 0.08;
            const p = el.getAttribute('position');
            el.setAttribute('position', { x: p.x, y: basePos + floatOffset, z: p.z });
        }
    });
}

// Checks if the player is currently mixing the matching formula
function checkChallengeRecipes(dt) {
    if (!game.currentRecipe) return;

    let isMatching = true;

    // 1. Target active tracks must be above threshold volume
    game.currentRecipe.active.forEach(name => {
        if (game.currentVolume[name] < 0.65) isMatching = false;
    });

    // 2. Target inactive tracks must be muted/below threshold volume
    game.currentRecipe.inactive.forEach(name => {
        if (game.currentVolume[name] > 0.35) isMatching = false;
    });

    if (isMatching) {
        // Build match bar meter
        game.harmonyMeter += dt * 38; // Takes approx ~2.6 seconds to complete recipe
        game.mismatchTimer = 0; // reset combo decay timer
        
        if (game.harmonyMeter >= 100) {
            // Success! Complete recipe
            audio.playChime();
            
            game.score += 150 * game.combo;
            game.recipesCompleted++;
            game.timeRemaining = Math.min(60, game.timeRemaining + 8); // Add 8s time bonus
            game.combo = Math.min(5, game.combo + 1); // Increment multiplier

            game.harmonyMeter = 0;
            UI.selectNewRecipe();
            
            // Flash green spotlight success cue
            flashSuccessSpotlights();
        }
    } else {
        // Slowly drain match meter if not matching
        game.harmonyMeter = Math.max(0, game.harmonyMeter - dt * 15);
        
        // Track mismatch duration to reset multiplier
        game.mismatchTimer += dt;
        if (game.mismatchTimer > 4.5 && game.combo > 1) {
            game.combo = 1;
            audio.playBuzz(); // Warning buzz sound
            game.mismatchTimer = 0;
        }
    }

    UI.updateHUD();
}

// Visual success cue
function flashSuccessSpotlights() {
    const leftBeam = document.querySelector('#spotlight-left-beam');
    const rightBeam = document.querySelector('#spotlight-right-beam');
    if (leftBeam && rightBeam) {
        // Temporarily change spotlights to neon green
        leftBeam.setAttribute('material', 'color', '#39ff14');
        rightBeam.setAttribute('material', 'color', '#39ff14');
        
        setTimeout(() => {
            if (leftBeam && rightBeam) {
                leftBeam.setAttribute('material', 'color', '#ff0055');
                rightBeam.setAttribute('material', 'color', '#00f0ff');
            }
        }, 1000);
    }
}

// ==========================================
// 7. AR-GAZE CONTROLS & INTERSECTIONS
// ==========================================
function bindGazeTriggers() {
    const nodeNames = ['drums', 'bass', 'synth', 'lead'];
    
    nodeNames.forEach(name => {
        const el = document.querySelector(`#node-${name}`);
        if (el) {
            // Gaze / Cursor Raycaster Hover Events
            el.addEventListener('mouseenter', () => {
                game.gazeState[name] = true;
                audio.updateTrackVolume(name, true);
                
                // Add controller haptics on hover trigger if available
                triggerHapticFeedback();
            });

            el.addEventListener('mouseleave', () => {
                game.gazeState[name] = false;
                audio.updateTrackVolume(name, false);
            });
        }
    });
}

function triggerHapticFeedback() {
    const scene = document.querySelector('a-scene');
    if (scene && scene.xrSession) {
        const session = scene.xrSession;
        if (session.inputSources) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
                    source.gamepad.hapticActuators[0].pulse(0.6, 60); // 60ms light haptic click
                }
            }
        }
    }
}

// ==========================================
// 8. SETUP INIT HOOKS
// ==========================================
window.addEventListener('load', () => {
    const scene = document.querySelector('a-scene');
    
    const initialize = () => {
        // 1. Generate canvas floor grid
        generateGridFloor();

        // 2. Setup Cyberdust particles
        initParticles();

        // 3. Bind interactive Raycaster Gaze triggers
        bindGazeTriggers();

        // 4. Hook 2D UI panels and buttons
        UI.init();

        // 5. Start main Frame Animation Tick
        registerFrameTick();
    };

    if (scene.hasLoaded) {
        initialize();
    } else {
        scene.addEventListener('loaded', initialize);
    }
});
