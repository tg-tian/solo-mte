module.exports = {
  apps: [
    {
      name: 'solo-ide',
      cwd: '/root/solo-mte/packages/ide',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      error_file: '/root/solo-mte/logs/ide-error.log',
      out_file: '/root/solo-mte/logs/ide-out.log',
      log_file: '/root/solo-mte/logs/ide-combined.log',
      time: true
    },
    {
      name: 'solo-workbench',
      cwd: '/root/solo-mte/packages/workbench',
      script: 'node_modules/.bin/vite',
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