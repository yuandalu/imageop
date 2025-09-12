#!/bin/bash

echo "🚀 启动 ImageOp 图片压缩服务..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 检查 pngquant 是否安装
if ! command -v pngquant &> /dev/null; then
    echo "❌ pngquant 未安装，请先安装 pngquant"
    echo ""
    echo "📦 安装方法："
    echo "   macOS: brew install pngquant"
    echo "   Ubuntu/Debian: sudo apt-get install pngquant"
    echo "   CentOS/RHEL: sudo yum install pngquant"
    echo "   Windows: 下载 https://pngquant.org/"
    echo ""
    exit 1
fi

# 检查 pngquant 版本
PNGQUANT_VERSION=$(pngquant --version 2>&1 | head -n1)
echo "✅ pngquant 已安装: $PNGQUANT_VERSION"

# 安装服务端依赖
echo "📦 安装服务端依赖..."
cd server
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

# 构建前端
echo "🔨 构建前端..."
npm run build
cd ../server

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p ../data/uploads ../data/compressed

# 启动服务
echo "🌟 启动服务..."
echo "服务将在 http://localhost:3000 启动"
echo "按 Ctrl+C 停止服务"
npm start
