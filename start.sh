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
# 优先级：当前目录 > 系统PATH
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

# 3. 如果都没找到，询问是否自动下载
if [ -z "$PNGQUANT_PATH" ]; then
    echo "❌ pngquant 未安装"
    echo ""
    echo "🤔 是否要自动下载 pngquant 到项目bin目录？"
    echo "   y) 是，自动下载"
    echo "   n) 否，手动安装"
    echo ""
    read -p "请选择 (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📥 开始下载 pngquant..."
        
        # 检测系统类型
        OS_TYPE=""
        DOWNLOAD_URL=""
        EXTRACT_CMD=""
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            OS_TYPE="linux"
            DOWNLOAD_URL="https://pngquant.org/pngquant-linux.tar.bz2"
            EXTRACT_CMD="tar -xjf"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            OS_TYPE="mac"
            DOWNLOAD_URL="https://pngquant.org/pngquant.tar.bz2"
            EXTRACT_CMD="tar -xjf"
        elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
            OS_TYPE="windows"
            DOWNLOAD_URL="https://pngquant.org/pngquant-windows.zip"
            EXTRACT_CMD="unzip -o"
        else
            echo "❌ 不支持的操作系统类型: $OSTYPE"
            echo "请手动安装 pngquant"
            exit 1
        fi
        
        echo "🖥️  检测到系统类型: $OS_TYPE"
        echo "🔗 下载地址: $DOWNLOAD_URL"
        
        # 创建bin目录
        mkdir -p "./bin"
        
        # 下载文件到bin目录
        FILENAME=$(basename "$DOWNLOAD_URL")
        if command -v wget &> /dev/null; then
            wget -O "./bin/$FILENAME" "$DOWNLOAD_URL"
        elif command -v curl &> /dev/null; then
            curl -L -o "./bin/$FILENAME" "$DOWNLOAD_URL"
        else
            echo "❌ 需要 wget 或 curl 来下载文件"
            echo "请先安装 wget 或 curl，或手动下载 pngquant"
            exit 1
        fi
        
        if [ $? -eq 0 ]; then
            echo "✅ 下载完成: ./bin/$FILENAME"
            
            # 解压文件到bin目录
            echo "📦 解压文件到bin目录..."
            cd "./bin"
            $EXTRACT_CMD "$FILENAME"
            cd ".."
            
            if [ $? -eq 0 ]; then
                echo "✅ 解压完成"
                
                # 查找解压后的pngquant文件
                PNGQUANT_FILE=$(find "./bin" -name "pngquant" -type f -executable | head -1)
                if [ -n "$PNGQUANT_FILE" ]; then
                    # 移动到bin目录根目录
                    mv "$PNGQUANT_FILE" "./bin/pngquant"
                    chmod +x "./bin/pngquant"
                    echo "✅ pngquant 已安装到项目bin目录"
                    
                    # 清理下载和解压的文件
                    rm -f "./bin/$FILENAME"
                    rm -rf ./bin/pngquant-* 2>/dev/null
                    
                    # 重新设置路径
                    PNGQUANT_PATH="./bin/pngquant"
                else
                    echo "❌ 解压后未找到 pngquant 可执行文件"
                    echo "请手动检查下载的文件"
                    exit 1
                fi
            else
                echo "❌ 解压失败"
                exit 1
            fi
        else
            echo "❌ 下载失败"
            echo "请手动下载 pngquant 或使用包管理器安装"
            exit 1
        fi
    else
        echo "📦 手动安装方法："
        echo "   macOS: brew install pngquant"
        echo "   Ubuntu/Debian: sudo apt-get install pngquant"
        echo "   CentOS/RHEL: sudo yum install pngquant"
        echo "   Windows: 下载 https://pngquant.org/"
        echo ""
        echo "💡 建议安装 3.x 以上版本以获得更好的性能"
        echo "💡 或者将 pngquant 可执行文件放在项目bin目录下"
        echo ""
        exit 1
    fi
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

# 构建前端
echo "🔨 构建前端..."
npm run build
cd ../server

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p ../data/uploads ../data/compressed

# 启动服务
echo "🌟 启动服务..."
echo "服务将在 http://localhost:5000 启动"
echo "按 Ctrl+C 停止服务"
npm start
