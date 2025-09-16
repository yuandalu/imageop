#!/bin/bash

# ImageOp Docker 部署脚本

set -e

echo "🚀 ImageOp Docker 部署脚本"
echo "================================"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p ../data/uploads ../data/compressed

# 检查根目录的业务环境变量文件
if [ ! -f "../.env" ]; then
    echo "📝 创建业务环境变量文件..."
    cp ../.env.example ../.env
    echo "✅ 已创建业务 .env 文件，请根据需要修改配置"
fi

echo "🐳 启动 ImageOp 服务..."

# 启动服务（使用根目录的 .env 文件）
docker compose up -d --build

echo "✅ 服务启动成功！"
echo "📱 访问地址：http://localhost:3080"

echo ""
echo "📊 服务状态："
docker compose ps

echo ""
echo "📝 查看日志："
echo "   docker compose logs -f"

echo ""
echo "🛑 停止服务："
echo "   docker compose down"

echo ""
echo "🎉 部署完成！"
