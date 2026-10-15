const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i

export function isAudio(file) {
  return file.type.startsWith('audio/') || AUDIO_EXT.test(file.name)
}

// "Исполнитель - Название.mp3" -> { artist, title }
export function parseName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
  const parts = base.split(/\s+[-–—]\s+/)
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - ') }
  return { artist: 'Неизвестный исполнитель', title: base }
}

// длительность узнаём через временный <audio>, чтобы не ждать воспроизведения
export function readDuration(url) {
  return new Promise((resolve) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => resolve(a.duration)
    a.onerror = () => resolve(0)
    a.src = url
  })
}

export function formatTime(sec) {
  if (!Number.isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// цвет обложки-заглушки из названия, чтобы у каждого трека был свой
export function colorFromString(str) {
  let hash = 0
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 70% 60%)`
}
