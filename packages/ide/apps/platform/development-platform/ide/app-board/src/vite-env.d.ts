/// <reference types="vite/client" />
/// <reference types="vue/jsx" />

interface ImportMetaEnv {
  readonly VITE_CHAT_API_BASE_URL?: string;
  readonly VITE_CHAT_API_STREAM_PATH?: string;
  readonly VITE_CHAT_API_SYNC_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
