import axios, { AxiosResponse } from 'axios';

// 助手状态接口
interface AssistantState {
    assistantMode: number;
    userShow: string;
}

// 全局配置响应接口
interface GlobalConfigResponse {
    docContent?: {
        url?: string;
    };
    configValue?: string;
}

// 消息和待办数量对象
interface NumberAstEvent {
    msgCount: string;
    wfCount: string;
}

// 待办项接口
interface TodoItem {
    getText: () => string;
    menuId: string;
    count: () => string;
}

// UseAssistantIcon 接口定义
export interface UseAssistantIcon {
    // 获取助手状态
    fetchAssistantState: () => Promise<AssistantState>;
    
    // 获取悬浮图标URL
    fetchFloatingIconUrl: () => Promise<string>;
    
    // 获取通知配置
    fetchNotificationConfig: () => Promise<boolean>;
    
    // 创建悬浮图标DOM
    createFloatingIcon: (homePageFloatingIcon: string, showAssistantNotification: boolean) => void;
    
    // 初始化悬浮图标事件
    initFloatingIcon: (homePageFloatingIcon: string) => void;
    
    // 初始化（主入口方法）
    init: () => Promise<void>;
}

// 扩展 window 类型以包含全局服务
declare global {
    interface Window {
        gspframeworkService?: {
            rtf?: {
                language?: {
                    getLanguageCode: () => string;
                };
                func?: {
                    openMenu: (options: { funcId: string }) => void;
                };
                toolbarEvent?: any;
            };
        };
        messageNoticeService?: {
            onMessageExtend: (callback: (event: MessageEvent) => void) => void;
        };
        messageExtendBarMenu?: {
            extendTest?: {
                doMyWorkListner: () => void;
                msgCallTrigger: (datas?: any, view?: boolean) => void;
            };
        };
    }
}

