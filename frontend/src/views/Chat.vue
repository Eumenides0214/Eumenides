<template>
  <div class="chat-page">
    <div class="chat-header">
      <el-button text :icon="ArrowLeft" @click="$router.push('/characters')">返回</el-button>
      <div class="character-info">
        <el-avatar :size="44" :src="character?.avatar">
          {{ character?.name?.charAt(0) }}
        </el-avatar>
        <div class="info">
          <div class="name">{{ character?.name }}</div>
          <div class="meta">
            {{ character?.gender === 'male' ? '男' : character?.gender === 'female' ? '女' : '其他' }}
            · {{ character?.age }}岁 · {{ character?.voiceType }}
          </div>
        </div>
      </div>
    </div>

    <div ref="messagesRef" class="messages-container">
      <el-empty v-if="!messages.length" :description="`开始和 ${character?.name || '角色'} 聊天吧！`" />

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
        :class="msg.role"
      >
        <el-avatar v-if="msg.role === 'assistant'" :size="36" :src="character?.avatar">
          {{ character?.name?.charAt(0) }}
        </el-avatar>
        <div class="bubble" :class="{ voice: msg.contentType === 'voice' }">
          <template v-if="msg.role === 'assistant' && msg.contentType === 'voice' && msg.mediaUrl">
            <div class="voice-message" @click="playVoice(msg.mediaUrl)">
              <el-icon><VideoPlay /></el-icon>
              <span>{{ msg.content }}</span>
            </div>
          </template>
          <template v-else-if="msg.contentType === 'voice' && msg.mediaUrl">
            <div class="voice-message" @click="playVoice(msg.mediaUrl)">
              <el-icon><VideoPlay /></el-icon>
              <span>{{ msg.content || '[语音]' }}</span>
            </div>
          </template>
          <template v-else>
            {{ msg.content }}
          </template>
        </div>
        <el-avatar v-if="msg.role === 'user'" :size="36">
          {{ userStore.user?.username?.charAt(0)?.toUpperCase() }}
        </el-avatar>
      </div>

      <div v-if="loading" class="message assistant">
        <el-avatar :size="36" :src="character?.avatar">
          {{ character?.name?.charAt(0) }}
        </el-avatar>
        <div class="bubble typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button :icon="Microphone" :type="recording ? 'danger' : ''" :disabled="loading && !recording" @click="toggleRecord">
            {{ recording ? '停止并发送' : '录音' }}
          </el-button>
          <el-switch
            v-model="voiceReplyEnabled"
            active-text="语音回复"
            inactive-text="文字回复"
            @change="saveVoiceReplyPreference"
          />
        </div>
        <el-button text :icon="Delete" @click="handleClear">清空聊天</el-button>
      </div>
      <div class="input-row">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleSend"
          :disabled="loading"
        />
        <el-button type="primary" :icon="Promotion" :loading="loading" @click="handleSend">
          发送
        </el-button>
      </div>
    </div>

    <audio ref="audioRef" @ended="handleAudioEnded"></audio>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, VideoPlay, Microphone, Delete, Promotion } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCharacter } from '@/api/characters';
import { getMessages, sendMessage, sendVoice, clearMessages } from '@/api/chat';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const characterId = route.params.id;
const character = ref(null);
const messages = ref([]);
const input = ref('');
const loading = ref(false);
const messagesRef = ref();
const audioRef = ref();
const voiceReplyEnabled = ref(localStorage.getItem('voiceReplyEnabled') === 'true');

const recording = ref(false);
let mediaStream = null;
let audioContext = null;
let sourceNode = null;
let recorderNode = null;
let recordedSamples = [];
let recordedLength = 0;
let recordingSampleRate = 44100;

async function load() {
  try {
    const charRes = await getCharacter(characterId);
    character.value = charRes.data;
  } catch {
    ElMessage.error('角色不存在');
    router.push('/characters');
    return;
  }

  try {
    const msgRes = await getMessages(characterId);
    messages.value = msgRes.data || [];
  } catch {}

  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
}

async function handleSend() {
  const text = input.value.trim();
  if (!text || loading.value) return;

  input.value = '';
  messages.value.push({
    id: Date.now(),
    role: 'user',
    contentType: 'text',
    content: text,
  });
  scrollToBottom();

  loading.value = true;
  try {
    const res = await sendMessage(characterId, text, { voiceReply: voiceReplyEnabled.value });
    const d = res.data;
    if (d.assistantMessage) {
      messages.value.push(d.assistantMessage);
      maybePlayAssistantVoice(d.assistantMessage);
    }
    scrollToBottom();
  } catch {
    messages.value.pop();
  } finally {
    loading.value = false;
  }
}

