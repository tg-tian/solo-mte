<template>
  <div class="domain-detail-page">
    <div class="detail-header">
      <div class="header-main">
        <h2>{{ domain.domainName }}</h2>
        <p>{{ domain.domainDescription || '暂无领域描述' }}</p>
      </div>
      <el-tag :type="form.status === '1' ? 'warning' : 'primary'" effect="light">
        {{ form.status === '1' ? '已发布' : '开发中' }}
      </el-tag>
    </div>

    <div class="summary-grid">
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">领域编码</div>
        <div class="summary-value">{{ domain.domainCode }}</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">领域编号</div>
        <div class="summary-value">{{ domain.domainId }}</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">当前状态</div>
        <div class="summary-value">{{ form.status === '1' ? '已发布' : '开发中' }}</div>
      </el-card>
    </div>

    <el-card shadow="never" class="detail-card">
      <template #header>
        <div class="card-header">领域编辑</div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="领域名称" prop="domainName">
              <el-input v-model="form.domainName" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="领域编码" prop="domainCode">
              <el-input v-model="form.domainCode" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="访问地址" prop="url">
              <el-input v-model="form.url" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="说明" prop="domainDescription">
          <el-input v-model="form.domainDescription" type="textarea" :rows="5" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <div class="detail-actions">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { DomainRecord } from '../types/models';

const props = defineProps<{
  domain: DomainRecord;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [payload: DomainRecord];
  cancel: [];
}>();

const formRef = ref<FormInstance>();
const form = reactive<DomainRecord>({
  domainId: '',
  domainName: '',
  domainCode: '',
  domainDescription: '',
  status: '0',
  url: ''
});

const rules: FormRules = {
  domainName: [{ required: true, message: '请输入领域名称', trigger: 'blur' }],
  domainCode: [
    { required: true, message: '请输入领域编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '领域编码需字母开头，仅支持字母数字下划线', trigger: 'blur' }
  ]
};

watch(
  () => props.domain,
  (domain) => {
    form.domainId = domain.domainId;
    form.domainName = domain.domainName;
    form.domainCode = domain.domainCode;
    form.domainDescription = domain.domainDescription || '';
    form.status = `${domain.status ?? '0'}`.trim() === '1' ? '1' : '0';
    form.url = domain.url || '';
  },
  { immediate: true }
);

async function submit() {
  if (!formRef.value) {
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }
  emit('save', {
    domainId: form.domainId,
    domainName: form.domainName.trim(),
    domainCode: form.domainCode.trim(),
    domainDescription: form.domainDescription.trim(),
    status: form.status,
    url: (form.url ?? '').trim()
  });
}
</script>

<style scoped>
.domain-detail-page {
  min-height: 100%;
  padding: 16px 20px;
  background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 35%);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.header-main {
  flex: 1;
}

.header-main h2 {
  margin: 0;
  font-size: 22px;
  color: #1f2d3d;
}

.header-main p {
  margin: 8px 0 0;
  color: #6b7a90;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border-radius: 10px;
}

.summary-title {
  font-size: 12px;
  color: #8a98ae;
}

.summary-value {
  margin-top: 6px;
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 600;
}

.detail-card {
  border-radius: 10px;
}

.card-header {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
