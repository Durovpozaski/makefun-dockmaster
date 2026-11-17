// Code-generated WebAudio sound effects + a quiet generative music loop.
// No audio files, no network: every sound is an oscillator envelope.
// All calls are guarded: in a headless screenshot run there is no
// AudioContext and the game must still render and play silently.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
  };

  audio.ensure = function () {
    if (audio.ctx || audio.muted) return audio.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
    } catch (err) {
      audio.ctx = null;
    }
    return audio.ctx;
  };

  function tone(freq, dur, type, vol, when, slideTo) {
    const ctx = audio.ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + (when || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (err) { /* silent */ }
  }

  // Named effects; every player action maps to one of these.
  audio.sfx = function (name) {
    if (audio.muted) return;
    if (name === 'grab') { tone(520, 0.09, 'square', 0.08, 0, 700); }
    else if (name === 'place') { tone(660, 0.1, 'triangle', 0.14); tone(880, 0.14, 'triangle', 0.12, 0.07); }
    else if (name === 'perfect') { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.1, 'triangle', 0.12, 0.08); tone(1320, 0.18, 'triangle', 0.12, 0.16); }
    else if (name === 'wrong') { tone(220, 0.18, 'sawtooth', 0.1, 0, 140); }
    else if (name === 'collapse') { tone(180, 0.35, 'sawtooth', 0.14, 0, 60); tone(90, 0.3, 'square', 0.1, 0.05, 50); }
    else if (name === 'sail') { tone(392, 0.16, 'triangle', 0.12); tone(523, 0.16, 'triangle', 0.12, 0.1); tone(659, 0.24, 'triangle', 0.12, 0.2); }
    else if (name === 'late') { tone(311, 0.25, 'sawtooth', 0.1, 0, 233); }
    else if (name === 'click') { tone(900, 0.05, 'square', 0.06); }
    else if (name === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.12)); }
    else if (name === 'lose') { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.14)); }
    else if (name === 'tick') { tone(1200, 0.04, 'square', 0.05); }
    else if (name === 'upgrade') { tone(587, 0.1, 'triangle', 0.12); tone(880, 0.16, 'triangle', 0.12, 0.08); }
  };

  // Quiet generative loop: a slow pentatonic walk over a soft drone.
  const MELODY = [262, 294, 330, 392, 440, 392, 330, 294];
  audio.startMusic = function () {
    if (audio.musicTimer || audio.muted) return;
    audio.musicTimer = setInterval(() => {
      if (audio.muted) return;
      const step = audio.musicStep % MELODY.length;
      audio.musicStep++;
      tone(MELODY[step], 0.5, 'sine', 0.035);
      if (step === 0) tone(131, 1.6, 'sine', 0.025);
    }, 420);
  };
  audio.stopMusic = function () {
    if (audio.musicTimer) { clearInterval(audio.musicTimer); audio.musicTimer = null; }
  };
  audio.setMuted = function (m) {
    audio.muted = m;
    if (m) audio.stopMusic();
    else audio.startMusic();
  };
  return audio;
}
