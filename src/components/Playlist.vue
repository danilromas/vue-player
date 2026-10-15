<script setup>
import { ref } from 'vue'
import { formatTime } from '../utils/tracks'

defineProps({ tracks: Array, currentIndex: Number, playing: Boolean })
const emit = defineEmits(['play', 'remove', 'move'])

const dragFrom = ref(null)
const dragOver = ref(null)

function onDrop(index) {
  if (dragFrom.value !== null && dragFrom.value !== index) emit('move', dragFrom.value, index)
  dragFrom.value = dragOver.value = null
}
</script>

<template>
  <ol class="playlist">
    <li
      v-for="(t, i) in tracks"
      :key="t.id"
      :class="{ current: i === currentIndex, over: i === dragOver && dragFrom !== i }"
      draggable="true"
      @dragstart="dragFrom = i"
      @dragover.prevent="dragOver = i"
      @drop.prevent="onDrop(i)"
      @dragend="dragFrom = dragOver = null"
      @dblclick="emit('play', i)"
    >
      <button class="cover-sm" :style="{ background: t.color }" @click="emit('play', i)">
        <span v-if="i === currentIndex && playing" class="eq"><i /><i /><i /></span>
        <span v-else class="num">{{ i + 1 }}</span>
      </button>
      <div class="meta">
        <strong>{{ t.title }}</strong>
        <span>{{ t.artist }}</span>
      </div>
      <span class="dur">{{ formatTime(t.duration) }}</span>
      <button class="remove" title="Убрать из плейлиста" @click="emit('remove', t.id)">×</button>
    </li>
  </ol>
</template>
