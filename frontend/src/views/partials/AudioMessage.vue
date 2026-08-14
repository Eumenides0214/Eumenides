<template>
  <div class="audio-message">
    <button class="play-button" type="button" @click="toggle">
      <el-icon><VideoPause v-if="playing" /><VideoPlay v-else /></el-icon>
    </button>
    <input
      class="audio-range"
      type="range"
      min="0"
      :max="duration || 0"
      :value="current"
      step="0.1"
      @input="seek"
    />
    <span class="time">{{ displayTime }}</span>
    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
    ></audio>
  </div>
</template>

<script>
let activeAudio = null;
</script>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { VideoPause, VideoPlay } from '@element-plus/icons-vue';

defineProps({
  src: {
    type: String,
    required: true,
  },
});

const audioRef = ref();
const playing = ref(false);
const current = ref(0);
const duration = ref(0);

const displayTime = computed(() => `${formatSeconds(current.value)} / ${formatSeconds(duration.value)}`);

function toggle() {
  const audio = audioRef.value;
  if (!audio) return;

  if (playing.value) {
    audio.pause();
    return;
  }

  if (activeAudio && activeAudio !== audio) activeAudio.pause();
  activeAudio = audio;
  audio.play().catch(() => {});
}

function onPlay() {
  playing.value = true;
}

function onPause() {
  playing.value = false;
}

function onEnded() {
  playing.value = false;
  current.value = 0;
}

function onTimeUpdate() {
  current.value = audioRef.value?.currentTime || 0;
}

function onLoadedMetadata() {
  duration.value = Number.isFinite(audioRef.value?.duration) ? audioRef.value.duration : 0;
}

function seek(event) {
  const audio = audioRef.value;
  if (!audio) return;
  const nextTime = Number(event.target.value || 0);
  audio.currentTime = nextTime;
  current.value = nextTime;
}

function formatSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) return '00:00';
  const minute = String(Math.floor(value / 60)).padStart(2, '0');
  const second = String(Math.floor(value % 60)).padStart(2, '0');
  return `${minute}:${second}`;
}

onUnmounted(() => {
  audioRef.value?.pause();
  if (activeAudio === audioRef.value) activeAudio = null;
});
</script>

<style scoped>
.audio-message {
  min-width: 260px;
  display: grid;
  grid-template-columns: 34px 1fr 78px;
  align-items: center;
  gap: 10px;
}

.play-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--primary);
  cursor: pointer;
}

.audio-range {
  width: 100%;
  accent-color: var(--primary);
}

.time {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

audio {
  display: none;
}

@media (max-width: 640px) {
  .audio-message {
    min-width: 190px;
    grid-template-columns: 34px 1fr;
  }

  .time {
    display: none;
  }
}
</style>
