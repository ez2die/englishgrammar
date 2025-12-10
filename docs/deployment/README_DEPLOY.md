# 完整部署指南

## 前置条件检查

在开始部署前，请确保：

1. ✅ 服务器可以访问互联网
2. ✅ 域名 `bankware.fun` 已解析到服务器 IP
3. ✅ 服务器开放 80 和 443 端口
4. ✅ 有 root 或 sudo 权限

## 完整部署流程

### 步骤 1: 安装 Node.js（如果未安装）

```bash
cd /tmp/English-master_-english-analysis
./install-nodejs.sh
```

或者，部署脚本会自动检测并安装 Node.js。

### 步骤 2: 配置环境变量

```bash
cd /tmp/English-master_-english-analysis
cp .env.example .env
nano .env
```

在 `.env` 文件中设置：

```
GEMINI_API_KEY=你的_Gemini_API_密钥
NODE_ENV=production
PORT=3001
```

### 步骤 3: 运行部署脚本

```bash
./deploy.sh
```

这个脚本会：
- 自动检查并安装 Node.js（如果需要）
- 安装项目依赖
- 构建前端项目
- 创建必要的目录
- 使用 PM2 启动应用（如果已安装）

### 步骤 4: 安装 PM2（推荐）

如果 PM2 未安装，部署脚本会提示。安装 PM2：

```bash
npm install -g pm2
```

然后重新运行部署脚本，或手动启动：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

### 步骤 5: 配置 Nginx

```bash
sudo ./setup-nginx.sh
```

或者手动配置：

```bash
sudo cp nginx.conf /etc/nginx/sites-available/bankware.fun
sudo ln -s /etc/nginx/sites-available/bankware.fun /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 6: 配置 SSL 证书

```bash
sudo ./setup-ssl.sh
```

或者手动配置：

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx
# 或
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d bankware.fun -d www.bankware.fun
```

## 验证部署

1. **检查应用状态**
   ```bash
   pm2 status
   pm2 logs english-analysis
   ```

2. **检查 Nginx 状态**
   ```bash
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/bankware.fun.access.log
   ```

3. **测试访问**
   - HTTP: http://bankware.fun (应该重定向到 HTTPS)
   - HTTPS: https://bankware.fun
   - API: https://bankware.fun/api/questions/size

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

# 查看详细信息
pm2 info english-analysis
```

### Nginx 命令

```bash
# 测试配置
sudo nginx -t

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/bankware.fun.access.log
sudo tail -f /var/log/nginx/bankware.fun.error.log
```

### 应用更新

```bash
# 1. 停止应用
pm2 stop english-analysis

# 2. 更新代码（如果使用 git）
git pull

# 3. 重新安装依赖（如果有新依赖）
npm install

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart english-analysis
```

## 故障排查

### 问题 1: Node.js 安装失败

**解决方案：**
```bash
# 手动安装 Node.js
./install-nodejs.sh

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 问题 2: 应用无法启动

**检查步骤：**
1. 检查环境变量：`cat .env`
2. 检查端口占用：`netstat -tulpn | grep 3001`
3. 查看日志：`pm2 logs english-analysis`
4. 检查 Node.js 版本：`node -v` (需要 v18+)

### 问题 3: Nginx 502 错误

**检查步骤：**
1. 确认应用正在运行：`pm2 status`
2. 检查应用日志：`pm2 logs english-analysis`
3. 测试本地连接：`curl http://localhost:3001/api/questions/size`
4. 检查 Nginx 错误日志：`sudo tail -f /var/log/nginx/bankware.fun.error.log`

### 问题 4: SSL 证书问题

**检查步骤：**
1. 检查证书状态：`sudo certbot certificates`
2. 手动续期：`sudo certbot renew`
3. 查看证书日志：`sudo tail -f /var/log/letsencrypt/letsencrypt.log`

### 问题 5: 域名无法访问

**检查步骤：**
1. 检查 DNS 解析：`nslookup bankware.fun`
2. 检查防火墙：
   ```bash
   # CentOS/RHEL/Alibaba Cloud Linux
   sudo firewall-cmd --list-all
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
3. 检查端口监听：`sudo netstat -tulpn | grep -E ':(80|443)'`

## 安全建议

1. **定期更新**
   ```bash
   # 更新系统
   sudo yum update -y
   # 或
   sudo apt-get update && sudo apt-get upgrade -y
   
   # 更新 Node.js
   sudo yum update nodejs
   ```

2. **备份重要数据**
   ```bash
   # 备份问题库
   cp questions/bank.json questions/bank.json.backup
   
   # 备份环境变量
   cp .env .env.backup
   ```

3. **监控日志**
   - 定期检查应用日志
   - 监控 Nginx 访问日志
   - 设置日志轮转

4. **防火墙配置**
   - 只开放必要的端口
   - 使用 fail2ban 防止暴力破解

## 性能优化

1. **启用 Gzip 压缩**（已在 nginx.conf 中配置）
2. **使用 CDN** 加速静态资源
3. **配置缓存策略**
4. **监控资源使用**：`pm2 monit`

## 获取帮助

如果遇到问题：

1. 查看详细日志
2. 检查配置文件
3. 参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取更多信息
4. 查看项目 README

