#!/bin/bash

echo "🚀 启动 ImageOp 开发模式..."

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
PNGQUANT_PATH=""

# 1. 首先检查项目bin目录下的 pngquant
if [ -f "./bin/pngquant" ] && [ -x "./bin/pngquant" ]; then
    if ./bin/pngquant --version &> /dev/null; then
        PNGQUANT_PATH="./bin/pngquant"
        echo "✅ 使用项目bin目录下的 pngquant"
    fi
fi

# 2. 如果当前目录没有，检查系统PATH
if [ -z "$PNGQUANT_PATH" ]; then
    if command -v pngquant &> /dev/null; then
        PNGQUANT_PATH="pngquant"
        echo "✅ 使用系统PATH中的 pngquant"
    fi
fi

# 3. 如果都没找到，提示安装
if [ -z "$PNGQUANT_PATH" ]; then
    echo "❌ pngquant 未安装"
    echo "📦 安装方法："
    echo "   macOS: brew install pngquant"
    echo "   Ubuntu/Debian: sudo apt-get install pngquant"
    echo "   CentOS/RHEL: sudo yum install pngquant"
    echo "   Windows: 下载 https://pngquant.org/"
    exit 1
fi

# 检查 pngquant 版本
PNGQUANT_VERSION=$($PNGQUANT_PATH --version 2>&1 | head -n1)
echo "✅ pngquant 已安装: $PNGQUANT_VERSION"

# 安装服务端依赖
echo "📦 安装服务端依赖..."
cd server
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

# 创建必要的目录
echo "📁 创建必要目录..."
cd ..
mkdir -p data/uploads data/compressed

echo "🌟 启动开发服务器..."
echo "前端开发服务器: http://localhost:5173 (带热更新)"
echo "后端API服务器: http://localhost:3080"
echo "按 Ctrl+C 停止所有服务"
echo ""

# 使用 concurrently 同时启动前端和后端
if command -v npx &> /dev/null; then
    # 安装 concurrently 如果不存在
    npx concurrently --version &> /dev/null || npm install -g concurrently
    
    # 同时启动前端和后端
    npx concurrently \
        --names "前端,后端" \
        --prefix-colors "cyan,magenta" \
        "cd frontend && npm run dev" \
        "cd server && npm run dev"
else
    echo "❌ npx 未找到，请安装最新版本的 npm"
    exit 1
fi
