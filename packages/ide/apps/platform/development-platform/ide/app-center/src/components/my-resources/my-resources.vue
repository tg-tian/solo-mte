<template>
  <div class="my-resources-page">
    <div v-if="userError" class="error-hint">{{ userError }}</div>

    <!-- 邮件服务配置 -->
    <el-card class="resource-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">邮件服务配置</span>
          <el-button type="primary" :disabled="!canOperate" @click="onCreate">新建配置</el-button>
        </div>
      </template>

      <p class="card-desc">
        在这里维护发邮件用的服务器配置：为每个配置起一个「编号」，在表单里调用「按列表发送邮件」时填写该编号即可。
        配置按租户隔离，仅当前租户可见。
      </p>

      <el-table
        v-loading="loading"
        :data="mailConfigs"
        empty-text="还没有邮件配置，点击右上角「新建配置」创建"
        size="default"
      >
        <el-table-column label="编号" min-width="150">
          <template #default="{ row }">
            <span>{{ row.code }}</span>
            <el-tooltip
              v-if="row.inherited"
              content="改造前创建的共享配置，首次进入本租户时自动复制；编辑/删除只影响本租户"
              placement="top"
            >
              <el-tag size="small" type="warning" effect="plain" class="inherited-tag">共享数据</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="可见性" width="96">
          <template #default="{ row }">
            <el-tag :type="row.visibility === 'public' ? 'success' : 'info'" effect="plain">
              {{ row.visibility === 'public' ? '公共' : '个人' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="邮件服务器" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.host }}:{{ row.port }}{{ row.ssl ? '（SSL）' : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="account" label="发信账号" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ownerName" label="创建者" width="120" show-overflow-tooltip />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <template v-if="isMine(row)">
              <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="onDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 集成REST配置 -->
    <el-card class="resource-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">集成 REST 配置</span>
          <el-button type="primary" :disabled="!canOperate" @click="onCreateRest">新建配置</el-button>
        </div>
      </template>

      <p class="card-desc">
        在这里登记第三方开放接口（腾讯、飞书、微信公众号等）：为每个接口起一个「编号」，在代码里传「编号 + 参数」即可
        （后端、前端代码都支持，写法见新建弹框里的示例），接口地址与 ApiKey 由平台按配置自动拼接，代码里不写地址、不写密钥。
        配置按租户隔离，仅当前租户可见。
      </p>

      <el-table
        v-loading="restLoading"
        :data="restConfigs"
        empty-text="还没有 REST 配置，点击右上角「新建配置」创建"
        size="default"
      >
        <el-table-column label="编号" min-width="150">
          <template #default="{ row }">
            <span>{{ row.code }}</span>
            <el-tooltip
              v-if="row.inherited"
              content="改造前创建的共享配置，首次进入本租户时自动复制；编辑/删除只影响本租户"
              placement="top"
            >
              <el-tag size="small" type="warning" effect="plain" class="inherited-tag">共享数据</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="130" show-overflow-tooltip />
        <el-table-column label="可见性" width="96">
          <template #default="{ row }">
            <el-tag :type="row.visibility === 'public' ? 'success' : 'info'" effect="plain">
              {{ row.visibility === 'public' ? '公共' : '个人' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方法" width="92">
          <template #default="{ row }">
            <el-tag :type="methodTagType(row.method)" effect="plain" size="small">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="请求地址" min-width="220" show-overflow-tooltip />
        <el-table-column label="认证" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ authText(row) }}</template>
        </el-table-column>
        <el-table-column prop="ownerName" label="创建者" width="110" show-overflow-tooltip />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <template v-if="isMineRest(row)">
              <el-button link type="primary" @click="onEditRest(row)">编辑</el-button>
              <el-button link type="danger" @click="onDeleteRest(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑邮件配置 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑邮件配置' : '新建邮件配置'"
      width="720px"
      :close-on-click-modal="false"
      append-to-body
      destroy-on-close
    >
      <el-form label-width="120px" class="mail-form">
        <div class="form-row">
          <el-form-item label="编号" required>
            <el-input v-model="form.code" placeholder="例如 demo，调用时用它指定配置，不区分大小写" :disabled="!!editing" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" placeholder="例如 演示邮箱" />
          </el-form-item>
        </div>

        <el-form-item label="可见性">
          <el-radio-group v-model="form.visibility">
            <el-radio value="public">公共（所有人可见）</el-radio>
            <el-radio value="private">个人（仅自己可见）</el-radio>
          </el-radio-group>
        </el-form-item>

        <div v-if="editing?.inherited" class="form-note inherited-note">
          该配置来自改造前的共享数据：编辑/删除只影响当前租户，其他租户仍使用原数据。
        </div>

        <div class="form-row">
          <el-form-item label="邮件服务器" required>
            <el-input v-model="form.host" placeholder="例如 smtp.163.com" />
          </el-form-item>
          <el-form-item label="端口" required>
            <el-input-number v-model="form.port" :min="1" :max="65535" controls-position="right" class="full-width port-input" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="SSL">
            <el-switch v-model="form.ssl" />
          </el-form-item>
          <el-form-item label="发信账号" required>
            <el-input v-model="form.account" placeholder="例如 xxx@163.com" />
          </el-form-item>
        </div>
        <div class="form-note">提示：QQ、163 等邮箱用授权码 + 465 端口时，需要打开 SSL。</div>

        <el-form-item label="密码/授权码" :required="!editing">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editing ? '留空表示不修改' : '邮箱授权码（不是邮箱登录密码）'"
          />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="发件人名称">
            <el-input v-model="form.senderName" placeholder="例如 iGIX，默认为空" />
          </el-form-item>
          <el-form-item label="发件人地址">
            <el-input v-model="form.from" placeholder="默认为发信账号" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑REST配置 -->
    <el-dialog
      v-model="restDialogVisible"
      :title="restEditing ? '编辑 REST 配置' : '新建 REST 配置'"
      width="760px"
      :close-on-click-modal="false"
      append-to-body
      destroy-on-close
    >
      <el-form label-width="120px" class="mail-form">
        <div class="form-row">
          <el-form-item label="编号" required>
            <el-input v-model="restForm.code" placeholder="例如 weather，代码里按它调用，不区分大小写" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="restForm.name" placeholder="例如 天气查询接口" />
          </el-form-item>
        </div>

        <el-form-item label="可见性">
          <el-radio-group v-model="restForm.visibility">
            <el-radio value="public">公共（所有人可见）</el-radio>
            <el-radio value="private">个人（仅自己可见）</el-radio>
          </el-radio-group>
        </el-form-item>

        <div v-if="restEditing?.inherited" class="form-note inherited-note">
          该配置来自改造前的共享数据：编辑/删除只影响当前租户，其他租户仍使用原数据。
        </div>

        <div class="form-row">
          <el-form-item label="请求方法" required>
            <el-select v-model="restForm.method" class="full-width">
              <el-option v-for="m in REST_METHODS" :key="m" :label="m" :value="m" />
            </el-select>
          </el-form-item>
          <el-form-item label="内容类型">
            <el-input v-model="restForm.contentType" placeholder="默认 application/json" />
          </el-form-item>
        </div>

        <el-form-item label="请求地址" required>
          <el-input v-model="restForm.url" placeholder="例如 https://api.example.com/v1/users/{userId}" />
        </el-form-item>
        <div class="form-note">地址、自定义请求头、ApiKey/Bearer 的值里可以写 {参数名} 占位符，调用时用同名参数替换。</div>

        <el-form-item label="认证方式">
          <el-select v-model="restForm.authType" class="auth-select">
            <el-option label="无" value="none" />
            <el-option label="ApiKey（密钥）" value="apiKey" />
            <el-option label="Bearer Token" value="bearer" />
          </el-select>
        </el-form-item>

        <template v-if="restForm.authType === 'apiKey'">
          <div class="form-row">
            <el-form-item label="携带位置">
              <el-radio-group v-model="restForm.apiKeyPlacement">
                <el-radio value="header">请求头</el-radio>
                <el-radio value="query">查询参数</el-radio>
                <el-radio value="body">请求体</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="参数名称">
              <el-input v-model="restForm.apiKeyName" placeholder="例如 X-Api-Key 或 key" />
            </el-form-item>
          </div>
          <div v-if="restForm.apiKeyPlacement === 'body'" class="form-note">
            选「请求体」时，密钥会作为 JSON 请求体的一个字段发送（POST/PUT/PATCH）；GET/DELETE 没有请求体，会自动改为查询参数。
          </div>
          <el-form-item label="密钥值">
            <el-input
              v-model="restForm.apiKeyValue"
              type="password"
              show-password
              :placeholder="restEditing ? '留空表示不修改' : '在第三方平台申请的 ApiKey'"
            />
          </el-form-item>
        </template>

        <el-form-item v-if="restForm.authType === 'bearer'" label="Token">
          <el-input
            v-model="restForm.bearerToken"
            type="password"
            show-password
            :placeholder="restEditing ? '留空表示不修改' : 'Bearer Token 的值（会自动拼成 Authorization: Bearer xxx）'"
          />
        </el-form-item>

        <el-form-item label="自定义请求头">
          <el-input
            v-model="restForm.headersText"
            type="textarea"
            :rows="3"
            placeholder="选填，每行一条，格式：名称: 值（例如 X-App-Id: 12345）"
          />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="超时（毫秒）">
            <el-input-number v-model="restForm.timeoutMs" :min="1000" :max="120000" :step="1000" controls-position="right" class="full-width port-input" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="restForm.description" placeholder="选填，例如接口用途备注" />
          </el-form-item>
        </div>

        <div class="call-hint">
          <div class="call-hint-title">在代码里这样调用</div>
          <el-tabs v-model="callSampleTab" class="call-hint-tabs">
            <el-tab-pane label="后端代码" name="backend">
              <div class="call-hint-label">① 工程 pom 中加入依赖：</div>
              <pre class="call-hint-code">{{ restClientDependency }}</pre>
              <div class="call-hint-label">② BE 动作等 Java 代码里调用：</div>
              <pre class="call-hint-code">{{ backendCallSample }}</pre>
            </el-tab-pane>
            <el-tab-pane label="前端代码" name="frontend">
              <div class="call-hint-label">表单控制器的 TS 方法里调用：</div>
              <pre class="call-hint-code">{{ frontendCallSample }}</pre>
            </el-tab-pane>
          </el-tabs>
          <div class="call-hint-tip">
            GET/DELETE 的参数会拼到查询串；POST/PUT/PATCH 的参数作为请求体；地址、请求头、认证值里的 {参数名} 会用同名参数替换。
            认证信息由平台按上面的配置自动携带，代码里不用写 ApiKey。
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="restDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="restSaving" @click="onSaveRest">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { CurrentUser, MailConfigItem, MailVisibility, RestAuthType, RestConfigItem, RestMethod } from '../../api/resources';
import {
    deleteMailConfig,
    deleteRestConfig,
    getCurrentUser,
    getPublicKey,
    listMailConfigs,
    listRestConfigs,
    resolveApiError,
    saveMailConfig,
    saveRestConfig,
} from '../../api/resources';

interface MailFormState {
    code: string;
    name: string;
    visibility: MailVisibility;
    host: string;
    port: number;
    ssl: boolean;
    account: string;
    password: string;
    senderName: string;
    from: string;
}

/* ------------------------------------------------------------------ *
 * 集成REST配置
 * 密钥（ApiKey 值 / Bearer Token）与邮件密码一样：不返回给页面，编辑时留空表示不修改。
 * ------------------------------------------------------------------ */

interface RestFormState {
    code: string;
    name: string;
    visibility: MailVisibility;
    url: string;
    method: RestMethod;
    authType: RestAuthType;
    apiKeyPlacement: 'header' | 'query' | 'body';
    apiKeyName: string;
    apiKeyValue: string;
    bearerToken: string;
    headersText: string;
    contentType: string;
    timeoutMs: number;
    description: string;
}

const REST_METHODS: RestMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function emptyRestForm(): RestFormState {
    return {
        code: '',
        name: '',
        visibility: 'private',
        url: '',
        method: 'GET',
        authType: 'none',
        apiKeyPlacement: 'header',
        apiKeyName: '',
        apiKeyValue: '',
        bearerToken: '',
        headersText: '',
        contentType: 'application/json',
        timeoutMs: 10000,
        description: '',
    };
}

const currentUser = ref<CurrentUser | null>(null);
const userError = ref('');
const publicKey = ref('');

/** 当前用户的租户ID（页面按它做数据隔离；平台多租户下的必填项） */
const tenantId = computed(() => {
    const value = currentUser.value?.tenantId;
    return value === undefined || value === null ? '' : String(value).trim();
});
/** 拿到用户和租户信息后才允许新建/编辑/删除 */
const canOperate = computed(() => !!currentUser.value && !!tenantId.value);

const mailConfigs = ref<MailConfigItem[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const editing = ref<MailConfigItem | null>(null);
const saving = ref(false);
const form = reactive<MailFormState>(emptyForm());

const restConfigs = ref<RestConfigItem[]>([]);
const restLoading = ref(false);
const restDialogVisible = ref(false);
const restEditing = ref<RestConfigItem | null>(null);
const restSaving = ref(false);
const restForm = reactive<RestFormState>(emptyRestForm());
const callSampleTab = ref<'backend' | 'frontend'>('backend');

/** 后端用到的依赖（展示在示例里，方便直接抄进 pom） */
const restClientDependency = [
    '<dependency>',
    '  <groupId>com.inspur.gs</groupId>',
    '  <artifactId>pubcmp-rest-client</artifactId>',
    '  <version>1.0.0</version>',
    '</dependency>',
].join('\n');

const backendCallSample = computed(() => {
    const code = restForm.code.trim() || '编号';
    return [
        'Map<String, Object> params = new HashMap<>();',
        'params.put("参数名", "参数值");          // 按第三方接口的要求填写',
        `String body = PubRestClient.call("${code}", params);`,
    ].join('\n');
});

const frontendCallSample = computed(() => {
    const code = restForm.code.trim() || '编号';
    return [
        "import { CommonRestService } from '@farris/command-services-vue';",
        '',
        '// 在表单控制器的 TS 方法里',
        'const restService = this.injector.get<CommonRestService>(CommonRestService);',
        `const body = await restService.call('${code}', { 参数名: '参数值' });`,
    ].join('\n');
});

function emptyForm(): MailFormState {
    return {
        code: '',
        name: '',
        visibility: 'private',
        host: '',
        port: 465,
        ssl: true,
        account: '',
        password: '',
        senderName: '',
        from: '',
    };
}

async function initialize() {
    try {
        currentUser.value = await getCurrentUser();
    } catch (e) {
        userError.value = '未获取到当前登录用户信息，请先从平台首页登录后再打开本页面。';
        return;
    }
    if (!tenantId.value) {
        userError.value = '未获取到当前用户的租户信息（tenantId），请确认平台已启用多租户并重新登录后再打开本页面。';
        return;
    }
    try {
        publicKey.value = await getPublicKey();
    } catch (e) {
        // 公钥拿不到时仅影响保存密码/密钥，加载列表照常
        console.warn('获取服务端公钥失败', e);
    }
    await loadConfigs();
    await loadRestConfigs();
}

async function loadConfigs() {
    if (!currentUser.value || !tenantId.value) return;
    loading.value = true;
    try {
        const res = await listMailConfigs(currentUser.value.id, tenantId.value);
        mailConfigs.value = res.configs || [];
    } catch (e: any) {
        ElMessage.error(resolveApiError(e, '加载邮件配置失败'));
    } finally {
        loading.value = false;
    }
}

async function loadRestConfigs() {
    if (!currentUser.value || !tenantId.value) return;
    restLoading.value = true;
    try {
        const res = await listRestConfigs(currentUser.value.id, tenantId.value);
        restConfigs.value = res.configs || [];
    } catch (e: any) {
        ElMessage.error(resolveApiError(e, '加载REST配置失败'));
    } finally {
        restLoading.value = false;
    }
}

/** 判断某个配置是否归当前用户（后端也会校验，这里用于控制按钮显隐） */
function isMine(row: MailConfigItem | RestConfigItem): boolean {
    if (!currentUser.value) return false;
    const mine = [currentUser.value.id, currentUser.value.userId, currentUser.value.code, currentUser.value.name]
        .filter((value) => !!value)
        .map((value) => String(value).toLowerCase());
    return [row.ownerId, row.ownerUserId, row.ownerCode, row.ownerName]
        .filter((value) => !!value)
        .some((value) => mine.indexOf(String(value).toLowerCase()) >= 0);
}

function isMineRest(row: RestConfigItem): boolean {
    return isMine(row);
}

function formatTime(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
}

function methodTagType(method: string): 'primary' | 'success' | 'info' | 'warning' | 'danger' {
    switch (method) {
        case 'GET':
            return 'success';
        case 'POST':
            return 'primary';
        case 'PUT':
        case 'PATCH':
            return 'warning';
        case 'DELETE':
            return 'danger';
        default:
            return 'info';
    }
}

function authText(row: RestConfigItem): string {
    if (row.authType === 'apiKey') {
        const where = row.apiKeyPlacement === 'query' ? '查询参数' : row.apiKeyPlacement === 'body' ? '请求体' : '请求头';
        return `ApiKey（${where}：${row.apiKeyName || '未命名'}）`;
    }
    if (row.authType === 'bearer') {
        return 'Bearer Token';
    }
    return '无';
}

/* ---------------- 邮件配置：新建/编辑/删除 ---------------- */

function onCreate() {
    editing.value = null;
    Object.assign(form, emptyForm());
    dialogVisible.value = true;
}

function onEdit(row: MailConfigItem) {
    editing.value = row;
    Object.assign(form, {
        code: row.code,
        name: row.name,
        visibility: row.visibility,
        host: row.host,
        port: row.port,
        ssl: row.ssl !== false,
        account: row.account,
        password: '',
        senderName: row.senderName || '',
        from: row.from || '',
    });
    dialogVisible.value = true;
}

function validate(): string | null {
    if (!form.code.trim()) return '请填写编号';
    if (!form.host.trim()) return '请填写邮件服务器地址';
    if (!form.port) return '请填写端口';
    if (!form.account.trim()) return '请填写发信账号';
    if (!editing.value && !form.password) return '请填写密码/授权码';
    return null;
}

async function onSave() {
    const error = validate();
    if (error) {
        ElMessage.warning(error);
        return;
    }
    if (!currentUser.value) {
        ElMessage.error(userError.value || '未获取到当前用户信息');
        return;
    }
    if (!tenantId.value) {
        ElMessage.error(userError.value || '未获取到当前用户的租户信息');
        return;
    }
    if (!publicKey.value) {
        ElMessage.error('服务端公钥缺失，请刷新页面重试');
        return;
    }
    saving.value = true;
    try {
        await saveMailConfig(
            {
                id: editing.value?.id,
                code: form.code.trim(),
                name: form.name.trim(),
                visibility: form.visibility,
                host: form.host.trim(),
                port: form.port,
                ssl: form.ssl,
                account: form.account.trim(),
                password: form.password,
                senderName: form.senderName.trim(),
                from: form.from.trim(),
                userId: currentUser.value.id,
                ownerId: currentUser.value.id,
                ownerUserId: currentUser.value.userId,
                ownerCode: currentUser.value.code,
                ownerName: currentUser.value.name,
            },
            publicKey.value,
            tenantId.value
        );
        ElMessage.success('已保存');
        dialogVisible.value = false;
        await loadConfigs();
    } catch (e: any) {
        ElMessage.error(resolveApiError(e, '保存失败'));
    } finally {
        saving.value = false;
    }
}

function onDelete(row: MailConfigItem) {
    ElMessageBox.confirm(
        `确定删除配置「${row.code}」吗？删除后，使用该编号的应用将无法发送邮件。${
            row.inherited ? '该配置为改造前的共享数据，删除只影响当前租户。' : ''
        }`,
        '删除确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
        .then(async () => {
            if (!currentUser.value) return;
            try {
                await deleteMailConfig(row.id, currentUser.value.id, tenantId.value);
                ElMessage.success('已删除');
                await loadConfigs();
            } catch (e: any) {
                ElMessage.error(resolveApiError(e, '删除失败'));
            }
        })
        .catch(() => {
            // 取消删除
        });
}

/* ---------------- REST配置：新建/编辑/删除 ---------------- */

function onCreateRest() {
    restEditing.value = null;
    Object.assign(restForm, emptyRestForm());
    restDialogVisible.value = true;
}

function onEditRest(row: RestConfigItem) {
    restEditing.value = row;
    Object.assign(restForm, {
        code: row.code,
        name: row.name,
        visibility: row.visibility,
        url: row.url,
        method: row.method,
        authType: row.authType,
        apiKeyPlacement: row.apiKeyPlacement || 'header',
        apiKeyName: row.apiKeyName || '',
        // 密钥不回显：留空表示不修改
        apiKeyValue: '',
        bearerToken: '',
        headersText: row.headersText || '',
        contentType: row.contentType || 'application/json',
        timeoutMs: row.timeoutMs || 10000,
        description: row.description || '',
    });
    restDialogVisible.value = true;
}

function validateRest(): string | null {
    if (!restForm.code.trim()) return '请填写编号';
    if (!restForm.url.trim()) return '请填写请求地址';
    if (!/^https?:\/\//i.test(restForm.url.trim())) return '请求地址必须以 http:// 或 https:// 开头';
    if (restForm.authType === 'apiKey') {
        if (!restForm.apiKeyName.trim()) return '请填写 ApiKey 的参数名称';
        const keepExisting =
            restEditing.value?.authType === 'apiKey' && restEditing.value?.hasApiKeyValue === true;
        if (!restForm.apiKeyValue && !keepExisting) return '请填写 ApiKey 的密钥值';
    }
    if (restForm.authType === 'bearer') {
        const keepExisting =
            restEditing.value?.authType === 'bearer' && restEditing.value?.hasBearerToken === true;
        if (!restForm.bearerToken && !keepExisting) return '请填写 Bearer Token';
    }
    const lower = restForm.code.trim().toLowerCase();
    const duplicated = restConfigs.value.some(
        (item) => item.code.trim().toLowerCase() === lower && item.id !== restEditing.value?.id
    );
    if (duplicated) return `编号「${restForm.code.trim()}」在当前租户内已被使用，请换一个`;
    return null;
}

async function onSaveRest() {
    const error = validateRest();
    if (error) {
        ElMessage.warning(error);
        return;
    }
    if (!currentUser.value) {
        ElMessage.error(userError.value || '未获取到当前用户信息');
        return;
    }
    if (!tenantId.value) {
        ElMessage.error(userError.value || '未获取到当前用户的租户信息');
        return;
    }
    if (!publicKey.value) {
        ElMessage.error('服务端公钥缺失，请刷新页面重试');
        return;
    }
    restSaving.value = true;
    try {
        await saveRestConfig(
            {
                id: restEditing.value?.id,
                code: restForm.code.trim(),
                name: restForm.name.trim(),
                visibility: restForm.visibility,
                url: restForm.url.trim(),
                method: restForm.method,
                authType: restForm.authType,
                apiKeyPlacement: restForm.apiKeyPlacement,
                apiKeyName: restForm.apiKeyName.trim(),
                apiKeyValue: restForm.apiKeyValue,
                bearerToken: restForm.bearerToken,
                headersText: restForm.headersText,
                contentType: restForm.contentType.trim() || 'application/json',
                timeoutMs: restForm.timeoutMs,
                description: restForm.description.trim(),
                userId: currentUser.value.id,
                ownerId: currentUser.value.id,
                ownerUserId: currentUser.value.userId,
                ownerCode: currentUser.value.code,
                ownerName: currentUser.value.name,
            },
            publicKey.value,
            tenantId.value
        );
        ElMessage.success('已保存');
        restDialogVisible.value = false;
        await loadRestConfigs();
    } catch (e: any) {
        ElMessage.error(resolveApiError(e, '保存失败'));
    } finally {
        restSaving.value = false;
    }
}

function onDeleteRest(row: RestConfigItem) {
    ElMessageBox.confirm(
        `确定删除配置「${row.code}」吗？删除后，使用该编号的应用将无法调用该接口。${
            row.inherited ? '该配置为改造前的共享数据，删除只影响当前租户。' : ''
        }`,
        '删除确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
        .then(async () => {
            if (!currentUser.value) return;
            try {
                await deleteRestConfig(row.id, currentUser.value.id, tenantId.value);
                ElMessage.success('已删除');
                await loadRestConfigs();
            } catch (e: any) {
                ElMessage.error(resolveApiError(e, '删除失败'));
            }
        })
        .catch(() => {
            // 取消删除
        });
}

onMounted(() => {
    initialize();
});
</script>

<style scoped>
.my-resources-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.resource-card {
    border-radius: 8px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 0 !important;
}

.card-desc {
    margin: 0 0 14px;
    font-size: 13px;
    color: #909399;
    line-height: 20px;
}

.error-hint {
    color: #f56c6c;
    font-size: 13px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(245, 108, 108, 0.06);
    border-radius: 4px;
}

/* 播种自改造前共享数据的标签（跟在编号后面） */
.inherited-tag {
    margin-left: 6px;
}

/* 编辑继承配置时的提示（只影响当前租户） */
.inherited-note {
    color: #b88230;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    /* 顶部对齐：同一行里某项变高时，另一项不会被挤到中间 */
    align-items: start;
}

.form-row :deep(.el-form-item) {
    min-width: 0;
}

@media (max-width: 760px) {
    .form-row {
        grid-template-columns: 1fr;
        gap: 0;
    }
}

.port-input :deep(.el-input__inner) {
    text-align: left;
}

.full-width {
    width: 100%;
}

.auth-select {
    width: 260px;
}

/* 表单里的整行小提示（跟在某一行下面，与输入框左对齐；整行占满，不会出现单字换行） */
.form-note {
    margin: -8px 0 16px 120px;
    font-size: 12px;
    color: #909399;
    line-height: 18px;
}

.mail-form :deep(.el-form-item) {
    margin-bottom: 18px;
}

.call-hint {
    margin-top: 4px;
    padding: 12px 14px;
    border-radius: 6px;
    background: #f7f9fc;
    border: 1px solid #e4e9f2;
}

.call-hint-title {
    font-size: 13px;
    font-weight: 600;
    color: #606266;
    margin-bottom: 8px;
}

/* 调用示例的两个页签（后端 / 前端），收紧一下默认间距，避免弹框太长 */
.call-hint-tabs :deep(.el-tabs__header) {
    margin: 0 0 8px;
}

.call-hint-tabs :deep(.el-tabs__item) {
    height: 30px;
    line-height: 30px;
    font-size: 13px;
}

/* 示例里的小标题（如：① 工程 pom 中加入依赖） */
.call-hint-label {
    margin: 6px 0 6px;
    font-size: 12px;
    color: #606266;
}

.call-hint-label:first-child {
    margin-top: 0;
}

.call-hint-code {
    margin: 0;
    padding: 10px 12px;
    border-radius: 4px;
    background: #232936;
    color: #c9e3ff;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    line-height: 20px;
    white-space: pre-wrap;
    word-break: break-all;
}

.call-hint-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
    line-height: 18px;
}

:deep(.el-card__header) {
    border-bottom: none !important;
    padding: 0 !important;
}
</style>
