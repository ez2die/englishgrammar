# 部署指南

本指南将帮助您在服务器上部署 English Analysis 项目，并使用域名 bankware.fun 访问。

## 前置要求

- Node.js (v18 或更高版本)
- npm
- Nginx
- 域名 bankware.fun 已解析到服务器 IP
- 服务器开放 80 和 443 端口

## 部署步骤

### 1. 安装依赖和构建项目

```bash
cd /tmp/English-master_-english-analysis
npm install
npm run build
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并设置您的 Gemini API Key:

```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件，设置:
```
GEMINI_API_KEY=your_actual_api_key_here
NODE_ENV=production
PORT=3001
```

### 3. 安装 PM2 (推荐)

PM2 用于管理 Node.js 进程，确保应用在后台运行并自动重启。

```bash
npm install -g pm2
```

### 4. 启动应用

#### 方式一: 使用 PM2 (推荐)

```bash
# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 方式二: 使用 systemd

```bash
# 复制服务文件
sudo cp english-analysis.service /etc/systemd/system/

# 编辑服务文件中的路径
sudo nano /etc/systemd/system/english-analysis.service

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable english-analysis
sudo systemctl start english-analysis
```

### 5. 配置 Nginx

```bash
# 运行配置脚本
sudo chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
```

或者手动配置:

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/bankware.fun

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/bankware.fun /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 6. 配置 SSL 证书

```bash
# 运行 SSL 配置脚本
sudo chmod +x setup-ssl.sh
sudo ./setup-ssl.sh
```

或者手动配置:

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx
# 或
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d bankware.fun -d www.bankware.fun
```

### 7. 验证部署

- 访问 http://bankware.fun (应该重定向到 HTTPS)
- 访问 https://bankware.fun
- 检查 API: https://bankware.fun/api/questions/size

## 常用命令

### PM2 命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs english-analysis

# 重启应用
pm2 restart english-analysis

# 停止应用
pm2 stop english-analysis

# 删除应用
pm2 delete english-analysis
```

### Nginx 命令

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看日志
sudo tail -f /var/log/nginx/bankware.fun.access.log
sudo tail -f /var/log/nginx/bankware.fun.error.log
```

### Systemd 命令 (如果使用)

```bash
# 查看状态
sudo systemctl status english-analysis

# 查看日志
sudo journalctl -u english-analysis -f

# 重启服务
sudo systemctl restart english-analysis
```

## 快速部署脚本

运行一键部署脚本:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 故障排查

### 应用无法启动

1. 检查环境变量: `cat .env`
2. 检查端口是否被占用: `netstat -tulpn | grep 3001`
3. 查看 PM2 日志: `pm2 logs english-analysis`
4. 检查 Node.js 版本: `node -v` (需要 v18+)

### Nginx 502 错误

1. 确认应用正在运行: `pm2 status` 或 `systemctl status english-analysis`
2. 检查应用日志
3. 确认端口 3001 可访问: `curl http://localhost:3001/api/questions/size`

### SSL 证书问题

1. 检查证书状态: `sudo certbot certificates`
2. 手动续期: `sudo certbot renew`
3. 查看证书日志: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

### 域名无法访问

1. 检查 DNS 解析: `nslookup bankware.fun`
2. 检查防火墙: `sudo firewall-cmd --list-all` 或 `sudo ufw status`
3. 确认端口开放: `sudo netstat -tulpn | grep -E ':(80|443)'`

## 更新部署

当需要更新应用时:

```bash
# 拉取最新代码 (如果使用 git)
git pull

# 重新安装依赖
npm install

# 重新构建
npm run build

# 重启应用
pm2 restart english-analysis
# 或
sudo systemctl restart english-analysis
```

## 安全建议

1. 定期更新系统和依赖
2. 使用强密码和 API Key
3. 定期备份 `questions/bank.json` 文件
4. 监控日志文件
5. 设置防火墙规则
6. 定期更新 SSL 证书

## 备份

重要数据文件:
- `questions/bank.json` - 问题库数据
- `.env` - 环境变量配置

建议定期备份这些文件。

