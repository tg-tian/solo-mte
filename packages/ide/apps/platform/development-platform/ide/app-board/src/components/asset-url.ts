/**
 * 与 Vite `base` 对齐的 public 资源路径（`base: './'` 时形如 `./assets/...`），
 * 便于整包复制到 Web 服务器任意子目录。
 */
export function assetUrl(path: string): string {
  const p = path.replace(/^\//, '');
  // 与 x-conversation demo 一致：Node 打包 vite 配置 / mock 时可能没有 import.meta.env
  const baseRaw = import.meta.env?.BASE_URL;
  const base = typeof baseRaw === 'string' && baseRaw !== '' ? baseRaw : './';
  if (base === './') {
    return `./${p}`;
  }
  if (base === '/' || base === '') {
    return `/${p}`;
  }
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
