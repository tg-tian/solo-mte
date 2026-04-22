import { defineComponent, ref, inject, onMounted } from "vue";
import { workbenchContentProps } from "./workbench-content.props";
import WelcomeContent from "../welcome-content/welcome-content.component";
import { FunctionInstance, UseFunctionInstance } from "../../composition/types";
import type { WelcomePromptItem } from "../welcome-content/components/prompts/welcome-prompts.props";

export default defineComponent({
    name: "WorkbenchContent",
    props: workbenchContentProps,
    emits: ["sendMessage", "userAuthConfirm", "expandNav", "compactModeChange"],
    setup(props, { emit, expose }) {
        const conversationRef = ref<{ insertAgentMention: (name: string) => void } | null>(null);
        const welcomeContentRef = ref<{ insertAgentMention: (name: string) => void } | null>(null);
        const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        const { activeInstanceId, functionInstances, conversations, close, openUrl, openNewConversation, createConversation, addConversationTab } = useFunctionInstanceComposition;

        function onClickFunctionTabItem(functionInstance: FunctionInstance) {
            activeInstanceId.value = functionInstance.instanceId;
        }

        onMounted(() => {
            window.addEventListener('message', (message: MessageEvent) => {
                const messageEvent = message.data;
                if (typeof messageEvent === 'object' && messageEvent.eventType === 'invoke') {
                    const invokeMethod = messageEvent.method;
                    if (invokeMethod === 'openUrl') {
                        const [functionId, code, name, url] = messageEvent.params;
                        openUrl(functionId, code, name, url);
                    } else if (invokeMethod === 'sendMessage') {
                        const [content] = messageEvent.params;
                        emit('sendMessage', content);
                    }
                }
            });
        });

        function getFunctionTabClass(functionInstance: FunctionInstance) {
            return {
                'wb-content-tab': true,
                'wb-content-tab--active': functionInstance.instanceId === activeInstanceId.value,
                'wb-content-tab--fix': Boolean(functionInstance.fix),
            } as Record<string, boolean>;
        }

        function getFunctionContentClass(functionInstance: FunctionInstance) {
            return {
                'wb-content-pane': true,
                'wb-content-pane--active': functionInstance.instanceId === activeInstanceId.value,
            } as Record<string, boolean>;
        }

        expose({
            insertAgentMention: (name: string) => {
                conversationRef.value?.insertAgentMention(name);
                welcomeContentRef.value?.insertAgentMention(name);
            },
        });

        // 通过提示集打开新会话
        async function handleOpenConversation(item: WelcomePromptItem) {
            const { title, conversationUrl } = item;
            try {
                await openNewConversation(conversationUrl ?? '');
            } catch (error) {
                const conv = createConversation(title, [], []);
                addConversationTab(conv);
            }
        }

        function renderFunctionContent(functionInstance: FunctionInstance) {
            return <iframe title={functionInstance.instanceId} src={functionInstance.url}></iframe>;
        }

        function renderContents() {
            return functionInstances.value.map((functionInstance: FunctionInstance) => {
                return (
                    <div key={functionInstance.instanceId} class={getFunctionContentClass(functionInstance)}>
                        {renderFunctionContent(functionInstance)}
                    </div>
                );
            });
        }

        function renderTabs() {
            return (
                <div class="wb-content-tabs">
                    <div class="wb-content-tabs__inner">
                        {functionInstances.value.map((tabItem: FunctionInstance, index: number) => {
                            const isActive = tabItem.instanceId === activeInstanceId.value;
                            const tabClasses = {
                                ...getFunctionTabClass(tabItem),
                                'wb-content-tab--first': index === 0,
                            };
                            return (
                                <div
                                    key={tabItem.instanceId}
                                    class={tabClasses}
                                    onClick={() => onClickFunctionTabItem(tabItem)}
                                >
                                    <span class="wb-content-tab__title">{tabItem.name || '未命名'}</span>
                                    {!tabItem.fix && (
                                        <button
                                            type="button"
                                            class="wb-content-tab__close"
                                            onClick={(e: Event) => {
                                                e.stopPropagation();
                                                close(tabItem.instanceId);
                                            }}
                                            title="关闭"
                                            aria-label="关闭"
                                        >
                                            <i class="f-icon f-icon-close"></i>
                                        </button>
                                    )}
                                    {isActive && (
                                        <>
                                            {/* 右侧圆角遮罩 */}
                                            <svg
                                                class="wb-content-tab__corner wb-content-tab__corner--br"
                                                width="10"
                                                height="10"
                                                xmlns="http://www.w3.org/2000/svg"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="M 10,10 A 10,10 0 0 1 0,0 L 0,10 L 10,10 Z"
                                                    fill="#fff"
                                                />
                                            </svg>
                                            {/* 非第一个 tab 左侧圆角遮罩 */}
                                            {index !== 0 && (
                                                <svg
                                                    class="wb-content-tab__corner wb-content-tab__corner--bl"
                                                    width="10"
                                                    height="10"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M 0,10 A 10,10 0 0 0 10,0 L 10,10 L 0,10 Z"
                                                        fill="#fff"
                                                    />
                                                </svg>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        const renderWelcome = () => (
            <WelcomeContent
                ref={welcomeContentRef}
                chatTitle={props.chatTitle}
                chatSubtitle={props.chatSubtitle}
                agents={props.agents}
                assistiveTools={props.assistiveTools}
                skillOptions={props.skillOptions}
                currentAgentId={props.currentAgentId}
                onSendMessage={(content: string) => emit('sendMessage', content)}
                onOpenConversation={handleOpenConversation}
            />
        );

        function renderWorkbenchContent() {
            return (
                <div class="workbench-content-shell">
                    {renderTabs()}
                    <div class="wb-content-body">{renderContents()}</div>
                </div>
            );
        }

        return () => (
            <div
                class={[
                    'workbench-content-root',
                    { 'workbench-content-root--hidden': props.agentHubOpen },
                ]}
            >
                {functionInstances.value.length === 0 ? (
                    <div class="workbench-content-welcome">{renderWelcome()}</div>
                ) : (
                    renderWorkbenchContent()
                )}
            </div>
        );
    },
});
