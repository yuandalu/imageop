# ImageOp 生产环境部署指南

## 🚀 Docker 部署

### 快速部署

```bash
cd docker
./deploy.sh
```

**访问地址：**
- 应用: http://localhost:3080

## 🔧 Docker 配置详解

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app/server

# 安装系统依赖
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    python3 \
    make \
    g++ \
    pngquant

# 安装依赖和构建
COPY server/package*.json ./
RUN npm ci --only=production

COPY frontend/package*.json ../frontend/
RUN cd ../frontend && npm ci && npm run build

# 复制源代码
COPY server/src ./src
COPY frontend/dist ../frontend/dist

# 创建数据目录
RUN mkdir -p ../data/uploads ../data/compressed

EXPOSE 3080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  imageop:
    build: .
    ports:
      - "3080:3080"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3080}
    volumes:
      - ../data/uploads:/app/data/uploads
      - ../data/compressed:/app/data/compressed
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

```


## 🔧 环境变量配置

```bash
cp docker/env.example docker/.env
nano docker/.env
```

```env
# 服务器配置
PORT=3080
NODE_ENV=production
```

## 🚨 故障排除

### Docker 相关问题

1. **容器启动失败**
   ```bash
   docker compose logs imageop
   docker compose build --no-cache
   ```

2. **文件权限问题**
   ```bash
   sudo chown -R 1000:1000 data/
   chmod -R 755 data/
   ```

3. **端口被占用**
   ```bash
   # 修改 docker-compose.yml 中的端口映射
   ports:
     - "3081:3080"  # 改为其他端口
   ```

### 性能优化

1. **Docker 镜像优化**
   ```dockerfile
   # 使用多阶段构建
   FROM node:18-alpine AS builder
   # ... 构建步骤
   
   FROM node:18-alpine AS production
   # ... 生产环境配置
   ```

2. **内存优化**
   ```bash
   # 增加内存限制
   node --max-old-space-size=4096 server.js
   ```


## 📊 监控和日志

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3080/api/health

```

### 日志管理

```bash
# 查看应用日志
docker compose logs -f imageop

```

## 📈 生产环境最佳实践

1. **使用 HTTPS**
2. **配置防火墙**
3. **定期备份数据**
4. **监控服务状态**
5. **设置日志轮转**
6. **使用环境变量管理配置**
7. **配置自动重启策略**

## 🎉 开始部署

```bash
cd docker
./deploy.sh
```

享受稳定可靠的图片压缩服务！ 🚀