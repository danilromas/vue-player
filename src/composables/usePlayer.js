import { computed, ref, watch } from 'vue'
import { isAudio, parseName, readDuration, colorFromString } from '../utils/tracks'

const audio = new Audio()
const tracks = ref([])
const currentIndex = ref(-1)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.8)
const muted = ref(false)
const shuffle = ref(false)
const repeat = ref('off') // off | all | one

let ctx = null
const analyser = ref(null)

// AudioContext можно создать только после действия пользователя
function setupAudioGraph() {
  if (ctx) return
  ctx = new AudioContext()
  const source = ctx.createMediaElementSource(audio)
  const node = ctx.createAnalyser()
  node.fftSize = 256
  node.smoothingTimeConstant = 0.8
  source.connect(node)
  node.connect(ctx.destination)
  analyser.value = node
}

const current = computed(() => tracks.value[currentIndex.value] ?? null)

audio.addEventListener('timeupdate', () => (currentTime.value = audio.currentTime))
audio.addEventListener('loadedmetadata', () => (duration.value = audio.duration))
audio.addEventListener('play', () => (isPlaying.value = true))
audio.addEventListener('pause', () => (isPlaying.value = false))
audio.addEventListener('ended', () => {
  if (repeat.value === 'one') {
    audio.currentTime = 0
    audio.play()
  } else {
    next(true)
  }
})

watch([volume, muted], () => {
  audio.volume = volume.value
  audio.muted = muted.value
}, { immediate: true })

async function addFiles(fileList) {
  const files = [...fileList].filter(isAudio)
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const { artist, title } = parseName(file.name)
    const track = { id: crypto.randomUUID(), url, artist, title, color: colorFromString(title), duration: 0 }
    tracks.value.push(track)
    readDuration(url).then((d) => {
      const t = tracks.value.find((x) => x.id === track.id)
      if (t) t.duration = d
    })
  }
  if (currentIndex.value === -1 && tracks.value.length) load(0)
  return files.length
}

function load(index) {
  currentIndex.value = index
  audio.src = tracks.value[index].url
  currentTime.value = 0
  updateMediaSession()
}

function play(index) {
  setupAudioGraph()
  if (ctx.state === 'suspended') ctx.resume()
  if (index !== undefined && index !== currentIndex.value) load(index)
  if (currentIndex.value === -1 && tracks.value.length) load(0)
  audio.play().catch(() => {})
}

function pause() {
  audio.pause()
}

function toggle() {
  isPlaying.value ? pause() : play()
}

function randomIndex() {
  if (tracks.value.length < 2) return 0
  let i
  do i = Math.floor(Math.random() * tracks.value.length)
  while (i === currentIndex.value)
  return i
}

function next(auto = false) {
  if (!tracks.value.length) return
  let i = shuffle.value ? randomIndex() : currentIndex.value + 1
  if (i >= tracks.value.length) {
    // плейлист закончился
    if (auto && repeat.value === 'off') {
      pause()
      audio.currentTime = 0
      return
    }
    i = 0
  }
  play(i)
}

function prev() {
  if (!tracks.value.length) return
  // как в большинстве плееров: если трек уже играет больше 3 сек — начинаем его заново
  if (audio.currentTime > 3) {
    audio.currentTime = 0
    return
  }
  play((currentIndex.value - 1 + tracks.value.length) % tracks.value.length)
}

function seek(time) {
  audio.currentTime = Math.min(Math.max(time, 0), duration.value || 0)
}

function remove(id) {
  const index = tracks.value.findIndex((t) => t.id === id)
  if (index === -1) return
  URL.revokeObjectURL(tracks.value[index].url)
  tracks.value.splice(index, 1)

  if (index === currentIndex.value) {
    pause()
    if (tracks.value.length) load(Math.min(index, tracks.value.length - 1))
    else {
      currentIndex.value = -1
      audio.removeAttribute('src')
      duration.value = 0
    }
  } else if (index < currentIndex.value) {
    currentIndex.value--
  }
}

function move(from, to) {
  const playingId = current.value?.id
  const [t] = tracks.value.splice(from, 1)
  tracks.value.splice(to, 0, t)
  currentIndex.value = tracks.value.findIndex((x) => x.id === playingId)
}

function cycleRepeat() {
  repeat.value = { off: 'all', all: 'one', one: 'off' }[repeat.value]
}

// кнопки управления в шторке телефона / на клавиатуре
function updateMediaSession() {
  if (!('mediaSession' in navigator) || !current.value) return
  navigator.mediaSession.metadata = new MediaMetadata({ title: current.value.title, artist: current.value.artist })
}
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => play())
  navigator.mediaSession.setActionHandler('pause', pause)
  navigator.mediaSession.setActionHandler('nexttrack', () => next())
  navigator.mediaSession.setActionHandler('previoustrack', prev)
}

export function usePlayer() {
  return {
    tracks, current, currentIndex, isPlaying, currentTime, duration, volume, muted, shuffle, repeat, analyser,
    addFiles, play, pause, toggle, next, prev, seek, remove, move, cycleRepeat,
  }
}
