<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  analyser: Object,
  playing: Boolean,
  color: { type: String, default: '#ff6b3d' },
  mode: { type: String, default: 'bars' },
})

const canvas = ref(null)
let raf = 0
let data = null

function resize() {
  const c = canvas.value
  const dpr = window.devicePixelRatio || 1
  c.width = c.clientWidth * dpr
  c.height = c.clientHeight * dpr
}

function drawBars(g, w, h) {
  props.analyser.getByteFrequencyData(data)
  // верхние частоты почти всегда пустые, берём нижние ~70%
  const count = Math.floor(data.length * 0.7)
  const gap = 3 * devicePixelRatio
  const barW = (w - gap * (count - 1)) / count
  for (let i = 0; i < count; i++) {
    const v = data[i] / 255
    const barH = Math.max(v * h * 0.95, 2 * devicePixelRatio)
    g.globalAlpha = 0.35 + v * 0.65
    g.fillRect(i * (barW + gap), h - barH, barW, barH)
  }
  g.globalAlpha = 1
}

function drawWave(g, w, h) {
  props.analyser.getByteTimeDomainData(data)
  g.lineWidth = 2.5 * devicePixelRatio
  g.beginPath()
  const step = w / data.length
  data.forEach((v, i) => {
    const y = (v / 255) * h
    i === 0 ? g.moveTo(0, y) : g.lineTo(i * step, y)
  })
  g.stroke()
}

function draw() {
  const c = canvas.value
  const g = c.getContext('2d')
  g.clearRect(0, 0, c.width, c.height)
  g.fillStyle = g.strokeStyle = props.color

  if (props.analyser) {
    data ??= new Uint8Array(props.analyser.frequencyBinCount)
    props.mode === 'wave' ? drawWave(g, c.width, c.height) : drawBars(g, c.width, c.height)
  }
  raf = requestAnimationFrame(draw)
}

// пока ничего не играет — рисуем ровную «линию тишины» без анимации
function drawIdle() {
  const c = canvas.value
  const g = c.getContext('2d')
  g.clearRect(0, 0, c.width, c.height)
  g.fillStyle = props.color
  g.globalAlpha = 0.3
  const count = 90
  const gap = 3 * devicePixelRatio
  const barW = (c.width - gap * (count - 1)) / count
  for (let i = 0; i < count; i++) g.fillRect(i * (barW + gap), c.height - 2 * devicePixelRatio, barW, 2 * devicePixelRatio)
  g.globalAlpha = 1
}

// когда музыка на паузе — не крутим анимацию впустую
watch(() => props.playing, (p) => {
  cancelAnimationFrame(raf)
  if (p) draw()
  else drawIdle()
})

watch(() => props.color, () => !props.playing && drawIdle())

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  props.playing ? draw() : drawIdle()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas ref="canvas" class="visualizer" />
</template>
