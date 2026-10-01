// Soft, short sound effects generated with the Web Audio API (no audio files).
// Usage: Sound.move(), Sound.capture(), Sound.win(), Sound.draw()
const Sound = (function () {
  let ctx = null;

  // Browsers only allow audio after a user gesture, so create the context lazily.
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // A soft wooden "tock": a filtered noise click plus a low falling tone.
  function knock(when, volume, pitch) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;

    const len = Math.floor(a.sampleRate * 0.05);
    const buffer = a.createBuffer(1, len, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const noise = a.createBufferSource();
    noise.buffer = buffer;
    const band = a.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1600;
    band.Q.value = 1.2;
    const noiseGain = a.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(band).connect(noiseGain).connect(a.destination);
    noise.start(t);

    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, t + 0.09);
    const oscGain = a.createGain();
    oscGain.gain.setValueAtTime(0.0001, t);
    oscGain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // A gentle bell-like note.
  function note(when, freq, length, volume) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  return {
    move() { knock(0, 0.28, 190); },
    capture() { knock(0, 0.34, 160); knock(0.05, 0.18, 220); },
    // Rising major arpeggio
    win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(0.15 + i * 0.11, f, 0.6, 0.12)); },
    // Two calm notes for a draw
    draw() { [659.25, 523.25].forEach((f, i) => note(0.15 + i * 0.16, f, 0.6, 0.1)); },
  };
})();
