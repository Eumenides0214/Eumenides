<template>
  <div class="page-shell settings-page">
    <div class="section-title">
      <div>
        <h2>设置</h2>
        <p class="muted">管理默认聊天体验。</p>
      </div>
    </div>

    <section class="soft-card settings-card">
      <h3>默认回复方式</h3>
      <el-radio-group v-model="replyMode" @change="save">
        <el-radio-button value="auto">自动</el-radio-button>
        <el-radio-button value="text">文字回复</el-radio-button>
        <el-radio-button value="voice">语音回复</el-radio-button>
      </el-radio-group>
      <p>聊天页会按角色保存设置；这里作为新角色会话的默认值。</p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const replyMode = ref(localStorage.getItem('defaultReplyMode') || 'text');

function save() {
  localStorage.setItem('defaultReplyMode', replyMode.value);
  ElMessage.success('设置已保存');
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
}

.section-title p {
  margin: 6px 0 0;
}

.settings-card {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.settings-card h3,
.settings-card p {
  margin: 0;
}

.settings-card p {
  color: var(--text-secondary);
}
</style>
