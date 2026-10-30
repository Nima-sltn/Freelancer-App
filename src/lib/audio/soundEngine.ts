/**
 * Tactile Acoustic Micro-Feedback Synthesizer (Layer 1 - Lib).
 *
 * Employs the native HTML5 Web Audio API to synthesize low-latency physical audio
 * feedback for critical transactions, approvals, and commits without downloading
 * any external MP3 or audio assets (0 bytes network payload).
 *
 * Conforms to Layer 1: Pure audio maths, zero React/UI dependencies, strictly opt-in.
 */

export type FeedbackSoundType = "click" | "commit" | "success" | "rollback" | "warn";

export interface SoundEngineOptions {
  readonly enabled?: boolean;
  readonly volume?: number;
}

export class TactileSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private masterGain: GainNode | null = null;
  private volume = 0.15; // Kept gentle and unobtrusive

  constructor(options: SoundEngineOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.volume = options.volume ?? 0.15;
  }

  public get isAudioEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enable: boolean): void {
    this.enabled = enable;
  }

  private initContext(): boolean {
    if (typeof window === "undefined") return false;
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Procedural micro-synthesis for interface actions.
   */
  public play(type: FeedbackSoundType): void {
    if (!this.enabled) return;
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        // Ultra-short 12ms warm tactile tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.012);

        gain.gain.setValueAtTime(0.08 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.012);
        break;
      }

      case "commit": {
        // Mechanical switch pop: frequency glide 1100 -> 450Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.025);

        gain.gain.setValueAtTime(0.12 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.025);
        break;
      }

      case "success": {
        // Harmonious dual chime: C5 (523Hz) -> E5 (659Hz)
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.045;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.1 * this.volume, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

          osc.connect(gain);
          gain.connect(this.masterGain!);

          osc.start(start);
          osc.stop(start + 0.08);
        });
        break;
      }

      case "rollback": {
        // Subtle low thud for reversible rollback
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.035);

        gain.gain.setValueAtTime(0.09 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case "warn": {
        // Gentle descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.04);

        gain.gain.setValueAtTime(0.08 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
    }
  }

  public destroy(): void {
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
    this.masterGain = null;
  }
}

export const soundEngine = new TactileSoundEngine({ enabled: false });
