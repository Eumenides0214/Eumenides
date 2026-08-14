<template>
  <article class="character-card soft-card soft-card-hover">
    <div class="cover" @click="$router.push(`/characters/${character.id}`)">
      <el-avatar :size="88" :src="character.avatar">{{ characterInitial(character.name) }}</el-avatar>
      <span class="status-dot">在线</span>
    </div>

    <div class="card-body">
      <button class="name-button" @click="$router.push(`/characters/${character.id}`)">
        {{ character.name }}
      </button>
      <div class="meta">{{ genderText(character.gender) }} · {{ character.age }}岁 · {{ character.voiceType }}</div>

      <div class="tags">
        <el-tag v-for="tag in (character.tags || []).slice(0, 4)" :key="tag" size="small" effect="plain">
          {{ tag }}
        </el-tag>
      </div>

      <p>{{ shortText(character.description, 72) || '这个角色还没有写下介绍。' }}</p>
    </div>

    <div class="card-footer">
      <el-button type="primary" :icon="ChatDotRound" @click="$router.push(`/chat/${character.id}`)">开始聊天</el-button>
      <el-dropdown trigger="click" @command="handleCommand">
        <el-button text :icon="MoreFilled" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">编辑角色</el-dropdown-item>
            <el-dropdown-item command="copy">复制角色</el-dropdown-item>
            <el-dropdown-item command="delete" divided>删除角色</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </article>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { ChatDotRound, MoreFilled } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { characterInitial, genderText, shortText } from '@/utils/display';

const props = defineProps({
  character: { type: Object, required: true },
});
const emit = defineEmits(['delete']);
const router = useRouter();

async function handleCommand(command) {
  if (command === 'edit') {
    router.push(`/characters/${props.character.id}/edit`);
  } else if (command === 'copy') {
    await navigator.clipboard?.writeText?.(props.character.description || '');
    ElMessage.success('角色描述已复制');
  } else if (command === 'delete') {
    try {
      await ElMessageBox.confirm(`确定删除「${props.character.name}」吗？`, '删除角色', { type: 'warning' });
      emit('delete', props.character.id);
    } catch {}
  }
}
</script>

<style scoped>
.character-card {
  overflow: hidden;
}

.cover {
  position: relative;
  min-height: 164px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.9), transparent 34%),
    linear-gradient(135deg, rgba(115, 87, 232, 0.16), rgba(155, 140, 255, 0.08));
  cursor: pointer;
}

.status-dot {
  position: absolute;
  right: 14px;
  top: 14px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--success);
  background: rgba(54, 179, 126, 0.12);
  font-size: 12px;
  font-weight: 700;
}

.card-body {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.name-button {
  width: max-content;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.name-button:hover {
  color: var(--primary);
}

.meta {
  color: var(--text-secondary);
  font-size: 13px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
}

.card-body p {
  min-height: 42px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px 16px;
}
</style>
