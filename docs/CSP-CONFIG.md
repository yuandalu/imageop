# Content Security Policy (CSP) 配置指南

## 概述

本项目使用helmet中间件提供Content Security Policy (CSP)安全防护，支持通过环境变量自定义CSP策略。

## 默认CSP策略

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  worker-src 'self' blob:;
  frame-src 'self';
  connect-src 'self';
  object-src 'none';
```

## 重要说明

**default-src 的作用**：在CSP中，`default-src` 会作为其他未明确指定指令的fallback值。我们只明确指定了需要特殊配置的指令，其他指令（如font-src、media-src等）会自动使用default-src的值。

## 环境变量配置

```bash
# iframe白名单配置 - 允许特定域名的iframe嵌入
CSP_FRAME_SRC=https://example.com,https://another-site.com,https://embed.example.com

# 框架祖先配置 - 允许特定页面嵌入当前页面到iframe中
CSP_FRAME_ANCESTORS='self',https://example.com,https://another-site.com

# 脚本源白名单配置 - 允许从特定CDN加载脚本
CSP_SCRIPT_SRC=https://cdn.jsdelivr.net,https://unpkg.com,https://cdnjs.cloudflare.com

# 连接源白名单配置 - 允许连接到特定的API或WebSocket服务
CSP_CONNECT_SRC=https://api.example.com,https://ws.example.com,wss://realtime.example.com
```

## 配置示例

```bash
# 示例1：iframe相关配置
CSP_FRAME_SRC=https://www.youtube.com,https://player.vimeo.com,https://embed.example.com
CSP_FRAME_ANCESTORS='self',https://example.com,https://embed.example.com

# 示例2：允许外部CDN脚本
CSP_SCRIPT_SRC=https://cdn.jsdelivr.net,https://unpkg.com

# 示例3：完整配置
CSP_FRAME_SRC=https://www.youtube.com,https://player.vimeo.com
CSP_FRAME_ANCESTORS='self',https://example.com,https://embed.example.com
CSP_SCRIPT_SRC=https://cdn.jsdelivr.net,https://unpkg.com
CSP_CONNECT_SRC=https://api.example.com,https://analytics.example.com
```

## 部署配置

### Docker部署

1. 复制环境变量文件：
```bash
cp docker/env.example docker/.env
```

2. 编辑 `.env` 文件，添加CSP配置：
```bash
nano docker/.env
```

3. 添加需要的CSP配置：
```bash
CSP_FRAME_SRC=https://www.youtube.com,https://player.vimeo.com
CSP_SCRIPT_SRC=https://cdn.jsdelivr.net
CSP_CONNECT_SRC=https://api.example.com
```

4. 重新部署：
```bash
cd docker
./deploy.sh
```

### 本地部署

1. 设置环境变量：
```bash
export CSP_FRAME_SRC="https://www.youtube.com,https://player.vimeo.com"
export CSP_SCRIPT_SRC="https://cdn.jsdelivr.net"
export CSP_CONNECT_SRC="https://api.example.com"
```

2. 启动服务：
```bash
npm start
```

## 安全建议

1. **最小权限原则**：只添加必要的域名到白名单
2. **HTTPS优先**：尽量使用HTTPS域名
3. **定期审查**：定期检查白名单中的域名是否仍然需要
4. **测试验证**：配置后测试所有功能是否正常工作

## 常见问题

### Q: 如何允许所有iframe？
A: 不推荐，但可以设置：
```bash
CSP_FRAME_SRC=*
```

### Q: 如何允许所有外部脚本？
A: 不推荐，但可以设置：
```bash
CSP_SCRIPT_SRC=*
```

### Q: 配置后页面无法加载？
A: 检查浏览器控制台的CSP错误信息，添加缺失的域名到相应白名单。

## 调试CSP

1. 查看浏览器控制台的CSP违规报告
2. 使用CSP报告工具分析违规情况
3. 逐步添加必要的域名到白名单

## 相关资源

- [MDN CSP文档](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Helmet.js文档](https://helmetjs.github.io/)
- [CSP测试工具](https://csp-evaluator.withgoogle.com/)