async function toggleRecord() {
  if (!recording.value) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        ElMessage.error('当前浏览器不支持录音');
        return;
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startWavRecorder(mediaStream);
      recording.value = true;
    } catch (err) {
      ElMessage.error('无法访问麦克风：' + err.message);
    }
  } else {
    await stopWavRecorder(true);
  }
}

async function handleVoiceSend(blob) {
  loading.value = true;
  try {
    const res = await sendVoice(characterId, blob, '', { voiceReply: voiceReplyEnabled.value });
    const d = res.data;
    messages.value.push(d.userMessage);
    if (d.assistantMessage) {
      messages.value.push(d.assistantMessage);
      maybePlayAssistantVoice(d.assistantMessage);
    }
    scrollToBottom();
  } catch {} finally {
    loading.value = false;
  }
}

function playVoice(url) {
  const fullUrl = url.startsWith('http') ? url : url;
  if (!audioRef.value) return;
  audioRef.value.src = fullUrl;
  audioRef.value.play().catch(() => {});
}

function maybePlayAssistantVoice(message) {
  if (voiceReplyEnabled.value && message?.contentType === 'voice' && message.mediaUrl) {
    nextTick(() => playVoice(message.mediaUrl));
  }
}

function handleAudioEnded() {
  audioRef.value?.pause();
}

function saveVoiceReplyPreference() {
  localStorage.setItem('voiceReplyEnabled', String(voiceReplyEnabled.value));
}

function startWavRecorder(stream) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('当前浏览器不支持音频采集');
  }

  audioContext = new AudioContextCtor();
  recordingSampleRate = audioContext.sampleRate;
  recordedSamples = [];
  recordedLength = 0;

  sourceNode = audioContext.createMediaStreamSource(stream);
  recorderNode = audioContext.createScriptProcessor(4096, 1, 1);
  recorderNode.onaudioprocess = (event) => {
    if (!recording.value) return;

    const input = event.inputBuffer.getChannelData(0);
    const copy = new Float32Array(input.length);
    copy.set(input);
    recordedSamples.push(copy);
    recordedLength += copy.length;

    event.outputBuffer.getChannelData(0).fill(0);
  };

  sourceNode.connect(recorderNode);
  recorderNode.connect(audioContext.destination);
}

async function stopWavRecorder(shouldSend) {
  recording.value = false;

  recorderNode?.disconnect();
  sourceNode?.disconnect();
  recorderNode = null;
  sourceNode = null;
  stopMediaStream();

  const chunks = recordedSamples;
  const totalLength = recordedLength;
  const sampleRate = recordingSampleRate;
  recordedSamples = [];
  recordedLength = 0;

  if (audioContext) {
    await audioContext.close().catch(() => {});
    audioContext = null;
  }

  if (!shouldSend) return;
  if (!totalLength) {
    ElMessage.warning('没有录到声音');
    return;
  }

  await handleVoiceSend(encodeWav(mergeSamples(chunks, totalLength), sampleRate));
}

function stopMediaStream() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

function mergeSamples(chunks, totalLength) {
  const samples = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return samples;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定清空当前聊天记录吗？', '提示', { type: 'warning' });
    await clearMessages(characterId);
    messages.value = [];
    ElMessage.success('已清空');
  } catch {}
}

onMounted(load);
onUnmounted(() => {
  stopWavRecorder(false);
  stopMediaStream();
});
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}
.character-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.info .name {
  font-weight: 600;
  font-size: 16px;
}
.info .meta {
  color: #909399;
  font-size: 12px;
}
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}
.message.user {
  flex-direction: row-reverse;
}
.bubble {
  max-width: 60%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  line-height: 1.5;
  white-space: pre-wrap;
}
.message.user .bubble {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}
.bubble.voice {
  background: #ecf5ff;
}
.voice-message {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #409eff;
}
.bubble.typing {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}
.bubble.typing span {
  width: 8px;
  height: 8px;
  background: #909399;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.bubble.typing span:nth-child(1) { animation-delay: -0.32s; }
.bubble.typing span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
.input-area {
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.input-row .el-button {
  height: 40px;
}
</style>
