// =========================================================
//  AXIOMA — multimedia/audio.js
//  Web Audio API Synthesis, Sound Effects, and Generative BGM
// =========================================================

let audioCtx = null;
let bgmInterval = null;
let bgmTimeout = null;
let bgmOscs = [];
let bgmPlaying = false;

// Variables de música reactiva (tensión, tempo, filtro)
let bgmTensionLevel = 0;     // 0: normal, 1: tenso, 2: crítico
let bgmIntervalTime = 250;   // ms por paso (tempo)
let lowpassCutoff = 250;     // Hz de frecuencia de corte lowpass

// Audio state variables (local copies managed by configureAudio)
let soundEnabled = true;
let bgmEnabled = true;
let masterVolume = 0.5;

const bgmChords = [
    [65.41, 130.81, 196.00], // C2, C3, G3
    [77.78, 155.56, 233.08], // Eb2, Eb3, Bb3
    [58.27, 116.54, 174.61], // Bb1, Bb2, F3
    [51.91, 103.83, 155.56]  // Ab1, Ab2, Eb3
];

const bgmArpNotes = [
    [261.63, 329.63, 392.00, 523.25], // C Major
    [311.13, 392.00, 466.16, 622.25], // Eb Major
    [233.08, 293.66, 349.23, 466.16], // Bb Major
    [207.65, 261.63, 311.13, 415.30]  // Ab Major
];

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function configureAudio(settings) {
    if (settings.soundEnabled !== undefined) soundEnabled = settings.soundEnabled;
    if (settings.bgmEnabled !== undefined) bgmEnabled = settings.bgmEnabled;
    if (settings.masterVolume !== undefined) masterVolume = settings.masterVolume;
    
    // Automatically start or stop BGM based on new settings
    if (bgmEnabled && soundEnabled) {
        if (!bgmPlaying) startBGM();
    } else {
        if (bgmPlaying) stopBGM();
    }
}

export function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        
        if (type === 'click') {
            const osc = audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.08);
            
            gainNode.gain.setValueAtTime(masterVolume * 0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
            
        } else if (type === 'beep') {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            
            gainNode.gain.setValueAtTime(masterVolume * 0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
            
        } else if (type === 'success') {
            const osc = audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(800, now + 0.2);
            
            gainNode.gain.setValueAtTime(masterVolume * 0.25, now);
            gainNode.gain.setValueAtTime(masterVolume * 0.25, now + 0.25);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
            
        } else if (type === 'damage') {
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(60, now + 0.3);
            
            gainNode.gain.setValueAtTime(masterVolume * 0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
            
        } else if (type === 'victory') {
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                
                const noteGain = audioCtx.createGain();
                noteGain.gain.setValueAtTime(0, now + idx * 0.1);
                noteGain.gain.linearRampToValueAtTime(masterVolume * 0.2, now + idx * 0.1 + 0.05);
                noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
                
                osc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.45);
            });
            
        } else if (type === 'defeat') {
            const notes = [392.00, 349.23, 311.13, 246.94];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + idx * 0.15);
                
                const noteGain = audioCtx.createGain();
                noteGain.gain.setValueAtTime(0, now + idx * 0.15);
                noteGain.gain.linearRampToValueAtTime(masterVolume * 0.25, now + idx * 0.15 + 0.05);
                noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.5);
                
                osc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                osc.start(now + idx * 0.15);
                osc.stop(now + idx * 0.15 + 0.55);
            });
        } else if (type === 'warning') {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(280, now + 0.15);
            
            gainNode.gain.setValueAtTime(masterVolume * 0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {
        console.error("Audio play error:", e);
    }
}

export function playTypeSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        const pitch = 500 + Math.random() * 150;
        osc.frequency.setValueAtTime(pitch, now);
        
        gainNode.gain.setValueAtTime(masterVolume * 0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
    } catch (e) {}
}

export function startBGM() {
    if (bgmPlaying || !soundEnabled || !bgmEnabled) return;
    try {
        initAudio();
        bgmPlaying = true;
        
        let step = 0;
        let chordIdx = 0;
        
        function playNextStep() {
            if (!bgmPlaying) return;
            const now = audioCtx.currentTime;
            
            // 1. Acorde (Bajo) cada 16 pasos
            if (step % 16 === 0) {
                bgmOscs.forEach(nodeObj => {
                    nodeObj.gain.gain.setValueAtTime(nodeObj.gain.gain.value, now);
                    nodeObj.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                    setTimeout(() => {
                        try { nodeObj.osc.stop(); } catch(e){}
                    }, 1000);
                });
                bgmOscs = [];
                
                const chord = bgmChords[chordIdx];
                chord.forEach((freq, idx) => {
                    const osc = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    osc.type = idx === 0 ? 'sawtooth' : 'triangle';
                    osc.frequency.setValueAtTime(freq, now);
                    
                    const filter = audioCtx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(lowpassCutoff, now);
                    
                    const vol = idx === 0 ? 0.08 : 0.05;
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(vol * masterVolume, now + 0.5);
                    
                    osc.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    osc.start(now);
                    bgmOscs.push({ osc, gain: gainNode });
                });
                
                chordIdx = (chordIdx + 1) % bgmChords.length;
            }
            
            // 2. Arpegiador (Melodía) cada 2 pasos (o cada paso en tensión crítica)
            const arpTriggerRate = bgmTensionLevel >= 2 ? 1 : 2;
            if (step % arpTriggerRate === 0) {
                const currentChordNotes = bgmArpNotes[(chordIdx === 0 ? bgmChords.length - 1 : chordIdx - 1)];
                const noteFreq = currentChordNotes[Math.floor(Math.random() * currentChordNotes.length)];
                
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(noteFreq, now);
                
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.04 * masterVolume, now + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(now);
                osc.stop(now + 0.45);
            }
            
            // 3. Sonido de latido en salud crítica (<30% HP) cada 4 pasos
            if (bgmTensionLevel >= 2 && step % 4 === 0) {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(60, now); // Latido grave
                osc.frequency.linearRampToValueAtTime(10, now + 0.15);
                
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(masterVolume * 0.25, now + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
            }
            
            step++;
            bgmTimeout = setTimeout(playNextStep, bgmIntervalTime);
        }
        
        playNextStep();
        
    } catch (e) {
        console.error("BGM starting error:", e);
    }
}

export function stopBGM() {
    bgmPlaying = false;
    if (bgmTimeout) {
        clearTimeout(bgmTimeout);
        bgmTimeout = null;
    }
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
    bgmOscs.forEach(nodeObj => {
        try { nodeObj.osc.stop(); } catch(e){}
    });
    bgmOscs = [];
}

export function updateBgmTension(health) {
    if (health === undefined || health <= 0 || health > 100) {
        // Reset tensión
        bgmTensionLevel = 0;
        bgmIntervalTime = 250;
        lowpassCutoff = 250;
        return;
    }
    
    if (health <= 25) {
        bgmTensionLevel = 2;    // Crítico
        bgmIntervalTime = 180;   // Mucho más rápido (tempo tenso)
        lowpassCutoff = 800;    // Filtro abierto, acordes chillones y agresivos
    } else if (health <= 50) {
        bgmTensionLevel = 1;    // Tensión media
        bgmIntervalTime = 220;   // Ligeramente más rápido
        lowpassCutoff = 450;    // Brillo intermedio
    } else {
        bgmTensionLevel = 0;    // Normal
        bgmIntervalTime = 250;   // Tempo original
        lowpassCutoff = 250;    // Filtro cerrado, sonido cálido y grave
    }
}
