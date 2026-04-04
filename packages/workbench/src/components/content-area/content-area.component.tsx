import { defineComponent, inject, onMounted, withModifiers } from 'vue';
import { ConfigOptions, FunctionInstance, UseConfig, UseFunctionInstance } from '../../composition/types';

import './content-area.css';
import { useFunctionInstance } from '../../composition/use-function-instance';
import { contentAreaProps, ContentAreaProps } from './content-area.props';

export default defineComponent({
    name: 'FAContentArea',
    props: contentAreaProps,
    emits: [],
    setup(props: ContentAreaProps, context) {
        const useConfigInstance = inject('f-admin-config') as UseConfig;
        // 初始化功能菜单实例管理服务
        const useFunctionInstanceComposition = useFunctionInstance(useConfigInstance);
        // const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        const { activeInstanceId, functionInstances, close, open, openUrl, setResidentInstance } = useFunctionInstanceComposition;
        setResidentInstance(props.residentFunctions);

        function onClickFunctionTabItem(functionInstance: FunctionInstance) {
            activeInstanceId.value = functionInstance.instanceId;
        }

        function getFunctionTabClass(functionInstance: FunctionInstance) {
            const classObject = {
                'active': functionInstance.instanceId === activeInstanceId.value,
                'fix': functionInstance.fix,
                'f-admin-main-tab-item': true
            } as Record<string, true>;
            return classObject;
        }

        function getFunctionContentClass(functionInstance: FunctionInstance) {
            const classObject = {
                'active': functionInstance.instanceId === activeInstanceId.value,
                'f-admin-main-tab-content': true
            } as Record<string, true>;
            return classObject;
        }

        function renderTabs() {
            return <div class="f-admin-main-tabs">
                <div class="f-admin-main-tabs-content">
                    {functionInstances.value.map((tabItem: FunctionInstance) => {
                        return <div class={getFunctionTabClass(tabItem)} onClick={(payload: MouseEvent) => onClickFunctionTabItem(tabItem)}>
                            {tabItem.icon && <span><i class={tabItem.icon}></i></span>}
                            {tabItem.name && <span>{tabItem.name}</span>}
                            {!tabItem.fix && <div class="f-admin-main-tab-item-close" onClick={withModifiers(() => close(tabItem.instanceId), ['stop'])}>
                                <i class="f-icon f-icon-close"></i>
                            </div>}
                        </div>;
                    })}
                </div>
                <div class="f-admin-main-tabs-background"></div>
            </div>;
        }

        function renderContents() {
            return functionInstances.value.map((functionInstance: FunctionInstance) => {
                return <div class={getFunctionContentClass(functionInstance)}>
                    <iframe title={functionInstance.instanceId} src={functionInstance.url}></iframe>
                </div>;
            });
        }

        onMounted(() => {
            window.addEventListener('message', (message: MessageEvent) => {
                const messageEvent = message.data;
                if (typeof messageEvent === 'object' && messageEvent.eventType === 'invoke') {
                    const invokeMethod = messageEvent.method;
                    if (invokeMethod === 'openUrl') {
                        const [functionId, code, name, url] = messageEvent.params;
                        openUrl(functionId, code, name, url);
                    } else if (invokeMethod === 'closeUrl') {
                        close(activeInstanceId.value);
                    }
                }
            });
        });

        context.expose({ open });

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard">
                    <div class="f-admin-main-header"></div>
                    {props.showHeader && renderTabs()}
                    <div class="f-admin-main-content">
                        {renderContents()}
                    </div>
                </div>
            );
        };
    }
});
