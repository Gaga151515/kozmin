/**
 * Kozminski Escape: Polowanie na ECTS
 * Moduł dźwiękowy (Web Audio API Synthesizer)
 * Zapewnia retro efekty dźwiękowe oraz muzykę tła bez konieczności pobierania zewnętrznych plików audio.
 */

class KozminskiAudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isBgmPlaying = false;
    this.bgmTimer = null;
    this.tempo = 124;
    this.stepIndex = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  // Dźwięk zebrania punktu ECTS (melodyjny kryształowy akord C-E-G-C)
  playEctsPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.12, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.26);
    });
  }

  // Dźwięk wypicia kawy w bufecie ALK (energetyczny świst wzwyż)
  playCoffeePowerup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Dźwięk notatek ze Starostwa (szelest papieru i uspokajający ton)
  playNotesPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.08); // C#5
    osc.frequency.setValueAtTime(659.25, now + 0.16); // E5

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Dźwięk ostrzeżenia: Egzaminator zauważył studenta!
  playProfessorAlert() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(240, now + 0.08);
    osc.frequency.setValueAtTime(320, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Dźwięk sprintu
  playSprintStep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Fanfara zwycięstwa: „Zaliczony Semestr!”
  playVictoryFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopBGM();
    const notes = [
      { f: 523.25, d: 0.15 }, // C5
      { f: 523.25, d: 0.15 }, // C5
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.35 }, // E5
      { f: 783.99, d: 0.20 }, // G5
      { f: 1046.50, d: 0.60 } // C6
    ];

    let t = this.ctx.currentTime + 0.05;
    notes.forEach((item) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.d - 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + item.d);
      t += item.d;
    });
  }

  // Marsz żałobny / Dźwięk porażki: „Kampania Wrześniowa”
  playDefeatSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopBGM();
    const notes = [
      { f: 392.00, d: 0.3 }, // G4
      { f: 369.99, d: 0.3 }, // F#4
      { f: 349.23, d: 0.3 }, // F4
      { f: 293.66, d: 0.7 }  // D4
    ];

    let t = this.ctx.currentTime + 0.05;
    notes.forEach((item) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.d - 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + item.d);
      t += item.d;
    });
  }

  // Rytmiczny podkład muzyczny w klimacie syntezatorowego biegu po uczelni
  startBGM() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    const bassline = [110, 110, 130.81, 110, 146.83, 110, 130.81, 98]; // A2, C3, D3, G2
    const stepDuration = 60 / this.tempo / 2; // ósemki

    const playNextBass = () => {
      if (!this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const freq = bassline[this.stepIndex % bassline.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + stepDuration);

      this.stepIndex++;
      this.bgmTimer = setTimeout(playNextBass, stepDuration * 1000);
    };

    playNextBass();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// Globalna instancja audio
window.gameAudio = new KozminskiAudioManager();
