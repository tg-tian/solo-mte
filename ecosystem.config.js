// 共享：VS Code Server 监听端口（与 start-server.sh 一致）
const vscodePort = process.env.VSCODE_PORT || '8000';
// 浏览器访问的 authority（host:port）。部署前可 export，例如 VITE_VSCODE_REMOTE_AUTHORITY=203.0.113.10:8000
const viteVsCodeAuthority =
  process.env.VITE_VSCODE_REMOTE_AUTHORITY || `localhost:${vscodePort}`;

module.exports = {
  apps: [
    {
      name: 'solo-vscode-server',
      cwd: '/root/solo-mte/packages/ide/vscode',
      script: 'start-server.sh',
      interpreter: 'bash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        VSCODE_HOST: process.env.VSCODE_HOST || '0.0.0.0',
        VSCODE_PORT: vscodePort,
        ...(process.env.VSCODE_CONNECTION_TOKEN
          ? { VSCODE_CONNECTION_TOKEN: process.env.VSCODE_CONNECTION_TOKEN }
          : {})
      },
      error_file: '/root/solo-mte/logs/vscode-server-error.log',
      out_file: '/root/solo-mte/logs/vscode-server-out.log',
      log_file: '/root/solo-mte/logs/vscode-server-combined.log',
      time: true
    },
    {
      name: 'solo-ide',
      cwd: '/root/solo-mte/packages/ide',
      script: 'node_modules/vite/bin/vite.js',
      args: '--config ./vite.config.dev.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'development',
        VITE_VSCODE_REMOTE_AUTHORITY: viteVsCodeAuthority
      },
      error_file: '/root/solo-mte/logs/ide-error.log',
      out_file: '/root/solo-mte/logs/ide-out.log',
      log_file: '/root/solo-mte/logs/ide-combined.log',
      time: true
    },
    {
      name: 'solo-ide-runtime',
      cwd: '/root/solo-mte/packages/ide',
      script: 'node_modules/vite/bin/vite.js',
      args: '--config ./vite.config.dev.ts --mode runtime',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'development',
        VITE_VSCODE_REMOTE_AUTHORITY: viteVsCodeAuthority
      },
      error_file: '/root/solo-mte/logs/ide-runtime-error.log',
      out_file: '/root/solo-mte/logs/ide-runtime-out.log',
      log_file: '/root/solo-mte/logs/ide-runtime-combined.log',
      time: true
    },
    {
      name: 'solo-workbench',
      cwd: '/root/solo-mte/packages/workbench',
      script: 'node_modules/vite/bin/vite.js',
      args: '--config ./vite.config.dev.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      error_file: '/root/solo-mte/logs/workbench-error.log',
      out_file: '/root/solo-mte/logs/workbench-out.log',
      log_file: '/root/solo-mte/logs/workbench-combined.log',
      time: true
    }
  ]
};
