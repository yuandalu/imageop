# ImageOp 部署指南

## 📋 系统要求

### 开发环境
- **Node.js** >= 16
- **npm**
- **pngquant** (PNG 压缩必需)

### 生产环境
- **Docker** (推荐)
- **Docker Compose**
- **Nginx** (可选，用于反向代理)

## 🚀 部署方式

### 方式一：本地开发部署

#### 开发模式（热更新）

```bash
# 同时启动前后端开发服务器
npm run dev

# 单独启动
npm run dev:server   # 仅后端 (nodemon)
npm run dev:frontend # 仅前端 (vite)
```

**访问地址：**
- 前端开发服务器: http://localhost:5173
- 后端 API 服务: http://localhost:5000

#### 生产模式

```bash
# 使用启动脚本
./start.sh

# 或手动启动
npm run setup
npm start
```

**访问地址：**
- 完整应用: http://localhost:5000

### 方式二：Docker 部署

#### 基础部署

```bash
cd docker
./deploy.sh
```

#### 完整部署（含 Nginx）

```bash
cd docker
./deploy.sh
```

**访问地址：**
- 应用: http://localhost:5000

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

EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  imageop:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-5000}
    volumes:
      - ../data/uploads:/app/data/uploads
      - ../data/compressed:/app/data/compressed
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

```

## 🌐 Nginx 配置

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # 上游服务器
    upstream imageop_backend {
        server imageop:5000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        client_max_body_size 100M;
        
        # 静态文件缓存
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API 请求
        location /api/ {
            proxy_pass http://imageop_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # 文件服务
        location /uploads/ {
            proxy_pass http://imageop_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /compressed/ {
            proxy_pass http://imageop_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # 前端应用
        location / {
            proxy_pass http://imageop_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 🔧 环境变量配置

### 创建环境变量文件

```bash
cp docker/env.example docker/.env
nano docker/.env
```

### 环境变量说明

```env
# 服务器配置
PORT=5000
NODE_ENV=production
```

> **注意**：当前版本中只有 `PORT` 和 `NODE_ENV` 环境变量被使用，其他配置都是硬编码的。

## 🚨 故障排除

### 常见问题

1. **pngquant 未安装**
   ```bash
   brew install pngquant             # macOS
   sudo apt-get install pngquant     # Ubuntu/Debian
   sudo yum install pngquant         # CentOS/RHEL
   ```

2. **Sharp 安装失败**
   ```bash
   sudo apt-get install libvips-dev  # Ubuntu/Debian
   brew install vips                 # macOS
   ```

3. **端口被占用**
   ```bash
   PORT=3001 npm start
   ```

4. **Docker 容器启动失败**
   ```bash
   docker compose logs imageop
   docker compose build --no-cache
   ```

5. **文件权限问题**
   ```bash
   sudo chown -R 1000:1000 data/
   chmod -R 755 data/
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

2. **Nginx 优化**
   ```nginx
   # 启用 HTTP/2
   listen 443 ssl http2;
   
   # 启用 Brotli 压缩
   load_module modules/ngx_http_brotli_filter_module.so;
   ```

3. **Node.js 优化**
   ```bash
   # 增加内存限制
   node --max-old-space-size=4096 server.js
   ```

## 📊 监控和日志

### 健康检查

```bash
# 检查服务状态
curl http://localhost:5000/api/health

# 检查 Nginx 状态
curl http://localhost/nginx_status
```

### 日志管理

```bash
# 查看应用日志
docker compose logs -f imageop

# 查看 Nginx 日志（如果使用独立nginx）
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔒 安全配置

### SSL 证书配置

```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/ssl/nginx.key \
  -out docker/ssl/nginx.crt
```

### 防火墙配置

```bash
# 开放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000  # 仅开发环境
```

## 📈 生产环境最佳实践

1. **使用 HTTPS**
2. **配置防火墙**
3. **定期备份数据**
4. **监控服务状态**
5. **设置日志轮转**
6. **使用环境变量管理配置**
7. **配置自动重启策略**

## 🎯 部署方式对比

| 部署方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| **开发模式** | 开发调试 | 热更新，前后端分离 | 需要本地环境 |
| **生产模式** | 生产/测试 | 简单快速，自动安装依赖 | 需要本地环境 |
| **Docker基础** | 生产环境 | 环境隔离，易于部署 | 需要Docker |
| **Docker+Nginx** | 生产环境 | 完整方案，高性能 | 配置复杂 |

## 🎉 开始部署

选择适合您需求的部署方式：

1. **开发环境**：使用 `npm run dev`
2. **测试环境**：使用 `./start.sh`
3. **生产环境**：使用 `cd config && ./deploy.sh`

享受稳定可靠的图片压缩服务！ 🚀