/**
 * A soft synthesised idle-engine rumble for the "Sound on" toggle,
 * so the demo has ambience even when the placeholder clip is silent.
 * Replace with a real recording by setting images.hero.video to a clip with audio.
 */
export function createEngineHum() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // Brown noise for road/tyre texture.
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.55
  noise.connect(lp).connect(noiseGain).connect(master)

  // Low engine tone with a slow wobble.
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 46
  const oscLp = ctx.createBiquadFilter()
  oscLp.type = 'lowpass'
  oscLp.frequency.value = 140
  const oscGain = ctx.createGain()
  oscGain.gain.value = 0.18
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.35
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 4
  lfo.connect(lfoGain).connect(osc.frequency)
  osc.connect(oscLp).connect(oscGain).connect(master)

  let started = false
  return {
    start() {
      if (!started) {
        noise.start()
        osc.start()
        lfo.start()
        started = true
      }
      ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.2)
    },
    stop() {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
    },
    dispose() {
      ctx.close().catch(() => undefined)
    },
  }
}
