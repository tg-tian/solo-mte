import { computed, defineComponent, provide, ref } from 'vue'
import { FNav } from '@farris/ui-vue'
import FApps from './components/apps/apps.component'
import FWelcome from './components/welcome/welcome.component'
import Env from './components/env/env.vue'
import Device from './components/device/device.vue'
import './style.css'

type ViewKey = 'start' | 'my-apps' | 'env' | 'device'

export default defineComponent({
  name: 'FAAppCenter',
  setup() {
    const title = ref('SOLO - 场景低代码开发平台')
    const currentView = ref<ViewKey>('device')

    const navData = [
      { id: 'start', text: '开始' },
      { id: 'my-apps', text: '我的应用' },
      { id: 'env', text: '我的环境' },
      { id: 'device', text: '我的物理设备' },
    ]

    const shouldShowWelcome = computed(() => currentView.value === 'start')
    const shouldShowAppsView = computed(() => currentView.value === 'my-apps')
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

    function renderToolbar() {
      return <div class="f-header-toolbar"></div>
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
            {shouldShowWelcome.value && <FWelcome>Welcome</FWelcome>}
            {shouldShowAppsView.value && <FApps>AppList</FApps>}
            {shouldShowEnv.value && <Env sceneId={28} />}
            {shouldShowDevice.value && <Device sceneId={28} />}
          </div>
        </div>
      )
    }
  },
})
