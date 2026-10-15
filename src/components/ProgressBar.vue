<script setup>
import { computed, ref } from 'vue'
import { formatTime } from '../utils/tracks'

const props = defineProps({ time: Number, duration: Number })
const emit = defineEmits(['seek'])

const bar = ref(null)
const dragValue = ref(null)

const percent = computed(() => {
  const t = dragValue.value ?? props.time
  return props.duration ? (t / props.duration) * 100 : 0
})

function timeFromEvent(e) {
  const r = bar.value.getBoundingClientRect()
  const x = Math.min(Math.max(e.clientX - r.left, 0), r.width)
  return (x / r.width) * props.duration
}

function onDown(e) {
  if (!props.duration) return
  dragValue.value = timeFromEvent(e)
  bar.value.setPointerCapture(e.pointerId)
}
function onMove(e) {
  if (dragValue.value !== null) dragValue.value = timeFromEvent(e)
}
function onUp() {
  if (dragValue.value === null) return
  emit('seek', dragValue.value)
  dragValue.value = null
}
</script>

<template>
  <div class="progress">
    <span class="time">{{ formatTime(dragValue ?? time) }}</span>
    <div ref="bar" class="track" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp">
      <div class="fill" :style="{ width: percent + '%' }" />
      <div class="thumb" :style="{ left: percent + '%' }" />
    </div>
    <span class="time">{{ formatTime(duration) }}</span>
  </div>
</template>
