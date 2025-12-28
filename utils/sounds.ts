
class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPop() {
    this.playTone(440, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(880, 'sine', 0.1, 0.1), 50);
  }

  playWin() {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.3, 0.05), i * 100);
    });
  }

  playDraw() {
    [300, 250, 200].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.4, 0.05), i * 150);
    });
  }

  playClick() {
    this.playTone(1000, 'sine', 0.05, 0.1);
  }
}

export const sounds = new SoundManager();
