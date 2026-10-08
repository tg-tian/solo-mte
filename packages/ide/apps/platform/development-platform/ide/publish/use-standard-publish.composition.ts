import { ref, Ref } from 'vue';
import { PublishProgress, PublishResult } from './publish.types';

/** 进度 WebSocket 连接失败最大重试次数(与标准产品一致) */
const MAX_RETRY_NUM = 10;

export interface UseStandardPublish {
    panelVisible: Ref<boolean>;
    progressInfo: Ref<PublishProgress>;
    /** 触发一次标准产品发布,成功后调用方负责 closePanel 并执行后续步骤;失败时面板保持显示错误信息 */
    startPublish: (boPath: string) => Promise<PublishResult>;
    /** 关闭进度面板并释放 WebSocket */
    closePanel: () => void;
}

/**
 * 迁移自标准产品(web-ide2022 ide-publish)的发布核心闭环:
 * 建进度 WebSocket(token=uuid) → onopen 后 POST repo-packages/publish → 监听进度消息。
 * 发布状态只能通过进度 WebSocket 获取,无 REST 轮询兜底。
 */
export function useStandardPublish(): UseStandardPublish {
    const panelVisible = ref(false);
    const progressInfo = ref<PublishProgress>({ process: 0, stage: 0, status: 0 });

    let socket: WebSocket | null = null;
    let retryNum = 0;
    let resolved = false;
    let running = false;

    function generateUuid(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        // 非安全上下文 fallback(与 @farris/ui-common IdService.guid 同构)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function buildWsUrl(token: string): string {
        let wsType = 'ws:';
        if (location && location.protocol === 'https:') {
            wsType = 'wss:';
        }
        return wsType + `//${location.host}/api/dev/main/v1.0/lcm-log/ws?token=${token}`;
    }

    function releaseSocket() {
        if (socket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null;
            socket.onclose = null;
            try {
                socket.close();
            } catch {
                // 忽略关闭异常
            }
            socket = null;
        }
    }

    function connectSocket(boPath: string, uuid: string, resolve: (result: PublishResult) => void) {
        socket = new WebSocket(buildWsUrl(uuid));

        socket.onopen = () => {
            // ws 建立成功后才触发发布(与标准产品时序一致)
            const path = boPath && boPath[0] === '/' ? boPath.substr(1) : boPath;
            const api = `/api/dev/main/v1.0/repo-packages/publish?id=${uuid}&path=${path}`;
            // 用 fetch 而非 axios:axios 无法发出"空 body + Content-Type: application/json"的请求——
            // dispatchRequest 会对无 Content-Type 的 POST/PUT/PATCH 注入 application/x-www-form-urlencoded,
            // 而 xhr adapter 又会清除 undefined body 的 Content-Type(lib/adapters/xhr.js),两者都会导致
            // CXF @Consumes(application/json) 接口返回 415。fetch 请求形态与标准产品完全一致。
            // 发布结果不依赖响应(进度经 ws 推送),仅在 HTTP 失败时终止并报错。
            fetch(api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            }).then((response) => {
                if (resolved) return;
                if (!response.ok) {
                    // HTTP 失败(如 415):响应体为 CXF 错误堆栈,取首行作为错误信息
                    return response.text().then((text) => {
                        if (resolved) return;
                        resolved = true;
                        running = false;
                        releaseSocket();
                        const firstLine = (text || '').split('\n')[0]?.trim();
                        resolve({ result: false, error: firstLine || '发布异常，请重试' });
                    });
                }
                // 发布成功:读取 body 以释放连接,进度继续由 ws 推送
                response.text().catch(() => {});
            }).catch((error: any) => {
                if (resolved) return;
                resolved = true;
                running = false;
                releaseSocket();
                resolve({ result: false, error: error?.message || '发布异常，请重试' });
            });
        };

        socket.onmessage = (event) => {
            if (resolved) return;
            let info: PublishProgress;
            try {
                const match = String(event.data).match(/\{(.*)\}/);
                if (!match) {
                    // 非进度消息(如心跳/日志行),忽略
                    return;
                }
                info = JSON.parse(match[0]);
            } catch {
                // 进度消息解析失败,忽略
                return;
            }
            progressInfo.value = info;
            if (info.process === 100) {
                // 发布成功
                resolved = true;
                running = false;
                releaseSocket();
                resolve({ result: true });
            } else if (info.status === 1) {
                // 发布失败
                resolved = true;
                running = false;
                releaseSocket();
                resolve({ result: false, error: info.errorMsg });
            }
        };

        socket.onerror = () => {
            if (resolved) return;
            retryNum += 1;
            if (retryNum <= MAX_RETRY_NUM) {
                releaseSocket();
                // 复用同一 uuid 重连(与标准产品一致),避免重复触发发布任务
                connectSocket(boPath, uuid, resolve);
            } else {
                resolved = true;
                running = false;
                releaseSocket();
                resolve({ result: false, error: '发布异常，请重试' });
            }
        };
    }

    function startPublish(boPath: string): Promise<PublishResult> {
        return new Promise((resolve) => {
            if (running) {
                resolve({ result: false, error: '发布正在进行中，请稍候' });
                return;
            }
            running = true;
            panelVisible.value = true;
            progressInfo.value = { process: 0, stage: 0, status: 0 };
            retryNum = 0;
            resolved = false;
            // 本次发布唯一标识:连接进度 ws 的 token 与发布 API 的 id 共用
            const uuid = generateUuid();
            connectSocket(boPath, uuid, resolve);
        });
    }

    function closePanel() {
        running = false;
        resolved = true;
        releaseSocket();
        panelVisible.value = false;
    }

    return { panelVisible, progressInfo, startPublish, closePanel };
}
