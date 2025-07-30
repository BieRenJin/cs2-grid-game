export class SoundManager {
    constructor() {
        this.sounds = {
            spin: this.createSound(440, 0.1, 'sine'),
            win: this.createSound(660, 0.2, 'square'),
            bigWin: this.createSound(880, 0.3, 'sawtooth'),
            click: this.createSound(220, 0.05, 'square'),
            scatter: this.createSound(1320, 0.3, 'sine'),
            special: this.createSound(550, 0.2, 'triangle'),
            cascade: this.createSound(330, 0.1, 'sine'),
            freeSpinStart: this.createSound(880, 0.5, 'square')
        };
        
        this.audioContext = null;
        this.enabled = true;
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    createSound(frequency, duration, type = 'sine') {
        return { frequency, duration, type };
    }
    
    play(soundName) {
        if (!this.enabled || !this.audioContext || !this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = sound.frequency;
            oscillator.type = sound.type;
            
            // Envelope
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + sound.duration);
            
            oscillator.start(now);
            oscillator.stop(now + sound.duration);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }
    
    playSequence(soundName, count, delay = 100) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => this.play(soundName), i * delay);
        }
    }
    
    playWinSound(winAmount, betAmount) {
        const winRatio = winAmount / betAmount;
        
        if (winRatio >= 100) {
            this.playSequence('bigWin', 5, 150);
        } else if (winRatio >= 50) {
            this.playSequence('bigWin', 3, 150);
        } else if (winRatio >= 10) {
            this.playSequence('win', 3, 100);
        } else {
            this.play('win');
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}