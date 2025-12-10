# 快速部署指南

## 一键部署

### 1. 设置环境变量

```bash
cd /tmp/English-master_-english-analysis
cp .env.example .env
nano .env  # 编辑并设置 GEMINI_API_KEY
```

### 2. 运行部署脚本

```bash
./deploy.sh
```

### 3. 配置 Nginx

```bash
sudo ./setup-nginx.sh
```

### 4. 配置 SSL 证书

```bash
sudo ./setup-ssl.sh
```

## 手动部署步骤

### 步骤 1: 安装依赖和构建

```bash
npm install
npm run build
```

### 步骤 2: 配置环境变量

创建 `.env` 文件:

```bash
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
PORT=3001
EOF
```

### 步骤 3: 安装 PM2

```bash
npm install -g pm2
```

### 步骤 4: 启动应用

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

### 步骤 5: 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/bankware.fun
sudo ln -s /etc/nginx/sites-available/bankware.fun /etc/nginx/sites-enabled/

# 测试并重载
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 6: 配置 SSL

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx
# 或
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d bankware.fun -d www.bankware.fun
```

## 验证部署

访问以下 URL 验证部署:

- https://bankware.fun
- https://bankware.fun/api/questions/size

## 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs english-analysis

# 重启应用
pm2 restart english-analysis

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/bankware.fun.access.log
```

## 故障排查

如果遇到问题，请查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 中的故障排查部分。

