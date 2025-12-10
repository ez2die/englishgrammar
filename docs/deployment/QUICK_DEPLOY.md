# 快速部署指南

## 🚀 一键部署（推荐）

```bash
# 1. 运行部署前检查
./check-production.sh

# 2. 运行一键部署脚本
./deploy.sh

# 3. 配置环境变量（如果未配置）
nano .env
# 设置: GEMINI_API_KEY=your_key_here

# 4. 重启应用（如果环境变量有变化）
pm2 restart english-analysis

# 5. 验证部署
curl http://localhost:3001/api/questions/size
./test_concurrency.sh http://localhost:3001 10
```

## 📋 完整部署步骤

### 1. 准备环境

```bash
# 进入项目目录
cd /path/to/English-master_-english-analysis

# 安装依赖
npm install

# 构建前端
npm run build
```

### 2. 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env
nano .env

# 必须设置:
# GEMINI_API_KEY=your_actual_api_key
# NODE_ENV=production
# PORT=3001
```

### 3. 启动应用

```bash
# 使用 PM2（推荐）
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 按提示执行命令

# 或使用 systemd
sudo cp english-analysis.service /etc/systemd/system/
sudo systemctl enable english-analysis
sudo systemctl start english-analysis
```

### 4. 配置 Nginx

```bash
# 复制配置
sudo cp nginx.conf /etc/nginx/sites-available/bankware.fun
sudo ln -s /etc/nginx/sites-available/bankware.fun /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置 SSL

```bash
sudo certbot --nginx -d bankware.fun -d www.bankware.fun
```

### 6. 验证部署

```bash
# 检查应用
pm2 status
curl https://bankware.fun/api/questions/size

# 测试并发修复
./test_concurrency.sh https://bankware.fun 10
```

## ✅ 部署验证清单

- [ ] 应用正常运行 (`pm2 status`)
- [ ] API 可访问 (`curl http://localhost:3001/api/questions/size`)
- [ ] 前端可访问 (浏览器访问)
- [ ] 并发测试通过 (`./test_concurrency.sh`)
- [ ] SSL 证书有效
- [ ] Nginx 配置正确

## 🔧 常用命令

```bash
# 查看日志
pm2 logs english-analysis

# 重启应用
pm2 restart english-analysis

# 查看状态
pm2 status

# 停止应用
pm2 stop english-analysis

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/bankware.fun.access.log
```

## 📚 更多信息

- 详细部署文档: `PRODUCTION_DEPLOYMENT.md`
- 并发修复说明: `FIX_APPLIED.md`
- 故障排查: `DEPLOYMENT.md`
