// 全局日志 - 最早执行（在任何导入之前）
console.log('[AI Completion] ========== MAIN.TS EXECUTING ==========');
console.log('[AI Completion] Main.ts execution time:', new Date().toISOString());
console.log('[AI Completion] Current URL:', window.location.href);

import { createApp } from 'vue';
console.log('[AI Completion] Vue imported');

import CommandCodeEditor from '../components';
console.log('[AI Completion] CommandCodeEditor imported');

// import router from './router/index';
import './style.css';
console.log('[AI Completion] style.css imported');

import App from './app.vue';
console.log('[AI Completion] App.vue imported');

import Providers from './app-providers';
console.log('[AI Completion] Providers imported');

console.log('[AI Completion] Creating Vue app...');
const app = createApp(App);
console.log('[AI Completion] Vue app created');

console.log('[AI Completion] Using CommandCodeEditor plugin...');
app.use(CommandCodeEditor);
console.log('[AI Completion] CommandCodeEditor plugin registered');

console.log('[AI Completion] Using Providers...');
app.use(Providers);
console.log('[AI Completion] Providers registered');

console.log('[AI Completion] Mounting app to #app...');
app.mount('#app');
console.log('[AI Completion] App mounted successfully!');
