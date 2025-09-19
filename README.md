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
│   └── README.md
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── App.jsx         # 主应用组件
│   │   ├── main.jsx        # 应用入口
│   │   ├── index.css       # 全局样式
│   │   ├── components/     # 组件目录
│   │   │   ├── FileItem.jsx
│   │   │   ├── FileInfo.jsx
│   │   │   ├── FileThumbnail.jsx
│   │   │   ├── PreviewModal.jsx
│   │   │   ├── CompressionSettingsCompact.jsx
│   │   │   ├── MessageToast.jsx
│   │   │   └── ErrorModal.jsx
│   │   ├── hooks/          # 自定义Hooks
│   │   │   ├── useFileUpload.js
│   │   │   ├── useToast.js
│   │   │   ├── useModal.js
│   │   │   ├── useDownload.js
│   │   │   ├── useFileManagement.js
│   │   │   ├── useCompression.js
│   │   │   └── index.js
│   │   └── utils/          # 工具函数
│   │       ├── fileUtils.js
│   │       ├── compressionUtils.js
│   │       ├── constants.js
│   │       └── index.js
│   ├── package.json
│   ├── vite.config.js
│   └── dist/
├── docker/                 # Docker配置
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx-docker.conf
│   ├── nginx-local.conf
│   ├── deploy.sh
│   ├── push-image.sh
│   └── validate-config.sh
├── data/                   # 数据目录
│   ├── uploads/           # 上传文件
│   ├── compressed/        # 压缩文件
│   └── resized/           # 调整大小文件
├── bin/                   # 二进制文件
│   ├── pngquant          # PNG压缩工具
│   └── COPYRIGHT
├── docs/                   # 文档
│   ├── QUICKSTART.md
│   ├── DEPLOYMENT.md
│   └── CSP-CONFIG.md
├── start.sh               # 启动脚本
├── dev.sh                 # 开发脚本
└── package.json           # 根目录配置
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

### 核心功能
- ✅ **多格式支持** - PNG、JPEG、WebP、BMP
- ✅ **智能压缩** - 自动选择最优压缩算法
- ✅ **批量处理** - 支持最多100个文件同时处理
- ✅ **实时预览** - 压缩前后对比，支持缩放交互
- ✅ **参数调节** - 质量、尺寸等参数可自定义
- ✅ **缓存机制** - 避免重复压缩，提升性能

### 用户体验
- ✅ **拖拽上传** - 支持拖拽和点击上传
- ✅ **进度显示** - 实时显示压缩进度
- ✅ **错误处理** - 友好的错误提示和恢复
- ✅ **响应式设计** - 适配各种屏幕尺寸
- ✅ **自动关闭** - 消息提示自动消失
- ✅ **文件管理** - 支持添加更多文件和删除文件

### 技术特性
- ✅ **组件化架构** - 模块化设计，易于维护
- ✅ **Hook 封装** - 业务逻辑与 UI 分离
- ✅ **工具函数复用** - 避免代码重复
- ✅ **状态管理优化** - 减少不必要的重渲染
- ✅ **类型安全** - 完善的错误处理机制

## 🔧 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **Sharp** - 图片处理库
- **pngquant** - PNG 压缩工具
- **Multer** - 文件上传处理

### 前端
- **React 18** - UI 框架
- **Vite** - 构建工具
- **React Dropzone** - 拖拽上传
- **Lucide React** - 图标库
- **自定义 Hooks** - 状态管理
- **组件化架构** - 模块化设计

### 部署
- **Docker** + **Docker Compose**
- **Nginx** - 反向代理
- **多环境配置** - 开发/生产环境

## 🏗️ 前端架构

### 组件结构
- **App.jsx** - 主应用组件，负责状态管理和路由
- **FileItem.jsx** - 文件项组件，显示单个文件信息
- **FileInfo.jsx** - 文件信息组件，显示文件详情
- **FileThumbnail.jsx** - 文件缩略图组件
- **PreviewModal.jsx** - 预览模态框，支持缩放和交互
- **CompressionSettingsCompact.jsx** - 压缩设置组件
- **MessageToast.jsx** - 消息提示组件，支持自动关闭
- **ErrorModal.jsx** - 错误模态框组件

### 自定义 Hooks
- **useFileUpload** - 文件上传逻辑
- **useToast** - 消息提示管理
- **useModal** - 模态框状态管理
- **useDownload** - 下载功能
- **useFileManagement** - 文件列表管理
- **useCompression** - 压缩逻辑

### 工具函数
- **fileUtils.js** - 文件处理工具
- **compressionUtils.js** - 压缩相关工具
- **constants.js** - 常量定义
- **index.js** - 统一导出

### 设计特点
- **组件化设计** - 每个功能模块独立组件
- **Hook 封装** - 业务逻辑与 UI 分离
- **工具函数复用** - 避免代码重复
- **状态管理优化** - 减少不必要的重渲染
- **自动关闭机制** - 消息提示自动消失

## 🛠️ 开发指南

### 前端开发

#### 组件开发
```bash
# 创建新组件
touch src/NewComponent.jsx

# 组件结构模板
import React from 'react';

const NewComponent = ({ prop1, prop2 }) => {
  return (
    <div className="new-component">
      {/* 组件内容 */}
    </div>
  );
};

export default NewComponent;
```

#### Hook 开发
```bash
# 创建新 Hook
touch src/hooks/useNewHook.js

# Hook 结构模板
import { useState, useCallback } from 'react';

export const useNewHook = (initialValue) => {
  const [state, setState] = useState(initialValue);
  
  const updateState = useCallback((newValue) => {
    setState(newValue);
  }, []);
  
  return { state, updateState };
};
```

#### 工具函数开发
```bash
# 创建新工具函数
touch src/utils/newUtils.js

# 工具函数结构模板
export const newUtilityFunction = (param) => {
  // 函数逻辑
  return result;
};
```

### 代码规范

#### 文件命名
- 组件文件：`PascalCase.jsx` (如 `FileItem.jsx`)
- Hook 文件：`camelCase.js` (如 `useFileUpload.js`)
- 工具函数：`camelCase.js` (如 `fileUtils.js`)

#### 组件结构
1. 导入依赖
2. 组件定义
3. 导出组件

#### Hook 结构
1. 导入 React Hooks
2. Hook 函数定义
3. 返回状态和方法

### 调试技巧

#### 开发工具
```bash
# 启动开发服务器
npm run dev

# 查看构建分析
npm run build -- --analyze
```

#### 常见问题
- **组件不更新**：检查依赖数组和状态更新
- **Hook 重复执行**：检查 useCallback 和 useMemo 依赖
- **样式问题**：检查 CSS 类名和选择器
