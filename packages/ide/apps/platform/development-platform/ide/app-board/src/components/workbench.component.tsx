import { defineComponent, ref, onMounted, provide } from 'vue';
import { FLayout, FLayoutPane } from '@farris/ui-vue';
import NavPanel from './nav-panel/nav-panel.component';
import FunctionBoard from './function-board/function-board.component';
import WorkbenchContent from './workbench-content/workbench-content.component';
import { useFunctionInstance } from '../composition/use-function-instance';
import { useWorkAreaInstance } from '../composition/use-work-area-instance';
import { useConfig } from '../composition/use-config';
import { useMenuData } from '../composition/use-menu-data';
import { ConfigOptions } from '../composition/types';

const NAV_ACTIONS: any[] = [
  { id: 'function-board', icon: '', label: '应用全景' },
  { id: 'dash-board', icon: '', label: '工作台' },
];

export default defineComponent({
  name: 'WorkbenchComponent',
  setup() {
    const title = ref('');
    const chatNavPaneRef = ref();
    const chatNavPaneCollapsed = ref(false);
    const chatContentPaneRef = ref();
    const chatContentPaneWidth = 480;
    const activeNavId = ref<string | null>('function-board');
    const workbenchContentRef = ref<{ insertAgentMention: (name: string) => void } | null>(null);
    const layoutCompact = ref(false);


    // 初始化Farris Admin全局配置对象
    const config = useConfig();
    // 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
    const configInitialized = config.initialize();
    // 初始化功能菜单实例管理服务
    const useFunctionInstanceComposition = useFunctionInstance(config);

    const useWorkAreaInstanceComposition = useWorkAreaInstance();
    // 初始化导航菜单数据
    const useMenuDataComposition = useMenuData();
    // 监听Farris Admin全局配置对象初始化完成事件
    configInitialized.then((result: ConfigOptions) => {
      title.value = result.title;
      useWorkAreaInstanceComposition.loadWorkAreaConfiguration(result.workAreaSourceUri);
      // useWorkAreaInstanceComposition.setResidentInstance(result.residentWorkAreas);
      // 根据配置选项设置初始状态下打开的预制菜单，默认状态下为用户工作中心首页
      // useFunctionInstanceComposition.setResidentInstance(result.residentFunctions);
      // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
      useMenuDataComposition.generateFunctionMenu(result.functionSourceUri);
    });

    // 在依赖注入服务中注册功能菜单实例管理服务
    provide('f-admin-function-instance', useFunctionInstanceComposition);
    // 在依赖注入服务中注册功能菜单数据服务
    provide('f-admin-menu-data', useMenuDataComposition);

    provide('f-admin-config', config);

    function collapseChatNavPane() {
      chatNavPaneCollapsed.value = true;
    }

    function expandChatNavPane() {
      chatNavPaneCollapsed.value = false;
    }

    function renderNavPanel() {
      return (
        <NavPanel
          navTitle={title.value}
          navActions={navActions}
          agents={[]}
          userInfo={{ name: '15010798888' }}
          primaryActionId="new-task"
          activeNavId={activeNavId.value}
          collapsed={chatNavPaneCollapsed.value}
          navWidth={chatNavPaneCollapsed.value ? 64 : 260}
          onCollapse={collapseChatNavPane}
          onExpand={expandChatNavPane}
          onNavigate={(id: string) => {
            activeNavId.value = id;
          }}
        />
      );
    }

    const navActions = NAV_ACTIONS.map((a) => ({
      ...a,
      onClick: () => {
        activeNavId.value = String(a.id);
      },
    }));

    onMounted(() => {
      const topWindow = window.top;
      if (topWindow) {
        (topWindow as Window & { sendMessage: (content: string) => void }).sendMessage = (content: string) => {
          topWindow.postMessage({
            eventType: 'invoke',
            method: 'sendMessage',
            params: [content],
          }, '*');
        };
      }
    });


    return () => (
      <div class="workbench-page">
        <div class="workbench-main">
          <div class="conversation-container">
            <FLayout class={['f-chat', { 'f-chat-compact': layoutCompact.value }]}>
              {!layoutCompact.value && (
                <FLayoutPane
                  key={chatNavPaneCollapsed.value ? 'collapsed' : 'expanded'}
                  ref={chatNavPaneRef}
                  position="left"
                  resizable={false}
                  width={chatNavPaneCollapsed.value ? 64 : 260}
                  minWidth={48}
                  class={chatNavPaneCollapsed.value ? 'chat-nav-pane-collapsed' : 'chat-nav-pane-expanded'}
                >
                  {renderNavPanel()}
                </FLayoutPane>
              )}
              <FLayoutPane
                ref={chatContentPaneRef}
                position="center"
                width={chatContentPaneWidth}
                resizable={false}
                class="f-chat-center-pane"
              >
                <div class="f-chat-center-stack">
                  <div
                      class={[
                        'f-chat-center-panel',
                        'f-chat-center-panel--workbench',
                        {'is-active': activeNavId.value === 'new-task'},
                      ]}
                  >
                    <WorkbenchContent
                      ref={workbenchContentRef}
                      agents={[]}
                      chatTitle="我是 AI Agent"
                      chatSubtitle="为你答疑、办事，可随时找我聊天"
                      assistiveTools={[]}
                      skillOptions={[]}
                      navPaneCollapsed={chatNavPaneCollapsed.value}
                      onSendMessage={() => {}}
                      onExpandNav={expandChatNavPane}
                      onCompactModeChange={(v: boolean) => {
                        layoutCompact.value = v;
                      }}
                    />
                  </div>
                  <div
                      class={[
                        'f-chat-center-panel',
                        'f-chat-center-panel--function-board',
                        {'is-active': activeNavId.value === 'function-board'},
                      ]}
                  >
                    <FunctionBoard
                        modelValue={activeNavId.value === 'function-board'}
                        onUpdate:modelValue={(v: boolean) => {
                          if (!v) activeNavId.value = 'new-task';
                        }}
                        onFunctionOpened={() => {
                          activeNavId.value = 'new-task';
                        }}
                    />
                  </div>
                </div>
              </FLayoutPane>
            </FLayout>
          </div>
        </div>
      </div>
    );
  },
});
