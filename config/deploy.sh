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
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p ../data/uploads ../data/compressed
mkdir -p ssl

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 检查是否要启动 Nginx
if [ "$1" = "--with-nginx" ]; then
    echo "🌐 启动完整服务（包含 Nginx）..."
    
    # 检查 SSL 证书
    if [ ! -f "ssl/nginx.crt" ] || [ ! -f "ssl/nginx.key" ]; then
        echo "🔐 生成自签名 SSL 证书..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/nginx.key \
            -out ssl/nginx.crt \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
    fi
    
    # 启动完整服务
    docker-compose --env-file .env --profile with-nginx up -d --build
    
    echo "✅ 服务启动成功！"
    echo "📱 访问地址："
    echo "   HTTP:  http://localhost:80"
    echo "   HTTPS: https://localhost:443"
    
else
    echo "🐳 启动基础服务..."
    
    # 启动基础服务
    docker-compose --env-file .env up -d --build
    
    echo "✅ 服务启动成功！"
    echo "📱 访问地址：http://localhost:3000"
fi

echo ""
echo "📊 服务状态："
docker-compose ps

echo ""
echo "📝 查看日志："
echo "   docker-compose logs -f"

echo ""
echo "🛑 停止服务："
echo "   docker-compose down"

echo ""
echo "🎉 部署完成！"