export function useAssistantIcon(): UseAssistantIcon {
    let homePageFloatingIcon = '';
    let showAssistantNotification = true;
    let assistantState: AssistantState | null = null;
    let isAutoHover = false;
    let autoHoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let bubbleHideTimeout: ReturnType<typeof setTimeout> | null = null;

    // 封装第一个接口请求 - 使用 axios
    const fetchAssistantState = async (): Promise<AssistantState> => {
        try {
            const response: AxiosResponse<AssistantState> = await axios.get(
                '/api/runtime/sys/v1.0/ast/chat/isShowAssistantLogo',
                {
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    // 封装第二个接口请求 - 使用 axios
    const fetchFloatingIconUrl = async (): Promise<string> => {
        try {
            const response: AxiosResponse<GlobalConfigResponse> = await axios.get(
                '/api/runtime/sys/v1.0/ast/manager/globalconfig/id/HOME_PAGE_FLOATING_ICON',
                {
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
            homePageFloatingIcon = response.data.docContent?.url || '';
            return homePageFloatingIcon;
        } catch (error) {
            throw error;
        }
    };

    // 封装获取通知开关配置的接口请求 - 使用 axios
    const fetchNotificationConfig = async (): Promise<boolean> => {
        try {
            const response: AxiosResponse<GlobalConfigResponse> = await axios.get(
                '/api/runtime/sys/v1.0/ast/manager/globalconfig/id/SHOW_ASSISTANT_NOTIFICATION',
                {
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
            // 如果配置存在且为false，则关闭通知，否则默认开启
            showAssistantNotification = !(response.data.configValue === 'false');
            return showAssistantNotification;
        } catch (error) {
            // 如果获取配置失败，使用默认值true（开启通知）
            showAssistantNotification = true;
            return showAssistantNotification;
        }
    };

    // 创建悬浮图标DOM - 使用原生 DOM API
    const createFloatingIcon = (homePageFloatingIcon: string, showAssistantNotification: boolean): void => {
        const curLanguage = window.gspframeworkService?.rtf?.language?.getLanguageCode() || 'zh-CN';
        let msgPrefix = "您有";
        let msgSuffix = "条未读消息需处理";
        let msgSuffix_wf = "条代办需处理";
        let viewDetails = "查看详情";
        
        if (curLanguage === "en") {
            msgPrefix = "You have ";
            msgSuffix = " unread messages to process";
            msgSuffix_wf = " pending tasks to process";
            viewDetails = "View Details";
        } else if (curLanguage === "zh-CHT") {
            msgPrefix = "您有";
            msgSuffix = "則未讀訊息需處理";
            msgSuffix_wf = "項待辦需處理";
            viewDetails = "查看詳情";
        }

        const body = document.body;
        const robotContainer = document.createElement("div");
        robotContainer.id = "rtfrobot-logo";
        robotContainer.style.cssText = "width:70px; height:84px; position:fixed; bottom:48px; right:-35px; z-index:999;transition: right 0.4s ease-in-out; display:block;";

        if (homePageFloatingIcon) {
            const bodyPart = document.createElement("div");
            bodyPart.className = "robot-part robot-head";
            bodyPart.style.cssText = `width:70px; height:84px; background:url(${homePageFloatingIcon}) 0 0/contain no-repeat; position:absolute;`;
            robotContainer.appendChild(bodyPart);
        } else {
            const bodyPart = document.createElement("div");
            bodyPart.className = "robot-part robot-body";
            bodyPart.style.cssText = "width:40px; height:40px; background:url('/platform/runtime/sys/web/rtfrobot-body.png') 0 0/contain no-repeat; position:absolute; top:53px; left:38px;";

            const headPart = document.createElement("div");
            headPart.className = "robot-part robot-head";
            headPart.style.cssText = "width:60px; height:75px; background:url('/platform/runtime/sys/web/rtfrobot-head.png') 0 0/contain no-repeat; position:absolute; pointer-events: auto;";

            // 创建圆形数字显示div
            const numberBadge = document.createElement("div");
            numberBadge.className = "robot-number-badge";
            numberBadge.style.cssText = "position: absolute; right: 10px; top: 10px; transform: translate(5px, -5px); width: 22px; height: 22px; background-color: #ff4d4f; color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 10px; font-weight: bold; z-index: 1000;border: 2px solid white;";
            numberBadge.textContent = "0";
            
            // 如果开关关闭，则隐藏角标
            if (!showAssistantNotification) {
                numberBadge.style.display = 'none';
            }

            // 存储消息和待办数量的对象 - 默认为0，确保初始状态下角标隐藏
            const numberAstEvent: NumberAstEvent = {
                msgCount: "0",
                wfCount: "0"
            };
            
            // 初始时确保角标隐藏
            numberBadge.textContent = "0";
            numberBadge.style.display = 'none';

            // 创建聊天气泡
            const chatBubble = document.createElement("div");
            chatBubble.className = "robot-chat-bubble";
            chatBubble.style.cssText = "position: absolute; right: 70px; top: 0; width: max-content; min-width: 240px; max-width: 350px; background: linear-gradient(to right, #257AFF, #40ADFF, #49B0FD); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: none; z-index: 1000; color: white; pointer-events: auto;";

            const arrow = document.createElement("div");
            arrow.style.cssText = "position: absolute; right: -7px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 8px solid #49B0FD;";

            const bubbleBottom = document.createElement("div");
            bubbleBottom.style.cssText = "padding: 10px;";

            chatBubble.appendChild(arrow);
            chatBubble.appendChild(bubbleBottom);

            // 封装待办事项列表渲染逻辑 - 优化渲染性能
            let lastRenderData: { msgCount: string; wfCount: string } | null = null;
            const renderTodoItems = (): void => {
                const currentData = {
                    msgCount: numberAstEvent.msgCount,
                    wfCount: numberAstEvent.wfCount
                };

                // 数据去重，避免不必要的重新渲染
                if (lastRenderData &&
                    lastRenderData.msgCount === currentData.msgCount &&
                    lastRenderData.wfCount === currentData.wfCount) {
                    return;
                }

                lastRenderData = currentData;

                // 清空现有内容
                bubbleBottom.innerHTML = "";
                
                // 安全检查：确保bubbleBottom和chatBubble元素存在
                if (!bubbleBottom || !chatBubble) {
                    console.warn('气泡元素不存在，无法渲染待办项');
                    return;
                }

                const todoItems: TodoItem[] = [
                    {
                        getText: () => msgPrefix + numberAstEvent.msgCount + msgSuffix,
                        menuId: "b51c2198-4ff4-13b5-66d2-2b3f283edccb",
                        count: () => numberAstEvent.msgCount
                    },
                    {
                        getText: () => msgPrefix + numberAstEvent.wfCount + msgSuffix_wf,
                        menuId: "todo-menu",
                        count: () => numberAstEvent.wfCount
                    }
                ];

                const visibleItems = todoItems.filter((item) => {
                    try {
                        // 安全地获取并解析计数
                        const count = item.count ? String(item.count()) : "0";
                        return count !== "0" && parseInt(count) !== 0;
                    } catch (e) {
                        console.warn('处理待办项计数时出错:', e);
                        return false;
                    }
                });

                const hasVisibleItems = visibleItems.length > 0;

                // 如果开关关闭，则不显示气泡内容
                if (!showAssistantNotification) {
                    chatBubble.style.display = 'none';
                } else if (hasVisibleItems && chatBubble) {
                    visibleItems.forEach((item) => {
                        const itemDiv = document.createElement("div");
                        itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

                        const itemText = document.createElement("span");
                        itemText.textContent = item.getText();
                        itemText.style.cssText = "font-size: 12px; color: white;";

                        const viewDetailBtn = document.createElement("button");
                        viewDetailBtn.textContent = viewDetails;
                        viewDetailBtn.style.cssText = "background: none; border: none; color: white; cursor: pointer; font-size: 12px; text-decoration: underline; outline: none;";
                        viewDetailBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (window.gspframeworkService?.rtf?.func?.openMenu) {
                                window.gspframeworkService.rtf.func.openMenu({
                                    funcId: item.menuId
                                });
                            }
                            chatBubble.style.display = 'none';
                        });
                        viewDetailBtn.addEventListener('blur', function() {
                            this.style.outline = 'none';
                        });

                        itemDiv.appendChild(itemText);
                        itemDiv.appendChild(viewDetailBtn);
                        bubbleBottom.appendChild(itemDiv);
                    });
                } else {
                    chatBubble.style.display = 'none';
                }
            };

            // 添加自动hover效果函数 - 优化定时器管理
            const triggerAutoHover = (): void => {
                // 清除之前的定时器
                if (autoHoverTimeout) {
                    clearTimeout(autoHoverTimeout);
                }
                if (bubbleHideTimeout) {
                    clearTimeout(bubbleHideTimeout);
                }

                const robotLogo = document.getElementById('rtfrobot-logo');
                if (robotLogo) {
                    isAutoHover = true;
                    robotLogo.style.right = '0px';
                    const handsElements = document.querySelectorAll('.robot-hands');
                    handsElements.forEach((el) => {
                        el.classList.add('hand-animate');
                    });

                    const total = parseInt(numberAstEvent.msgCount) + parseInt(numberAstEvent.wfCount);
                    // 只有当开关开启且有消息时才显示气泡
                    if (total > 0 && showAssistantNotification) {
                        chatBubble.style.display = 'block';
                    }

                    autoHoverTimeout = setTimeout(() => {
                        if (isAutoHover) {
                            robotLogo.style.right = '-35px';
                            handsElements.forEach((el) => {
                                el.classList.remove('hand-animate');
                            });

                            bubbleHideTimeout = setTimeout(() => {
                                if (isAutoHover) {
                                    chatBubble.style.display = 'none';
                                    isAutoHover = false;
                                }
                            }, 1500);
                        }
                        autoHoverTimeout = null;
                    }, 3000);
                }
            };

            // 初始化消息扩展栏菜单
            if (!window.messageExtendBarMenu) {
                window.messageExtendBarMenu = {};
            }
            if (!window.messageExtendBarMenu.extendTest) {
                window.messageExtendBarMenu.extendTest = {
                    doMyWorkListner: () => {},
                    msgCallTrigger: () => {}
                };
            }
            
            const astMsgBAR = {
                doMyWorkListner: () => {},
                msgCallTrigger: (datas?: any, view: boolean = false) => {
                        // 添加防御性检查，确保gspframeworkService.rtf存在
                        const hasToolBarEvent = !!(window.gspframeworkService?.rtf?.toolbarEvent);
                        
                        // 确保messageNoticeService和onMessageExtend方法存在
                        if (hasToolBarEvent && window.messageNoticeService && typeof window.messageNoticeService.onMessageExtend === 'function') {
                            try {
                                window.messageNoticeService.onMessageExtend((event: MessageEvent) => {
                                    try {
                                        // 确保event和event.data存在
                                        if (!event || !event.data) {
                                            console.warn('消息事件数据不完整');
                                            return;
                                        }
                                        
                                        const data = JSON.parse(event.data);

                                        // 确保data是有效的对象且包含num属性
                                        if (data && typeof data === 'object' && data.hasOwnProperty('num')) {
                                            numberAstEvent.msgCount = String(data.num || 0);
                                        }

                                        // 安全地解析数字，避免NaN
                                        const msgCount = parseInt(numberAstEvent.msgCount) || 0;
                                        const wfCount = parseInt(numberAstEvent.wfCount) || 0;
                                        const total = msgCount + wfCount;
                                        const oldTotal = parseInt(numberBadge.textContent || '0') || 0;
                                        
                                        numberBadge.textContent = total > 99 ? '99+' : String(total);

                                        // 优化角标显示逻辑：当总数为0时隐藏角标，或者当开关关闭时隐藏
                                        if (total === 0 || !showAssistantNotification) {
                                            numberBadge.style.display = 'none';
                                            chatBubble.style.display = 'none';
                                        } else {
                                            numberBadge.style.display = 'flex';

                                            // 只有当消息数量增加且图标显示时才触发自动hover
                                            if (oldTotal !== total && total > oldTotal && robotContainer && robotContainer.style.display !== 'none') {
                                                triggerAutoHover();
                                            }
                                        }

                                        renderTodoItems();
                                    } catch (e) {
                                        console.error('解析event.data失败:', e);
                                    }
                                });
                            } catch (err) {
                                console.warn('注册消息扩展事件失败，但不会影响其他功能:', err);
                            }
                        } else {
                            // 当messageNoticeService不存在时的默认处理
                            console.warn('消息通知服务不可用，将使用默认设置');
                            numberAstEvent.msgCount = "0";
                            numberAstEvent.wfCount = "0";
                            numberBadge.textContent = "0";
                            numberBadge.style.display = 'none';
                            chatBubble.style.display = 'none';
                        }
                    }
                };
            
            window.messageExtendBarMenu.extendTest = astMsgBAR;

            // 安全地初始化消息触发器
            setTimeout(() => {
                try {
                    if (window.messageExtendBarMenu?.extendTest) {
                        if (typeof window.messageExtendBarMenu.extendTest.doMyWorkListner === 'function') {
                            window.messageExtendBarMenu.extendTest.doMyWorkListner();
                        }
                        if (typeof window.messageExtendBarMenu.extendTest.msgCallTrigger === 'function') {
                            window.messageExtendBarMenu.extendTest.msgCallTrigger();
                        }
                    }
                } catch (err) {
                    console.warn('初始化消息触发器时出错，但不会影响其他功能:', err);
                    // 确保角标隐藏
                    if (numberBadge) {
                        numberBadge.textContent = "0";
                        numberBadge.style.display = 'none';
                    }
                    if (chatBubble) {
                        chatBubble.style.display = 'none';
                    }
                }
            }, 10);

            headPart.appendChild(numberBadge);
            headPart.appendChild(chatBubble);

            headPart.addEventListener('mouseenter', () => {
                isAutoHover = false;
                if (autoHoverTimeout) {
                    clearTimeout(autoHoverTimeout);
                    autoHoverTimeout = null;
                }
                if (bubbleHideTimeout) {
                    clearTimeout(bubbleHideTimeout);
                    bubbleHideTimeout = null;
                }

                const total = parseInt(numberAstEvent.msgCount) + parseInt(numberAstEvent.wfCount);
                // 只有当开关开启且有消息时才显示气泡
                if (total > 0 && showAssistantNotification) {
                    chatBubble.style.display = 'block';
                }
            });

            headPart.addEventListener('mouseleave', () => {
                isAutoHover = false;
                if (autoHoverTimeout) {
                    clearTimeout(autoHoverTimeout);
                    autoHoverTimeout = null;
                }

                if (bubbleHideTimeout) {
                    clearTimeout(bubbleHideTimeout);
                }

                bubbleHideTimeout = setTimeout(() => {
                    chatBubble.style.display = 'none';
                    bubbleHideTimeout = null;
                }, 1500);
            });

            const handsPart = document.createElement("div");
            handsPart.className = "robot-part robot-hands";
            handsPart.style.cssText = "width:30px; height:30px;z-index:-1; background:url('/platform/runtime/sys/web/rtfrobot-hand.png') 0 0/contain no-repeat; position:absolute; top:66px; left:16px;";

            robotContainer.appendChild(bodyPart);
            robotContainer.appendChild(headPart);
            robotContainer.appendChild(handsPart);

            const cleanup = (): void => {
                if (autoHoverTimeout) {
                    clearTimeout(autoHoverTimeout);
                    autoHoverTimeout = null;
                }
                if (bubbleHideTimeout) {
                    clearTimeout(bubbleHideTimeout);
                    bubbleHideTimeout = null;
                }
            };

            window.addEventListener('beforeunload', cleanup);
        }

        body.appendChild(robotContainer);
    };

    // 初始化悬浮图标事件 - 使用原生 DOM API
    const initFloatingIcon = (homePageFloatingIcon: string): void => {
        if (homePageFloatingIcon) {
            const robotLogo = document.getElementById('rtfrobot-logo');
            if (robotLogo) {
                robotLogo.addEventListener('mouseenter', () => {
                    isAutoHover = false;
                    if (autoHoverTimeout) {
                        clearTimeout(autoHoverTimeout);
                        autoHoverTimeout = null;
                    }
                    if (bubbleHideTimeout) {
                        clearTimeout(bubbleHideTimeout);
                        bubbleHideTimeout = null;
                    }
                    robotLogo.style.right = '0px';
                    const handsElements = document.querySelectorAll('.robot-hands');
                    handsElements.forEach((el) => {
                        el.classList.add('hand-animate');
                    });
                });

                robotLogo.addEventListener('mouseleave', () => {
                    isAutoHover = false;
                    if (autoHoverTimeout) {
                        clearTimeout(autoHoverTimeout);
                        autoHoverTimeout = null;
                    }

                    if (bubbleHideTimeout) {
                        clearTimeout(bubbleHideTimeout);
                    }

                    // 机器人图标立即开始向右隐藏的动画
                    robotLogo.style.right = '-35px';
                    const handsElements = document.querySelectorAll('.robot-hands');
                    handsElements.forEach((el) => {
                        el.classList.remove('hand-animate');
                    });

                    // 1.5秒后隐藏气泡
                    bubbleHideTimeout = setTimeout(() => {
                        const chatBubble = document.querySelector('.robot-chat-bubble') as HTMLElement;
                        if (chatBubble) {
                            chatBubble.style.display = 'none';
                        }
                        bubbleHideTimeout = null;
                    }, 1500);
                });
            }
        } else {
            // 使用事件委托处理动态元素
            document.addEventListener('mouseenter', (e) => {
                const target = e.target as HTMLElement;
                if (target.classList?.contains('robot-part') && target.classList?.contains('robot-head')) {
                    isAutoHover = false;
                    if (autoHoverTimeout) {
                        clearTimeout(autoHoverTimeout);
                        autoHoverTimeout = null;
                    }
                    if (bubbleHideTimeout) {
                        clearTimeout(bubbleHideTimeout);
                        bubbleHideTimeout = null;
                    }
                    const robotContainer = target.closest('#rtfrobot-logo') as HTMLElement;
                    if (robotContainer) {
                        robotContainer.style.right = '0px';
                        const handsElements = document.querySelectorAll('.robot-hands');
                        handsElements.forEach((el) => {
                            el.classList.add('hand-animate');
                        });
                    }
                }
            }, true);

            document.addEventListener('mouseleave', (e) => {
                const target = e.target as HTMLElement;
                if (target.classList?.contains('robot-part') && target.classList?.contains('robot-head')) {
                    isAutoHover = false;
                    if (autoHoverTimeout) {
                        clearTimeout(autoHoverTimeout);
                        autoHoverTimeout = null;
                    }

                    if (bubbleHideTimeout) {
                        clearTimeout(bubbleHideTimeout);
                    }

                    const robotContainer = target.closest('#rtfrobot-logo') as HTMLElement;
                    if (robotContainer) {
                        // 机器人图标立即开始向右隐藏的动画
                        robotContainer.style.right = '-40px';
                        const handsElements = document.querySelectorAll('.robot-hands');
                        handsElements.forEach((el) => {
                            el.classList.remove('hand-animate');
                        });

                        // 1.5秒后隐藏气泡
                        bubbleHideTimeout = setTimeout(() => {
                            const chatBubble = document.querySelector('.robot-chat-bubble') as HTMLElement;
                            if (chatBubble) {
                                chatBubble.style.display = 'none';
                            }
                            bubbleHideTimeout = null;
                        }, 1500);
                    }
                }
            }, true);
        }

        // 处理鼠标按下事件
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList?.contains('robot-part') && target.classList?.contains('robot-head')) {
                e.stopPropagation();
                isAutoHover = false;
                if (autoHoverTimeout) {
                    clearTimeout(autoHoverTimeout);
                    autoHoverTimeout = null;
                }
                if (bubbleHideTimeout) {
                    clearTimeout(bubbleHideTimeout);
                    bubbleHideTimeout = null;
                }

                const robotContainer = target.closest('#rtfrobot-logo') as HTMLElement;
                if (!robotContainer) return;

                let hasMouseMove = false;
                const downY = e.pageY;
                const bottom = parseInt(window.getComputedStyle(robotContainer).bottom) || 48;

                const handleMouseMove = (moveEvent: MouseEvent) => {
                    if (moveEvent.which === 1) {
                        hasMouseMove = true;
                        const moveY = moveEvent.pageY;
                        const delta = moveY - downY;
                        const newBottom = bottom - delta;
                        robotContainer.style.bottom = newBottom + 'px';
                    }
                };

                const handleMouseUp = (upEvent: MouseEvent) => {
                    if (hasMouseMove && upEvent.which === 1) {
                        // 拖拽结束
                    } else if (!hasMouseMove && upEvent.which === 1) {
                        const iframe = document.getElementById('rtfrobot-ifra') as HTMLElement;
                        if (iframe) {
                            iframe.style.display = 'block';
                        }
                        robotContainer.style.display = 'none';
                    }
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        });

        // 阻止气泡点击事件冒泡
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList?.contains('robot-chat-bubble') || target.closest('.robot-chat-bubble')) {
                e.stopPropagation();
            }
        });
    };

    // 初始化主入口方法
    const init = async (): Promise<void> => {
        try {
            const [state, iconUrl, notificationConfig] = await Promise.all([
                fetchAssistantState(),
                fetchFloatingIconUrl(),
                fetchNotificationConfig()
            ]);

            assistantState = state;
            homePageFloatingIcon = iconUrl;
            showAssistantNotification = notificationConfig;

            if (assistantState.assistantMode === 1 && assistantState.userShow === '1') {
                if (!document.getElementById('rtfrobot-logo')) {
                    createFloatingIcon(homePageFloatingIcon, showAssistantNotification);
                    initFloatingIcon(homePageFloatingIcon);
                }
            }
        } catch (error) {
            console.error('接口请求失败：', error);
        }
    };

    return {
        fetchAssistantState,
        fetchFloatingIconUrl,
        fetchNotificationConfig,
        createFloatingIcon,
        initFloatingIcon,
        init
    };
}
