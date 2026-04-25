<template>
  <component :is="currentView" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, provide } from 'vue';
import WorkbenchComponent from './components/workbench.component';
import { useAppDomain } from "./composition/use-app-domain";
import { useAppConfig } from "./composition/use-app-config";
import { AppConfigOptions, WorkspaceOptions } from "./composition/type";
import { useWorkspace } from "./composition/use-workspace";

const currentPath = ref(window.location.hash);

const routes: Record<string, any> = {
  '/': WorkbenchComponent,
};

const currentView = computed(() => {
  const routePath: string = `/${currentPath.value.slice(1)}` || '/';
  return routes[routePath] || WorkbenchComponent;
});

onMounted(() => {
  window.addEventListener('hashchange', () => {
    currentPath.value = window.location.hash;
  });
});

// 初始化Farris Admin全局配置对象
const config = useAppConfig();
// 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
const configInitialized = config.initialize();
// 初始化导航菜单数据
const useAppDomainComposition = useAppDomain();
// 监听Farris Admin全局配置对象初始化完成事件
configInitialized.then((result: AppConfigOptions) => {
  useAppDomainComposition.setAppDomainSourceUri(result.appDataSourceUri);
  // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
  useAppDomainComposition.generateAppDomain(result.appDataSourceUri);
});
const useWorkspaceComposition = useWorkspace();
const workspaceInitialized = useWorkspaceComposition.initialize();
workspaceInitialized.then((result: WorkspaceOptions) => {
});

// 在依赖注入服务中应用程序域服务
provide('f-app-board-app-domain', useAppDomainComposition);

provide('f-app-board-workspace', useWorkspaceComposition);

</script>

<style lang="scss">
html,
body {
  height: 100%;
  margin: 0;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

<style scoped lang="scss">
.conversation-container {
  display: flex;
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.demo-container {
  background: #fff;
  height: 100%;
  // display: flex;
  // flex-direction: column;
  // align-items: stretch;
  width: 100%;

  :deep(> .demo-content) {
    max-width: 80%;
    margin: 0 auto 40px;
    // background: #F5FAFF;
    border: 1px solid rgba(230, 233, 240, 0.7);
    border-radius: 18.29px;
    padding: 32px;
  }

  :deep(.fx-tmpl-001 .fx-prompt--only-children) {
    height: 100%;
  }

  :deep(.fx-tmpl-001 .fx-prompt--only-children .fx-prompt) {
    height: 100%;
  }
}
</style>
