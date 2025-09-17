# 多阶段构建：构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 配置Alpine国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统依赖（构建需要）
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    python3 \
    make \
    g++ \
    wget \
    tar

# 配置npm国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制前端所有文件并构建前端
COPY frontend/ ./frontend/
RUN cd frontend && \
    npm ci && \
    npm run build && \
    npm cache clean --force

# 生产阶段
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app/server

# 配置Alpine国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统依赖（运行时需要）
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    wget \
    tar

# 配置npm国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制服务端 package.json 和 package-lock.json
COPY server/package*.json ./

# 安装服务端生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制前端构建产物
COPY --from=builder /app/frontend/dist ../frontend/dist

# 复制源代码
COPY server/src ./src

# 下载 pngquant 到 bin 目录
RUN mkdir -p ../bin && \
    cd ../bin && \
    wget -O pngquant-linux.tar.bz2 https://pngquant.org/pngquant-linux.tar.bz2 && \
    tar -xjf pngquant-linux.tar.bz2 && \
    mv pngquant ./pngquant && \
    chmod +x ./pngquant && \
    rm -f pngquant-linux.tar.bz2 && \
    rm -rf pngquant-* && \
    cd /app/server

# 创建必要的目录
RUN mkdir -p ../data/uploads ../data/compressed ../data/resized

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3080

# 暴露端口
EXPOSE 3080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["npm", "start"]
