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
      <el-button type="success" :icon="Phone" @click="handleVoiceCall">语音通话</el-button>
    </div>

    <div ref="messagesRef" class="messages-container">
      <el-empty v-if="!messages.length" description="开始和 {{ character?.name }} 聊天吧！" />

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
        <el-button :icon="Microphone" :type="recording ? 'danger' : ''" @click="toggleRecord">
          {{ recording ? '松开发送' : '录音' }}
        </el-button>
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

    <audio ref="audioRef" @ended="audioRef.value.pause()"></audio>

    <el-dialog v-model="callDialog.visible" title="语音通话中" width="360px" center :close-on-click-modal="false">
      <div class="call-body">
        <el-avatar :size="100" :src="character?.avatar">
          {{ character?.name?.charAt(0) }}
        </el-avatar>
        <div class="call-character-name">{{ character?.name }}</div>
        <div class="call-duration">通话时长：{{ callDuration }}s</div>
      </div>
      <template #footer>
        <el-button type="danger" @click="endVoiceCall">挂断</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Phone, VideoPlay, Microphone, Delete, Promotion } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCharacter } from '@/api/characters';
import { getMessages, sendMessage, sendVoice, clearMessages } from '@/api/chat';
import { initiateCall, endCall } from '@/api/call';

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

const recording = ref(false);
let mediaRecorder = null;
let recordChunks = [];

const callDialog = ref({ visible: false, callId: '' });
const callDuration = ref(0);
let callTimer = null;

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
    const res = await sendMessage(characterId, text);
    const d = res.data;
    if (d.assistantMessage) messages.value.push(d.assistantMessage);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      recordChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordChunks, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await handleVoiceSend(blob);
      };
      mediaRecorder.start();
      recording.value = true;
    } catch (err) {
      ElMessage.error('无法访问麦克风：' + err.message);
    }
  } else {
    mediaRecorder.stop();
    recording.value = false;
  }
}

async function handleVoiceSend(blob) {
  loading.value = true;
  try {
    const res = await sendVoice(characterId, blob, '');
    const d = res.data;
    messages.value.push(d.userMessage);
    if (d.assistantMessage) messages.value.push(d.assistantMessage);
    scrollToBottom();
  } catch {} finally {
    loading.value = false;
  }
}

function playVoice(url) {
  const fullUrl = url.startsWith('http') ? url : url;
  audioRef.value.src = fullUrl;
  audioRef.value.play();
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定清空当前聊天记录吗？', '提示', { type: 'warning' });
    await clearMessages(characterId);
    messages.value = [];
    ElMessage.success('已清空');
  } catch {}
}

async function handleVoiceCall() {
  try {
    const res = await initiateCall(characterId);
    callDialog.value.visible = true;
    callDialog.value.callId = res.data.callId;
    callDuration.value = 0;
    callTimer = setInterval(() => {
      callDuration.value++;
    }, 1000);
  } catch {}
}

async function endVoiceCall() {
  if (callTimer) clearInterval(callTimer);
  callDialog.value.visible = false;
  if (callDialog.value.callId) {
    try {
      await endCall(callDialog.value.callId);
    } catch {}
  }
}

onMounted(load);
onUnmounted(() => {
  if (callTimer) clearInterval(callTimer);
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
  gap: 8px;
  margin-bottom: 8px;
}
.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.input-row .el-button {
  height: 40px;
}
.call-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}
.call-character-name {
  font-size: 18px;
  font-weight: 600;
}
.call-duration {
  color: #909399;
}
</style>
