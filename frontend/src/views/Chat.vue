<template>
  <div class="chat-page">
    <header class="chat-header soft-card">
      <el-button text :icon="ArrowLeft" @click="$router.push('/characters')">返回</el-button>
      <button class="character-summary" @click="$router.push(`/characters/${characterId}`)">
        <el-avatar :size="44" :src="character?.avatar">{{ characterInitial(character?.name) }}</el-avatar>
        <span>
          <strong>{{ character?.name }}</strong>
          <small>● 在线 · {{ (character?.tags || []).slice(0, 3).join(' · ') || character?.voiceType }}</small>
        </span>
      </button>
      <div class="header-actions">
        <el-dropdown trigger="click" @command="handleHeaderCommand">
          <el-button circle :icon="MoreFilled" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="detail">查看角色</el-dropdown-item>
              <el-dropdown-item command="clear">清空聊天</el-dropdown-item>
              <el-dropdown-item command="restart">重新开始对话</el-dropdown-item>
              <el-dropdown-item command="settings">聊天设置</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main ref="messagesRef" class="messages-wrap">
      <div class="chat-container">
        <el-empty v-if="!messages.length && !loading" :description="`开始和 ${character?.name || '角色'} 聊天吧`" />

        <article
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="msg.role"
        >
          <el-avatar v-if="msg.role === 'assistant'" :size="36" :src="character?.avatar">
            {{ characterInitial(character?.name) }}
          </el-avatar>

          <div class="message-stack">
            <div v-if="msg.role === 'assistant'" class="speaker-name">{{ character?.name }}</div>
            <div class="bubble" :class="{ voice: msg.contentType === 'voice' }">
              <template v-if="msg.role === 'assistant'">
                <div v-if="parseCharacterSpeech(msg.content).action" class="character-action">
                  {{ parseCharacterSpeech(msg.content).action }}
                </div>
                <div>{{ parseCharacterSpeech(msg.content).speech || msg.content }}</div>
                <AudioMessage v-if="msg.mediaUrl" :src="msg.mediaUrl" />
              </template>

              <template v-else-if="msg.contentType === 'voice' && msg.mediaUrl">
                <AudioMessage :src="msg.mediaUrl" />
                <div class="voice-text">{{ msg.content || '[语音]' }}</div>
              </template>

              <template v-else>{{ msg.content }}</template>
              <div v-if="msg.status === 'failed'" class="message-error">{{ msg.error || '发送失败' }}</div>
            </div>

            <div class="message-tools">
              <template v-if="msg.role === 'assistant'">
                <button @click="speakMessage(msg)">朗读</button>
                <button @click="regenerateFrom(msg)">重新生成</button>
                <button @click="copyMessage(msg.content)">复制</button>
              </template>
              <button v-if="msg.status === 'failed'" class="retry-button" @click="retryMessage(msg)">重试</button>
              <span>{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>

          <el-avatar v-if="msg.role === 'user'" :size="36">
            {{ userStore.user?.username?.charAt(0)?.toUpperCase() }}
          </el-avatar>
        </article>

        <article v-if="loading" class="message assistant">
          <el-avatar :size="36" :src="character?.avatar">{{ characterInitial(character?.name) }}</el-avatar>
          <div class="message-stack">
            <div class="speaker-name">{{ character?.name }}</div>
            <div class="bubble typing">
              <div class="typing-dots"><span></span><span></span><span></span></div>
              <span>正在思考...</span>
            </div>
          </div>
        </article>
      </div>
    </main>

    <footer class="composer-shell">
      <div class="composer">
        <el-button circle :icon="Plus" @click="settingsDialog = true" />
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 5 }"
          placeholder="输入消息..."
          resize="none"
          :disabled="loading"
          @keydown.enter.exact.prevent="handleSend"
        />
        <el-button
          circle
          :icon="Microphone"
          :type="recording ? 'danger' : ''"
          :title="recording ? '停止并发送录音' : '录音'"
          :disabled="loading && !recording"
          @click="toggleRecord"
        />
        <el-button
          circle
          type="primary"
          :icon="loading ? Close : Promotion"
          :disabled="!loading && !input.trim()"
          @click="loading ? stopGeneration() : handleSend()"
        />
      </div>
    </footer>

    <audio ref="audioRef" @ended="handleAudioEnded"></audio>

    <el-dialog v-model="settingsDialog" title="聊天设置" width="360px">
      <div class="settings-body">
        <h4>回复方式</h4>
        <el-radio-group v-model="replyMode" @change="handleReplyModeChange">
          <el-radio value="auto">自动</el-radio>
          <el-radio value="text">文字回复</el-radio>
          <el-radio value="voice">语音回复</el-radio>
        </el-radio-group>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft,
  Close,
  Microphone,
  MoreFilled,
  Plus,
  Promotion,
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCharacter } from '@/api/characters';
import { clearMessages, getMessages, sendMessage, sendVoice } from '@/api/chat';
import {
  characterInitial,
  copyToClipboard,
  formatTime,
  loadReplyMode,
  parseCharacterSpeech,
  saveReplyMode,
  shouldUseVoiceReply,
} from '@/utils/display';
import AudioMessage from '@/views/partials/AudioMessage.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const characterId = route.params.id;
const character = ref(null);
const messages = ref([]);
const input = ref('');
const loading = ref(false);
const stopped = ref(false);
const messagesRef = ref();
const audioRef = ref();
const settingsDialog = ref(false);
const replyMode = ref(loadReplyMode(characterId));
const streamingMessageId = ref(null);

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
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  });
}

