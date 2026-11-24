// Sound, all synthesized with WebAudio — no audio files. A low synth-wave bass
// loop for music, an engine hum whose pitch follows speed, a two-tone police
// siren, gunshots, punches, cash-register chimes and a mission-complete jingle.
// Nothing here loads anything; the context starts on the first user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = null;
  let nextNote = 0;
  const BASS = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42]; // A1 A1 C2 G1 ...
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  function musicStep() {
    if (!ctx || muted) return;
    const freq = BASS[step % BASS.length];
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t);
    osc.stop(t + 0.45);
    // A soft hat tick on the off-beat.
    if (step % 2 === 1) noiseBurst(0.03, 0.05, 6000);
    step += 1;
  }

  return {
    /** Call from the first key or click so the browser allows audio. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!musicTimer) {
        nextNote = ctx.currentTime + 0.1;
        musicTimer = window.setInterval(() => {
          if (ctx && ctx.currentTime >= nextNote - 0.05) {
            musicStep();
            nextNote += 0.22;
          }
        }, 60);
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    /** Engine pitch follows speed 0..1; silent on foot. */
    engine(speed01, driving) {
      if (!ctx) return;
      engineGain.gain.value = driving ? 0.05 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 45 + speed01 * 130;
    },
    /** Siren wails while any police car is near; call every frame. */
    siren(on, time) {
      if (!ctx) return;
      sirenGain.gain.value = on ? 0.045 : 0;
      if (on) sirenOsc.frequency.value = 650 + Math.sin(time * 4) * 220;
    },
    gunshot() { noiseBurst(0.12, 0.5, 900); blip(160, 0.08, 'square', 0.25, 60); },
    punch() { noiseBurst(0.08, 0.3, 500); },
    crash() { noiseBurst(0.25, 0.4, 400); },
    cash() { blip(880, 0.12, 'sine', 0.25); window.setTimeout(() => blip(1318, 0.18, 'sine', 0.25), 90); },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.3), i * 110));
    },
    wantedUp() { blip(220, 0.3, 'sawtooth', 0.2, 440); },
    click() { blip(600, 0.05, 'square', 0.12); },
  };
}
