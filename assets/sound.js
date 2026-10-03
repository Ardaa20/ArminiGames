// Soft, short sound effects generated with the Web Audio API (no audio files).
// Usage: Sound.move(), Sound.capture(), Sound.win(), Sound.draw(), Sound.roll(), Sound.lose()
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

  // A wooden piece set down on a board: a very short bright click (the contact)
  // plus a few quickly fading inharmonic tones (the wood ringing). No low thump.
  function woodClick(when, volume, tone) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;

    const out = a.createGain();
    out.gain.value = volume;
    out.connect(a.destination);

    // Contact click: ~8 ms of filtered noise
    const len = Math.floor(a.sampleRate * 0.008);
    const buffer = a.createBuffer(1, len, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const noise = a.createBufferSource();
    noise.buffer = buffer;
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = tone * 3.2;
    bp.Q.value = 0.9;
    const clickGain = a.createGain();
    clickGain.gain.value = 0.9;
    noise.connect(hp).connect(bp).connect(clickGain).connect(out);
    noise.start(t);

    // Wood body: inharmonic partials, the higher ones die faster
    const modes = [
      { ratio: 1.0,  gain: 0.45, decay: 0.045 },
      { ratio: 2.32, gain: 0.22, decay: 0.028 },
      { ratio: 3.86, gain: 0.12, decay: 0.018 },
    ];
    for (const m of modes) {
      const osc = a.createOscillator();
      osc.type = "sine";
      osc.frequency.value = tone * m.ratio;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(m.gain, t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + m.decay * 2.5);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + m.decay * 2.5 + 0.01);
    }
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
    move() { woodClick(0, 0.55, 880); },
    // Two clicks close together: the taken piece knocked, then the piece landing
    capture() { woodClick(0, 0.45, 1050); woodClick(0.045, 0.6, 820); },
    // Rising major arpeggio
    win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(0.15 + i * 0.11, f, 0.6, 0.12)); },
    // Two calm notes for a draw
    draw() { [659.25, 523.25].forEach((f, i) => note(0.15 + i * 0.16, f, 0.6, 0.1)); },
    // Dice rolling: a few quiet, quick clicks that settle
    roll() { [0, 0.06, 0.13, 0.22].forEach((t, i) => woodClick(t, 0.3 - i * 0.05, 1500 - i * 120)); },
    // Two soft falling notes for a loss
    lose() { [440, 349.23].forEach((f, i) => note(0.1 + i * 0.18, f, 0.5, 0.08)); },
  };
})();
