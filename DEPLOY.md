# 生产环境部署指南

## 快速部署

### 1. 构建项目
```bash
npm run build
```

### 2. 设置环境变量
确保 `.env.local` 文件包含：
```
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
PORT=3001
```

### 3. 启动生产服务器
```bash
npm run start:prod
```

或者使用 PM2（推荐）：
```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs grammar-master

# 停止应用
pm2 stop grammar-master

# 重启应用
pm2 restart grammar-master

# 设置开机自启
pm2 startup
pm2 save
```

## 使用 Nginx 反向代理（可选）

如果需要使用 Nginx 作为反向代理，配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 端口配置

- 默认端口：3001
- 可通过环境变量 `PORT` 修改
- 确保防火墙规则允许该端口访问

## 文件结构

生产环境需要的文件：
- `dist/` - 构建后的前端文件（由 `npm run build` 生成）
- `server.js` - Express 服务器
- `server/` - 服务器端代码
- `questions/` - 问题库目录（自动创建）
- `.env.local` - 环境变量配置

## 健康检查

访问以下端点检查服务状态：
- API 健康：`http://localhost:3001/api/questions/size`
- 前端页面：`http://localhost:3001/`




