#!/bin/bash

# ImageOp Docker镜像推送脚本
# 使用方法: ./push-image.sh [registry] [tag]

set -e

# 默认配置
DEFAULT_REGISTRY="docker.io"
DEFAULT_USERNAME="yuandalu"
DEFAULT_IMAGE_NAME="imageop"
DEFAULT_TAG="latest"

# 获取参数
REGISTRY=${1:-$DEFAULT_REGISTRY}
TAG=${2:-$DEFAULT_TAG}

# 构建完整镜像名
if [ "$REGISTRY" = "docker.io" ]; then
    FULL_IMAGE_NAME="${DEFAULT_USERNAME}/${DEFAULT_IMAGE_NAME}:${TAG}"
else
    FULL_IMAGE_NAME="${REGISTRY}/${DEFAULT_USERNAME}/${DEFAULT_IMAGE_NAME}:${TAG}"
fi

echo "🚀 开始推送镜像: $FULL_IMAGE_NAME"

# 检查本地镜像是否存在
if ! sudo docker images imageop-test | grep -q imageop-test; then
    echo "❌ 错误: 本地镜像 imageop-test 不存在"
    echo "请先运行: sudo docker build -f docker/Dockerfile -t imageop-test ."
    exit 1
fi

# 为镜像打标签
echo "📝 为镜像打标签..."
sudo docker tag imageop-test "$FULL_IMAGE_NAME"

# 显示镜像信息
echo "📊 镜像信息:"
sudo docker images "$FULL_IMAGE_NAME"

# 推送镜像
echo "⬆️  推送镜像到 $REGISTRY..."
sudo docker push "$FULL_IMAGE_NAME"

echo "✅ 推送完成!"
echo "🌐 镜像地址: $FULL_IMAGE_NAME"

# 显示拉取命令
echo ""
echo "📥 其他人可以使用以下命令拉取镜像:"
echo "sudo docker pull $FULL_IMAGE_NAME"
