import { App } from 'vue';

export { default as FXConversation } from './conversation';
export * from './conversation';
export * from './common';
/** 网关：HTTP(SSE)/WS、wire 归一化与 chat-api 配置（消息侧能力，避免与 @farris/x-ui 双向依赖） */
export * from '../src/gateway';
declare const _default: {
    install(app: App): void;
};
export default _default;
