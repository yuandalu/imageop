# ImageOp - 智能图片压缩优化服务

高性能图片压缩优化服务，采用最优算法，显著减小文件大小。

## 📁 项目结构

```
imageop/
├── server/                 # 服务端代码
│   ├── src/
│   │   ├── server.js       # 主服务器
│   │   ├── compression-optimizer.js
│   │   └── pngquant-wrapper.js
│   ├── package.json
│   └── start.sh
├── frontend/               # 前端代码
│   ├── src/
│   ├── package.json
│   └── dist/
├── docker/                 # Docker配置
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── env.example
├── data/                   # 数据目录
│   ├── uploads/           # 上传文件
│   └── compressed/        # 压缩文件
└── docs/                   # 文档
    ├── README.md
    ├── QUICKSTART.md
    └── PROJECT_SUMMARY.md
```

## 🚀 快速开始

### 系统依赖

在开始之前，请确保已安装以下依赖：

- **Node.js** (>= 16)
- **npm**
- **pngquant** (PNG 压缩必需)

#### 安装 pngquant

```bash
# macOS
brew install pngquant

# Ubuntu/Debian
sudo apt-get install pngquant

# CentOS/RHEL
sudo yum install pngquant

# Windows
# 下载并安装: https://pngquant.org/
```

### 方法1：使用启动脚本（推荐）

```bash
chmod +x start.sh
./start.sh
```

### 方法2：手动启动

```bash
# 安装所有依赖
npm run setup

# 启动服务
npm start
```

### 方法3：Docker部署

```bash
# 基础部署
cd docker
docker compose up -d

# 使用部署脚本
./deploy.sh
```

> 📖 详细的部署说明请参考 [完整部署指南](docs/DEPLOYMENT.md)

## 📖 详细文档

- [快速开始指南](docs/QUICKSTART.md)
- [完整部署指南](docs/DEPLOYMENT.md)

## 🛠️ 开发

```bash
# 安装依赖
npm run install:all

# 开发模式（热更新）
npm run dev

# 单独启动服务端开发
npm run dev:server

# 单独启动前端开发
npm run dev:frontend

# 构建前端
npm run build
```

## 📝 功能特性

- ✅ 支持 PNG、JPEG、WebP 格式
- ✅ 智能压缩算法选择
- ✅ 批量处理
- ✅ 实时预览对比
- ✅ 压缩参数可调
- ✅ 缓存优化
- ✅ 响应式设计

## 🔧 技术栈

- **后端**: Node.js + Express
- **前端**: React + Vite
- **压缩**: Sharp + pngquant
- **部署**: Docker
