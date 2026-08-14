<template>
  <div class="page-shell">
    <div class="form-hero">
      <el-button :icon="ArrowLeft" text @click="$router.back()">返回</el-button>
      <div>
        <p>角色工作台</p>
        <h1>{{ isEdit ? '编辑角色' : '创建角色' }}</h1>
      </div>
    </div>

    <div class="form-wrapper">
      <section class="avatar-card soft-card">
        <h3>角色头像</h3>
        <div class="avatar-section">
          <el-avatar :size="120" :src="form.avatar">
            {{ form.name?.charAt(0) || '?' }}
          </el-avatar>
          <div class="avatar-actions">
            <el-button type="primary" :loading="generating" @click="handleGenerateAvatar">
              AI 生成头像
            </el-button>
            <el-upload
              :show-file-list="false"
              :before-upload="handleUploadAvatar"
              :http-request="customUpload"
              accept="image/*"
            >
              <el-button>上传头像</el-button>
            </el-upload>
          </div>
        </div>
      </section>

      <section class="info-card soft-card">
        <h3>基本信息</h3>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" label-position="right">
          <el-form-item label="角色名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入角色名称" />
          </el-form-item>
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio value="male">男</el-radio>
              <el-radio value="female">女</el-radio>
              <el-radio value="other">其他</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="年龄" prop="age">
            <el-input-number v-model="form.age" :min="1" :max="150" />
          </el-form-item>
          <el-form-item label="声音类型" prop="voiceType">
            <el-select v-model="form.voiceType" placeholder="请选择声音类型" style="width: 200px">
              <el-option v-for="v in voiceTypes" :key="v" :label="v" :value="v" />
            </el-select>
          </el-form-item>
          <el-form-item label="角色描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="5"
              placeholder="描述角色性格、背景、说话风格等"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="form.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入标签"
              style="width: 100%"
            >
              <el-option v-for="t in presetTags" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">
              {{ isEdit ? '保存修改' : '创建角色' }}
            </el-button>
            <el-button @click="$router.back()">取消</el-button>
          </el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import {
  createCharacter,
  updateCharacter,
  getCharacter,
  generateAvatar,
  uploadAvatar,
} from '@/api/characters';

const route = useRoute();
const router = useRouter();
const formRef = ref();

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const generating = ref(false);

const voiceTypes = ['成熟男声', '温柔女声', '少年音', '萝莉音', '磁性男声', '御姐音', '元气少女', '低沉男声'];
const presetTags = ['暖心', '幽默', '高冷', '知性', '傲娇', '温柔', '活泼', '神秘', '霸气', '呆萌'];

const form = ref({
  name: '',
  gender: 'female',
  age: 18,
  voiceType: '温柔女声',
  description: '',
  tags: [],
  avatar: '',
});

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  voiceType: [{ required: true, message: '请选择声音类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入角色描述', trigger: 'blur' }],
};

async function loadCharacter() {
  if (!isEdit.value) return;
  try {
    const res = await getCharacter(route.params.id);
    Object.assign(form.value, res.data);
  } catch {}
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const data = { ...form.value };
    if (isEdit.value) {
      await updateCharacter(route.params.id, data);
      ElMessage.success('更新成功');
    } else {
      const res = await createCharacter(data);
      ElMessage.success('创建成功');
      router.push(`/chat/${res.data.id}`);
      return;
    }
    router.push('/characters');
  } catch {} finally {
    saving.value = false;
  }
}

async function handleGenerateAvatar() {
  if (isEdit.value) {
    generating.value = true;
    try {
      const res = await generateAvatar(route.params.id);
      form.value.avatar = res.data.avatar;
      ElMessage.success('头像生成成功');
    } catch {} finally {
      generating.value = false;
    }
  } else {
    ElMessage.info('请先创建角色再生成头像');
  }
}

function handleUploadAvatar(file) {
  if (!file.type?.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB');
    return false;
  }

  return true;
}

async function customUpload(options) {
  if (!isEdit.value) {
    ElMessage.info('请先创建角色再上传头像');
    return;
  }
  generating.value = true;
  try {
    const res = await uploadAvatar(route.params.id, options.file);
    form.value.avatar = res.data.avatar;
    ElMessage.success('头像上传成功');
  } catch {} finally {
    generating.value = false;
  }
}

onMounted(loadCharacter);
</script>

<style scoped>
.form-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.form-hero p {
  margin: 0 0 4px;
  color: var(--primary);
  font-weight: 800;
}

.form-hero h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 28px;
  letter-spacing: 0;
}

.form-wrapper {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.avatar-card,
.info-card {
  padding: 22px;
}

.avatar-card h3,
.info-card h3 {
  margin: 0 0 18px;
  color: var(--text-primary);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
@media (max-width: 768px) {
  .form-wrapper {
    grid-template-columns: 1fr;
  }

  .form-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
