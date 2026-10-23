import { computed, defineComponent, provide, ref } from 'vue'
import { getCurrentUser, getCurrentUserId } from '../../../../../../src/utils/current-user'
import { FNav } from '@farris/ui-vue'
import FApps from './components/apps/apps.component'
import FWelcome from './components/welcome/welcome.component'
import Env from './components/env/env.vue'
import Device from './components/device/device.vue'
import FAppDeployConfig from './components/deploy-config/deploy-config.vue'
import FMyResources from './components/my-resources/my-resources.vue'
import { useAppDomain } from "./composition/use-app-domain";
import { useAppConfig } from "./composition/use-app-config";
import { AppConfigOptions, WorkspaceOptions } from "./composition/type";
import { useWorkspace } from "./composition/use-workspace";
import './style.css';


type ViewKey = 'start' | 'my-apps' | 'my-resources' | 'deploy-config' | 'env' | 'device'

export default defineComponent({
  name: 'FAAppCenter',
  setup() {
    const defaultTitle = 'SOLO - 场景低代码开发平台'
    const title = ref(defaultTitle)
    const currentView = ref<ViewKey>('device')
    const sceneId = ref<number | undefined>(undefined)
    const scenes = ref<Array<{ sceneId: number; name: string }>>([])
    const initialized = ref(false)
    const initializationError = ref('')
    const workspace = ref('');
    const workspaceId = ref('');
    const currentUserName = ref('');
    getCurrentUser().then((user) => {
      currentUserName.value = user.name || user.userId;
    });


    const navData = [
      { id: 'start', text: '开始' },
      { id: 'my-apps', text: '我的应用' },
      { id: 'my-resources', text: '我的资源' },
      { id: 'deploy-config', text: '部署配置' },
      { id: 'env', text: '我的环境' },
      { id: 'device', text: '我的物理设备' },
    ]
    // 初始化Farris Admin全局配置对象
    const config = useAppConfig();
    // 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
    const configInitialized = config.initialize();
    // 初始化导航菜单数据
    const useAppDomainComposition = useAppDomain();
    // 监听Farris Admin全局配置对象初始化完成事件
    configInitialized.then((result: AppConfigOptions) => {
      title.value = result.appTitle || defaultTitle;
      sceneId.value = result.sceneId;
      scenes.value = result.scenes || [];
      if (typeof document !== 'undefined') {
        document.title = title.value;
      }
      useAppDomainComposition.setAppDomainSourceUri(result.appDataSourceUri);
      // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
      useAppDomainComposition.generateAppDomain(result.appDataSourceUri);
    }).catch((error) => {
      initializationError.value = error.message || '场景加载失败，请刷新页面重试';
    }).finally(() => {
      initialized.value = true;
    });
    const useWorkspaceComposition = useWorkspace();
    const workspaceInitialized = useWorkspaceComposition.initialize();
    workspaceInitialized.then((result: WorkspaceOptions) => {
      workspace.value = result.name;
      workspaceId.value = result.id;
    });
    const shouldShowWelcome = computed(() => currentView.value === 'start')
    const shouldShowAppsView = computed(() => currentView.value === 'my-apps')
    const shouldShowMyResources = computed(() => currentView.value === 'my-resources')
    const shouldShowDeployConfig = computed(() => currentView.value === 'deploy-config')
    const shouldShowEnv = computed(() => currentView.value === 'env')
    const shouldShowDevice = computed(() => currentView.value === 'device')

    function onClickNavigationItem(navItem: Record<string, any>) {
      currentView.value = navItem.id as ViewKey
    }

    function renderTitleArea() {
      return (
        <div class="f-title">
          <div class="f-title-logo"></div>
          <h4 class="f-title-text">{title.value}</h4>
        </div>
      )
    }

    function renderHeaderTabs() {
      return (
        <div class="f-content">
          <FNav activeNavId={currentView.value} navData={navData} displayField="text" onNav={onClickNavigationItem}></FNav>
        </div>
      )
    }

    async function selectScene(event: Event) {
      const id = Number((event.target as HTMLSelectElement).value);
      const selected = scenes.value.find((scene) => scene.sceneId === id);
      if (!selected) return;
      const userId = await getCurrentUserId();
      sessionStorage.setItem(`ide:${encodeURIComponent(userId)}:sceneId`, String(id));
      sceneId.value = id;
      title.value = selected.name;
      document.title = selected.name;
    }

    // 在依赖注入服务中应用程序域服务
    provide('f-app-center-app-domain', useAppDomainComposition);

    provide('f-app-center-workspace', useWorkspaceComposition);

    function renderToolbar() {
      return <div class="f-header-toolbar">
        <ul class="nav d-flex items-center">
          {scenes.value.length > 1 && <li>
            <select aria-label="选择场景" value={sceneId.value} onChange={selectScene}>
              {scenes.value.map((scene) => <option key={scene.sceneId} value={scene.sceneId}>{scene.name}</option>)}
            </select>
          </li>}
          <li class="f-app-center-workspace">{workspace.value}<span class="f-icon f-icon-arrow-s"></span></li>
          <li class="f-app-center-toolbar-split" style="height: 20px;border-right: 1px solid #ccc;"></li>
          <li class="f-app-center-user">
            <div class="f-app-center-user-icon">
              <i class="f-icon f-icon-top_my"></i>
            </div>
            <span class="f-app-center-user-name">{currentUserName.value}</span>
          </li>
        </ul>
      </div>;
    }

    return () => {
      return (
        <div class="f-page f-page-navigate f-admin-app-center">
          <div class="f-page-header">
            <nav class="f-page-header-base">
              {renderTitleArea()}
              {renderHeaderTabs()}
              {renderToolbar()}
            </nav>
          </div>
          <div class="f-page-main">
            {initializationError.value && <div role="alert">{initializationError.value}</div>}
            {initialized.value && !initializationError.value && !sceneId.value && (shouldShowEnv.value || shouldShowDevice.value)
              && <div role="status">当前用户暂无可用场景，请先导入或关联场景数据。</div>}
            {shouldShowWelcome.value && <FWelcome>Welcome</FWelcome>}
            {shouldShowAppsView.value && <FApps>AppList</FApps>}
            {shouldShowMyResources.value && <FMyResources />}
            {shouldShowDeployConfig.value && <FAppDeployConfig />}
            {shouldShowEnv.value && sceneId.value && <Env key={sceneId.value} sceneId={sceneId.value} />}
            {shouldShowDevice.value && sceneId.value && <Device key={sceneId.value} sceneId={sceneId.value} />}
          </div>
        </div>
      )
    }
  },
})
