// Генерируем демо-трек прямо в браузере, чтобы плеер можно было попробовать без своих файлов.
// Простая прогрессия Am – F – C – G с басом и арпеджио, рендерим через OfflineAudioContext в WAV.

const BPM = 100
const BEAT = 60 / BPM
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
]

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12)

function note(ctx, { midi, start, length, type = 'sine', gain = 0.2 }) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq(midi)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, start + length)
  osc.connect(g).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + length + 0.05)
}

function kick(ctx, start) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(140, start)
  osc.frequency.exponentialRampToValueAtTime(40, start + 0.15)
  g.gain.setValueAtTime(0.8, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
  osc.connect(g).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + 0.35)
}

function toWav(buffer) {
  const ch = buffer.numberOfChannels
  const len = buffer.length * ch * 2
  const view = new DataView(new ArrayBuffer(44 + len))
  const write = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))

  write(0, 'RIFF')
  view.setUint32(4, 36 + len, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, ch, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * ch * 2, true)
  view.setUint16(32, ch * 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, len, true)

  const channels = [...Array(ch)].map((_, i) => buffer.getChannelData(i))
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (const data of channels) {
      const s = Math.max(-1, Math.min(1, data[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}

export async function createDemoTrack() {
  const bars = 8
  const seconds = bars * 4 * BEAT + 1
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * 44100), 44100)

  for (let bar = 0; bar < bars; bar++) {
    const chord = CHORDS[bar % CHORDS.length]
    const t0 = bar * 4 * BEAT
    note(ctx, { midi: chord[0] - 12, start: t0, length: 4 * BEAT, type: 'triangle', gain: 0.25 })
    for (let step = 0; step < 8; step++) {
      const midi = chord[step % 3] + (step >= 4 ? 12 : 0)
      note(ctx, { midi, start: t0 + step * BEAT / 2, length: BEAT * 0.9, type: 'square', gain: 0.05 })
    }
    for (let b = 0; b < 4; b++) kick(ctx, t0 + b * BEAT)
  }

  const buffer = await ctx.startRendering()
  return new File([toWav(buffer)], 'Danil Romashkan - Демо в ля миноре.wav', { type: 'audio/wav' })
}
