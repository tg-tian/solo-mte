<template>
  <div class="header">
    <div class="header-title" style="cursor: pointer" @click="router.push({path:'/'})">
      <div style="line-height: 32px; padding-left: 10px">{{ title }}</div>
    </div>
    
    <div class="header-right">
      <el-dropdown @command="handleCommand">
        <span class="el-dropdown-link">
          <el-avatar 
            :size="32" 
            :src="userStore.user?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
          ></el-avatar>
          <span style="margin-left: 8px; color: #333">{{ userStore.user?.displayName || '用户' }}</span>
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人信息</el-dropdown-item>
            <el-dropdown-item command="settings">系统设置</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useDomainStore } from '@/store/domain' // added import
import { computed } from 'vue'

interface State {
  title: string
}

const state = reactive<State>({
  title: '面向场景计算的低代码开发元工具环境平台'
})
const { title } = toRefs(state)

const router = useRouter()
const userStore = useUserStore()
const domainStore = useDomainStore()  // new
const currentDomain = computed(() => domainStore.currentDomain)  // new

watchEffect(() => {
  const path = router.currentRoute.value.path
  if (path.startsWith('/domain/scene')) {  // new branch for domain scene pages
    if (currentDomain.value) {
      // Use domainName or fallback
      title.value = `${currentDomain.value.domainName}-详情`
    } else {
      title.value = '领域低代码开发平台'
    }
  } else if (path.startsWith('/domain')) {
    title.value = '领域低代码开发平台'
  } else if (path.startsWith('/scene')) {
    title.value = '场景低代码开发平台'
  } else {
    title.value = '面向场景计算的低代码开发元工具环境平台'
  }
})

const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm(
      '确定要退出登录吗?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      userStore.logout()
      router.push('/login')
    }).catch(() => {})
  } else if (command === 'profile') {
    // 个人信息页面
    ElMessage.info('个人信息功能开发中')
  } else if (command === 'settings') {
    // 系统设置页面
    ElMessage.info('系统设置功能开发中')
  }
}
</script>
  
<style>
.header {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ecf4fc;
}

.header-title {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  font-family: 'Courier New', Courier, monospace;
  display: flex;
  justify-content: space-evenly;
  margin-left: 20px;
}

.header-right {
  margin-right: 20px;
  display: flex;
}

.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
}
</style>
