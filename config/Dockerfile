# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app/server

# 安装系统依赖（Sharp 和 pngquant 需要）
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    python3 \
    make \
    g++ \
    pngquant

# 复制服务端 package.json 和 package-lock.json
COPY server/package*.json ./

# 安装服务端生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制前端 package.json
COPY frontend/package*.json ../frontend/

# 安装前端依赖并构建
RUN cd ../frontend && \
    npm ci && \
    npm run build && \
    npm cache clean --force

# 复制源代码
COPY server/src ./src
COPY frontend/dist ../frontend/dist

# 创建必要的目录
RUN mkdir -p ../data/uploads ../data/compressed

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["npm", "start"]
