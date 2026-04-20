/**
 * 将 node_modules/@xterm 复制到 public/node_modules/@xterm，使生产静态站点只需部署 public
 * （及构建产物），无需整份 node_modules；浏览器仍请求 /node_modules/@xterm/... 路径。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ideRoot = path.resolve(__dirname, '..');
const src = path.join(ideRoot, 'node_modules', '@xterm');
const dest = path.join(ideRoot, 'public', 'node_modules', '@xterm');

if (!fs.existsSync(src)) {
    console.warn('[sync-xterm-to-public] 跳过：未找到', src);
    process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true, dereference: true });
console.log('[sync-xterm-to-public] 已同步 ->', dest);
