<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlayer } from './composables/usePlayer'
import { createDemoTrack } from './utils/demo'
import Visualizer from './components/Visualizer.vue'
import ProgressBar from './components/ProgressBar.vue'
import Playlist from './components/Playlist.vue'

const p = usePlayer()

const fileInput = ref(null)
const dragging = ref(false)
const vizMode = ref('bars')
const demoLoading = ref(false)

const accent = computed(() => p.current.value?.color ?? '#ff6b3d')
const repeatTitle = { off: 'Повтор выключен', all: 'Повтор плейлиста', one: 'Повтор трека' }

async function addDemo() {
  demoLoading.value = true
  await p.addFiles([await createDemoTrack()])
  demoLoading.value = false
}

function onFiles(e) {
  p.addFiles(e.target.files)
  e.target.value = ''
}

// перетаскивание файлов на всё окно
let dragCounter = 0
function onDragEnter(e) {
  if (!e.dataTransfer.types.includes('Files')) return
  dragCounter++
  dragging.value = true
}
function onDragLeave() {
  if (--dragCounter <= 0) {
    dragCounter = 0
    dragging.value = false
  }
}
function onDrop(e) {
  dragCounter = 0
  dragging.value = false
  if (e.dataTransfer.files.length) p.addFiles(e.dataTransfer.files)
}

function onKey(e) {
  if (e.target.tagName === 'INPUT') return
  const actions = {
    Space: () => p.toggle(),
    ArrowRight: () => (e.shiftKey ? p.next() : p.seek(p.currentTime.value + 5)),
    ArrowLeft: () => (e.shiftKey ? p.prev() : p.seek(p.currentTime.value - 5)),
    ArrowUp: () => (p.volume.value = Math.min(1, +(p.volume.value + 0.1).toFixed(1))),
    ArrowDown: () => (p.volume.value = Math.max(0, +(p.volume.value - 0.1).toFixed(1))),
    KeyM: () => (p.muted.value = !p.muted.value),
  }
  if (actions[e.code]) {
    e.preventDefault()
    actions[e.code]()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="app"
    :style="{ '--accent': accent }"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <section class="now">
      <div class="vinyl-wrap">
        <div class="vinyl" :class="{ spin: p.isPlaying.value }">
          <div class="label">
            <span>{{ p.current.value?.title.slice(0, 1) ?? '♪' }}</span>
          </div>
        </div>
      </div>

      <div class="info">
        <h1>{{ p.current.value?.title ?? 'Ничего не играет' }}</h1>
        <p>{{ p.current.value?.artist ?? 'Добавь треки, чтобы начать' }}</p>
      </div>

      <div class="viz-box">
        <Visualizer :analyser="p.analyser.value" :playing="p.isPlaying.value" :color="accent" :mode="vizMode" />
        <button class="viz-switch" @click="vizMode = vizMode === 'bars' ? 'wave' : 'bars'">
          {{ vizMode === 'bars' ? 'Спектр' : 'Волна' }}
        </button>
      </div>

      <ProgressBar :time="p.currentTime.value" :duration="p.duration.value" @seek="p.seek" />

      <div class="controls">
        <button class="ctrl small" :class="{ on: p.shuffle.value }" title="Перемешать" @click="p.shuffle.value = !p.shuffle.value">⤨</button>
        <button class="ctrl" title="Предыдущий (Shift+←)" @click="p.prev">⏮</button>
        <button class="ctrl play" :disabled="!p.tracks.value.length" @click="p.toggle">
          {{ p.isPlaying.value ? '❚❚' : '▶' }}
        </button>
        <button class="ctrl" title="Следующий (Shift+→)" @click="p.next()">⏭</button>
        <button class="ctrl small" :class="{ on: p.repeat.value !== 'off' }" :title="repeatTitle[p.repeat.value]" @click="p.cycleRepeat">
          {{ p.repeat.value === 'one' ? '↻¹' : '↻' }}
        </button>
      </div>

      <div class="volume">
        <button class="ctrl small" @click="p.muted.value = !p.muted.value">{{ p.muted.value || p.volume.value === 0 ? '🔇' : '🔊' }}</button>
        <input v-model.number="p.volume.value" type="range" min="0" max="1" step="0.01" :style="{ '--v': p.volume.value * 100 + '%' }" />
      </div>
    </section>

    <aside class="side">
      <header class="side-head">
        <h2>Плейлист <span>{{ p.tracks.value.length }}</span></h2>
        <button class="btn" @click="fileInput.click()">+ Добавить</button>
        <input ref="fileInput" type="file" accept="audio/*" multiple hidden @change="onFiles" />
      </header>

      <Playlist
        v-if="p.tracks.value.length"
        :tracks="p.tracks.value"
        :current-index="p.currentIndex.value"
        :playing="p.isPlaying.value"
        @play="p.play"
        @remove="p.remove"
        @move="p.move"
      />

      <div v-else class="empty">
        <p>Перетащи сюда mp3, wav или flac<br />или выбери файлы кнопкой выше</p>
        <button class="btn ghost" :disabled="demoLoading" @click="addDemo">
          {{ demoLoading ? 'Генерирую…' : 'Попробовать демо-трек' }}
        </button>
      </div>

      <footer class="hints">
        <kbd>Пробел</kbd> пауза · <kbd>←</kbd><kbd>→</kbd> перемотка · <kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd> треки · <kbd>M</kbd> звук
      </footer>
    </aside>

    <div v-if="dragging" class="drop-overlay">Отпусти, чтобы добавить в плейлист</div>
  </div>
</template>
