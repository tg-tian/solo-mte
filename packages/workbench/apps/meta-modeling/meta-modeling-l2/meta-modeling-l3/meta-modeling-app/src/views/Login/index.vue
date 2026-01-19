<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>面向场景计算的低代码开发元工具环境平台</h2>
      </div>
      
      <el-form
        :model="loginForm"
        :rules="rules"
        ref="loginFormRef"
        label-width="0"
        class="login-form"
      >
        <el-form-item prop="username" label="用户名" label-width="100px">
          <el-input 
            v-model="loginForm.username" 
            prefix-icon="User"
            placeholder="用户名"
            class="login-form-input"
          ></el-input>
        </el-form-item>
        
        <el-form-item prop="password" label="密码" label-width="100px">
          <el-input 
            v-model="loginForm.password" 
            prefix-icon="Lock"
            type="password"
            placeholder="密码"
            @keyup.enter="handleLogin"
            class="login-form-input"
          ></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-button" 
            :loading="loading"
            @click="handleLogin"
          >登录</el-button>
        </el-form-item>
      </el-form>
      
      <!-- <div class="login-tips">
        <p>默认用户名：admin</p>
        <p>默认密码：123456</p>
      </div> -->
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: 'admin',
  password: '123456'
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const success = await userStore.login(loginForm)
        if (success) {
          ElMessage.success('登录成功')
          router.push('/')
        } else {
          ElMessage.error('用户名或密码错误')
        }
      } catch (error) {
        ElMessage.error('登录失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f3f5f7;
}

.login-card {
  width: 500px;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  font-size: 22px;
  color: #303133;
}

.login-form {
  margin-bottom: 20px;
}

.login-form-input {
  width: 80%;
}

.login-button {
  width: 100%;
}

.login-tips {
  text-align: center;
  font-size: 12px;
  color: #909399;
}

.login-tips p {
  margin: 5px 0;
}
</style>
