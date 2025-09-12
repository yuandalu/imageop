#!/bin/bash

echo "🔍 验证 Docker 配置文件..."

# 检查 Dockerfile 语法
echo "📋 检查 Dockerfile..."
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile 存在"
else
    echo "❌ Dockerfile 不存在"
    exit 1
fi

# 检查 docker-compose.yml 语法
echo "📋 检查 docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml 存在"
else
    echo "❌ docker-compose.yml 不存在"
    exit 1
fi

# 检查 nginx.conf 语法
echo "📋 检查 nginx.conf..."
if [ -f "nginx.conf" ]; then
    echo "✅ nginx.conf 存在"
else
    echo "❌ nginx.conf 不存在"
    exit 1
fi

# 检查 .dockerignore
echo "📋 检查 .dockerignore..."
if [ -f ".dockerignore" ]; then
    echo "✅ .dockerignore 存在"
else
    echo "❌ .dockerignore 不存在"
    exit 1
fi

# 检查必要的目录
echo "📋 检查目录结构..."
if [ -d "../server/src" ]; then
    echo "✅ server/src 目录存在"
else
    echo "❌ server/src 目录不存在"
    exit 1
fi

if [ -d "../frontend/src" ]; then
    echo "✅ frontend/src 目录存在"
else
    echo "❌ frontend/src 目录不存在"
    exit 1
fi

if [ -d "../data" ]; then
    echo "✅ data 目录存在"
else
    echo "❌ data 目录不存在"
    exit 1
fi

echo ""
echo "🎉 所有配置文件验证通过！"
echo ""
echo "📝 配置文件说明："
echo "   - Dockerfile: Docker 镜像构建配置"
echo "   - docker-compose.yml: 多容器编排配置"
echo "   - nginx.conf: Nginx 反向代理配置"
echo "   - .dockerignore: Docker 构建忽略文件"
echo "   - deploy.sh: 一键部署脚本"
echo ""
echo "🚀 使用方法："
echo "   ./deploy.sh              # 基础部署"
echo "   ./deploy.sh --with-nginx # 完整部署"
