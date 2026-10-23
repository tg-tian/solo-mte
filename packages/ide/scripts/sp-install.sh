#!/bin/bash

set -e

echo "========== 步骤 1: 拉取最新镜像 =========="
cd /root && docker-compose pull || echo "⚠️  部分镜像拉取失败，继续使用本地镜像启动"
echo "========== 步骤 2: 更新并启动服务（保留数据库和已有用户数据） =========="
cd /root && docker-compose up -d

echo "========== 步骤 3: 等待 MySQL 就绪 =========="
for i in {1..30}; do
    if docker exec mte-mysql mysqladmin ping -h localhost -u root -p'3edc@WSX!QAZ' --silent 2>/dev/null; then
        echo "MySQL 已就绪"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "MySQL did not become ready"
        exit 1
    fi
    echo "等待 MySQL 启动... ($i/30)"
    sleep 2
done

echo "========== 步骤 4: 等待后端服务就绪 =========="
for i in $(seq 1 60); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8080/" 2>/dev/null || true)
    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "" ]; then
        echo "✓ 后端服务已就绪 (HTTP $HTTP_CODE)，耗时 ${i} 秒"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "❌ 错误: 后端服务 60 秒内未启动"
        docker ps --filter "name=mte-platform"
        exit 1
    fi
    sleep 1
done

echo "========== 安装完成! =========="
echo "容器状态:"
docker-compose ps
echo ""
echo "已有数据库和用户数据已保留。"
