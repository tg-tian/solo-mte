import axios, { type AxiosResponse } from 'axios';

// 全局配置响应
interface GlobalConfigResponse {
    configValue?: string;
}

export interface UseIntelligentAssistant {
    createAssistantIframe: (isVisible: boolean) => HTMLIFrameElement;
    initStyles: () => void;
    // loadFloatingIconScript: () => void;
    handleBarMenuClick: () => void;
    msgCallTrigger: () => void;
    doMyWorkListner: () => void;
    init: () => void;
}

declare global {
    interface Window {
        customBarMenuCss?: {
            cssTest?: {
                doMyWorkListner: () => void;
                msgCallTrigger: () => void;
            };
        };
        AssistantIntgSDK?: {
            getGlobalState: (key: string) => string | undefined;
        };
    }
}

export function useIntelligentAssistant(): UseIntelligentAssistant {
    const rtfService = window.gspframeworkService?.rtf;
    const toolbarEvent = rtfService?.toolbarEvent;
    const funcService = rtfService?.func;

    let stylesInjected = false;
    let barMenuListenerAttached = false;

    // 监听嵌入宽度变化
    const bindWidthChangeListener = (): void => {
        window.addEventListener('message', (event: MessageEvent) => {
            try {
                const data = event.data as { type?: string; width?: string };
                if (data && data.type === 'assistant-embedded-width-change') {
                    const iframe = document.getElementById('rtfrobot-ifra') as HTMLElement | null;
                    if (iframe && data.width) {
                        iframe.style.width = data.width;
                    }
                }
            } catch (e) {
                console.warn('处理宽度变化消息时出错:', e);
            }
        });
    };

    // 创建 iframe
    const createAssistantIframe = (isVisible: boolean): HTMLIFrameElement => {
        const dialogWeb = document.createElement('iframe');
        dialogWeb.src = `/platform/runtime/sys/web/intelligentassistant/index.html?timespan=${Date.now()}&type=embedded&chatWidth=400&chatHeight=690`;
        dialogWeb.id = 'rtfrobot-ifra';
        dialogWeb.className = 'rtf-robot-iframe';
        dialogWeb.style.cssText =
            `position:absolute;bottom:2px;right:2px;border:none;display:${isVisible ? 'block' : 'none'};` +
            'z-index:999;border-radius:12px;box-shadow:0 0 12px 0 rgba(0,32,74,0.12);';
        dialogWeb.setAttribute('allowTransparency', 'true');
        return dialogWeb;
    };

    // 读取配置 BAR_SHOW_AST_TYPE
    const fetchBarShowType = async (): Promise<string | undefined> => {
        try {
            const res: AxiosResponse<GlobalConfigResponse> = await axios.get(
                '/api/runtime/sys/v1.0/ast/manager/globalconfig/id/BAR_SHOW_AST_TYPE',
                {
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
            return res.data?.configValue;
        } catch (e) {
            return undefined;
        }
    };

    // 样式注入
    const initStyles = (): void => {
        if (stylesInjected) return;
        const head = document.head;
        const robotStyle = document.createElement('style');
        robotStyle.type = 'text/css';
        robotStyle.innerHTML = `
            .rtf-robot-iframe {
                width:400px;
                height:690px;
                max-height: calc(100vh - 90px);
            }
            @media screen and (max-width: 1280px){
                .rtf-robot-iframe {
                    width: 400px;
                    height: calc(100vh - 90px);
                }
            }
            .rtf-robot-maximize {
                width: 100vw !important;
                height: 100vh !important;
                top: 0 !important;
                left: 0 !important;
            }
            @keyframes handSwing {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(15deg); }
                50% { transform: rotate(0deg); }
                75% { transform: rotate(-15deg); }
                100% { transform: rotate(0deg); }
            }
            .hand-animate {
                animation: handSwing 1s 2 ease-in-out;
                transform-origin: 85% 20%;
            }`;
        head.appendChild(robotStyle);
        stylesInjected = true;
    };

    // 加载悬浮图标脚本
    // const loadFloatingIconScript = (): void => {
    //     try {
    //         const floatingIconScriptUrl = '/platform/runtime/sys/web/frm-extend/assistant-floating-icon.js?v=20251125002';
    //         if (!floatingIconScriptUrl) {
    //             console.warn('悬浮图标脚本URL未定义，跳过加载');
    //             return;
    //         }
    //         const body = document.body;
    //         const robotScript = document.createElement('script');
    //         robotScript.src = floatingIconScriptUrl;
    //         robotScript.async = true;
    //         robotScript.onerror = () => {
    //             console.warn('加载悬浮图标控制脚本失败，但不会影响其他功能:', floatingIconScriptUrl);
    //         };
    //         if (body) {
    //             body.appendChild(robotScript);
    //         } else {
    //             console.warn('document.body不存在，无法加载悬浮图标脚本');
    //         }
    //     } catch (err) {
    //         console.warn('加载悬浮图标脚本时出错，但不会影响其他功能:', err);
    //     }
    // };

    // 处理 toolbar 菜单点击
    const handleBarMenuClick = (): void => {
        if (!toolbarEvent || barMenuListenerAttached) return;
        toolbarEvent.barMenuClickListenr(async (res: { barId?: string }) => {
            if (!res || res.barId !== 'rtfrobot-ifra') return;

            const configValue = await fetchBarShowType();
            if (configValue === 'full') {
                if (funcService?.openMenu) {
                    funcService.openMenu({ funcId: 'e8918120-5664-1796-a455-64369fbfec38' });
                }
                return;
            }

            // 原有逻辑
            try {
                if (!document.getElementById('rtfrobot-ifra')) {
                    const body = document.body;
                    const dialogWeb = createAssistantIframe(true);
                    if (body) {
                        body.appendChild(dialogWeb);
                    } else {
                        console.warn('document.body不存在，无法创建智能助手iframe');
                    }
                } else {
                    let iframe: HTMLElement | null = null;
                    try {
                        iframe = window.parent.document.getElementById('rtfrobot-ifra');
                    } catch (_e) {
                        iframe = document.getElementById('rtfrobot-ifra');
                    }
                    if (iframe) {
                        const intg = window.top?.AssistantIntgSDK;
                        if (intg?.getGlobalState?.('__viewStatus') === 'embedded') {
                            iframe.style.display = 'block';
                        }
                    }
                }

                const logo = document.getElementById('rtfrobot-logo');
                if (logo) {
                    logo.style.display = 'none';
                }
            } catch (err) {
                console.warn('创建或显示智能助手iframe时出错，但不会影响其他功能:', err);
            }
        });
        barMenuListenerAttached = true;
    };

    // 保留接口，当前无逻辑
    const doMyWorkListner = (): void => {};

    // 初始化消息触发
    const msgCallTrigger = (): void => {
        try {
            // const toolbarEvt = window.gspframeworkService?.rtf?.toolbarEvent;

            if (!document.getElementById('rtfrobot-logo') && !document.getElementById('rtfrobot-ifra')) {
                initStyles();

                const body = document.body;
                const dialogWeb = createAssistantIframe(false);
                if (body) {
                    body.appendChild(dialogWeb);
                }

                // loadFloatingIconScript();
            }
        } catch (e) {
            console.warn('初始化智能助手模块时出错:', e);
        }
    };

    const init = (): void => {
        // 对齐原脚本：注册监听并触发默认行为
        window.customBarMenuCss = window.customBarMenuCss || {};
        window.customBarMenuCss.cssTest = window.customBarMenuCss.cssTest || {
            doMyWorkListner: () => {},
            msgCallTrigger: () => {}
        };

        bindWidthChangeListener();
        handleBarMenuClick();
        doMyWorkListner();
        msgCallTrigger();
    };

    return {
        createAssistantIframe,
        initStyles,
        // loadFloatingIconScript,
        handleBarMenuClick,
        msgCallTrigger,
        doMyWorkListner,
        init
    };
}