async function handleSend() {
  const text = input.value.trim();
  if (!text || loading.value) return;

  input.value = '';
  stopped.value = false;
  messages.value.push(createLocalMessage('user', text));
  scrollToBottom();

  loading.value = true;
  try {
    const res = await sendMessage(characterId, text, {
      voiceReply: shouldUseVoiceReply(replyMode.value, 'text'),
    });
    if (stopped.value) return;
    const d = res.data;
    if (d.assistantMessage) {
      await appendAssistantMessage(d.assistantMessage);
    }
    scrollToBottom();
  } catch (err) {
    markLastUserMessageFailed(text, err);
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
  stopped.value = false;
  loading.value = true;
  try {
    const res = await sendVoice(characterId, blob, '', {
      voiceReply: shouldUseVoiceReply(replyMode.value, 'voice'),
    });
    if (stopped.value) return;
    const d = res.data;
    messages.value.push(d.userMessage);
    if (d.assistantMessage) {
      await appendAssistantMessage(d.assistantMessage);
    }
    scrollToBottom();
  } catch (err) {
    messages.value.push(createLocalMessage('user', '[语音识别失败]', { status: 'failed', error: getErrorMessage(err) }));
    ElMessage.error(getErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

function stopGeneration() {
  stopped.value = true;
  loading.value = false;
}

function speakMessage(message) {
  if (message.mediaUrl) {
    playVoice(message.mediaUrl);
  } else {
    ElMessage.info('当前消息没有语音，可在设置中切换为语音回复');
  }
}

async function copyMessage(content) {
  await copyToClipboard(content);
  ElMessage.success('已复制');
}

function regenerateFrom(message) {
  const index = messages.value.findIndex((item) => item.id === message.id);
  const previousUser = [...messages.value.slice(0, index)].reverse().find((item) => item.role === 'user');
  if (previousUser?.content) {
    input.value = previousUser.content;
    handleSend();
  }
}

function retryMessage(message) {
  if (loading.value) return;
  input.value = message.originalContent || message.content;
  messages.value = messages.value.filter((item) => item.id !== message.id);
  handleSend();
}

function createLocalMessage(role, content, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    contentType: 'text',
    content,
    createdAt: new Date(),
    ...extra,
  };
}

function markLastUserMessageFailed(originalContent, err) {
  const failed = [...messages.value].reverse().find((item) => item.role === 'user' && item.content === originalContent);
  if (failed) {
    failed.status = 'failed';
    failed.originalContent = originalContent;
    failed.error = getErrorMessage(err);
  }
  ElMessage.error(getErrorMessage(err));
}

async function appendAssistantMessage(message) {
  const fullContent = message.content || '';
  const target = { ...message, content: '', status: 'streaming' };
  messages.value.push(target);
  streamingMessageId.value = target.id;

  for (const chunk of splitStreamingText(fullContent)) {
    if (stopped.value) break;
    target.content += chunk;
    scrollToBottom();
    await wait(18);
  }

  target.content = stopped.value ? target.content : fullContent;
  target.status = 'done';
  streamingMessageId.value = null;
  maybePlayAssistantVoice(target);
}

function splitStreamingText(text) {
  const chars = Array.from(text || '');
  const chunks = [];
  for (let i = 0; i < chars.length; i += 3) chunks.push(chars.slice(i, i + 3).join(''));
  return chunks.length ? chunks : [''];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || '网络错误，请稍后重试';
}

function playVoice(url) {
  if (!audioRef.value) return;
  audioRef.value.src = url.startsWith('http') ? url : url;
  audioRef.value.play().catch(() => {});
}

function maybePlayAssistantVoice(message) {
  if (message?.contentType === 'voice' && message.mediaUrl) {
    nextTick(() => playVoice(message.mediaUrl));
  }
}

function handleAudioEnded() {
  audioRef.value?.pause();
}

function handleReplyModeChange() {
  saveReplyMode(characterId, replyMode.value);
}

async function handleHeaderCommand(command) {
  if (command === 'detail') router.push(`/characters/${characterId}`);
  if (command === 'clear' || command === 'restart') await handleClear();
  if (command === 'settings') settingsDialog.value = true;
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定清空当前聊天记录吗？', '提示', { type: 'warning' });
    await clearMessages(characterId);
    messages.value = [];
    ElMessage.success('已清空');
  } catch {}
}

function startWavRecorder(stream) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) throw new Error('当前浏览器不支持音频采集');

  audioContext = new AudioContextCtor();
  recordingSampleRate = audioContext.sampleRate;
  recordedSamples = [];
  recordedLength = 0;

  sourceNode = audioContext.createMediaStreamSource(stream);
  recorderNode = audioContext.createScriptProcessor(4096, 1, 1);
  recorderNode.onaudioprocess = (event) => {
    if (!recording.value) return;
    const inputBuffer = event.inputBuffer.getChannelData(0);
    const copy = new Float32Array(inputBuffer.length);
    copy.set(inputBuffer);
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
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

onMounted(load);
onUnmounted(() => {
  stopped.value = true;
  stopWavRecorder(false);
  stopMediaStream();
});
</script>

<style scoped>
.chat-page {
  height: calc(100vh - 64px);
  min-height: 640px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
}

.character-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.character-summary span {
  display: grid;
  gap: 3px;
}

.character-summary strong {
  color: var(--text-primary);
  font-size: 16px;
}

.character-summary small {
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.messages-wrap {
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.chat-container {
  width: 100%;
  max-width: 1000px;
  display: grid;
  gap: 18px;
  margin: 0 auto;
}

.message {
  max-width: 70%;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: messageIn 180ms ease both;
}

.message :deep(.el-avatar) {
  flex: 0 0 36px;
  width: 36px;
  min-width: 36px;
  height: 36px;
}

.message.user {
  justify-self: end;
  flex-direction: row-reverse;
}

.message-stack {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.speaker-name {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.bubble {
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  line-height: 1.7;
  white-space: pre-wrap;
}

.message.user .bubble {
  color: #fff;
  background: linear-gradient(135deg, var(--primary), #8c7af0);
  border-color: transparent;
}

.bubble.voice {
  background: var(--primary-soft);
}

.character-action {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
}

.voice-text {
  margin-top: 8px;
}

.message-error {
  margin-top: 8px;
  color: var(--danger);
  font-size: 12px;
  font-weight: 700;
}

.message-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.message-tools button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.message-tools button:hover {
  color: var(--primary);
}

.retry-button {
  color: var(--danger) !important;
  font-weight: 800;
}

.typing {
  display: flex;
  align-items: center;
  gap: 10px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

.composer-shell {
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
}

.composer {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 10px;
  align-items: end;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.settings-body {
  display: grid;
  gap: 12px;
}

.settings-body h4 {
  margin: 0;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .chat-page {
    height: calc(100vh - 52px);
    min-height: 0;
  }

  .message {
    max-width: 88%;
  }

  .chat-header {
    padding: 10px;
  }

  .composer {
    grid-template-columns: auto 1fr auto auto;
    border-radius: var(--radius-xl);
  }
}
</style>
