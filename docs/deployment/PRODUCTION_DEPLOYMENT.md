# 生产环境部署指南

## 📋 部署前检查清单

### ✅ 代码准备
- [x] 并发修复已完成并测试通过
- [x] 所有依赖包已安装（包括 proper-lockfile, express-rate-limit）
- [x] 代码已通过语法检查
- [x] 并发测试已通过

### ✅ 环境准备
- [ ] Node.js v18+ 已安装
- [ ] PM2 已安装
- [ ] Nginx 已安装并配置
- [ ] SSL 证书已配置（推荐使用 Let's Encrypt）
- [ ] 防火墙规则已配置（开放 80, 443, 3001 端口）

### ✅ 配置准备
- [ ] `.env` 文件已创建并配置
- [ ] `GEMINI_API_KEY` 已设置
- [ ] `NODE_ENV=production` 已设置
- [ ] `PORT=3001` 已设置
- [ ] 域名 DNS 解析已配置

### ✅ 安全准备
- [ ] 敏感信息已从代码中移除
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 定期备份计划已设置
- [ ] 日志监控已配置

---

## 🚀 部署步骤

### 步骤 1: 准备部署目录

```bash
# 确保在项目根目录
cd /path/to/English-master_-english-analysis

# 创建必要的目录
mkdir -p logs questions

# 确保目录权限正确
chmod 755 logs questions
```

### 步骤 2: 安装依赖

```bash
# 安装所有依赖（包括新添加的并发修复依赖）
npm install --production=false

# 验证关键依赖是否已安装
npm list proper-lockfile express-rate-limit
```

### 步骤 3: 构建前端

```bash
# 构建生产版本
npm run build

# 验证构建结果
ls -la dist/
```

### 步骤 4: 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env
nano .env
```

**必须配置的变量**:
```bash
GEMINI_API_KEY=your_actual_api_key_here
NODE_ENV=production
PORT=3001
```

### 步骤 5: 验证代码

```bash
# 检查语法
node --check server.js

# 检查依赖
npm audit

# 运行生产环境检查脚本（如果创建了）
./check-production.sh
```

### 步骤 6: 使用 PM2 启动应用

```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 停止旧实例（如果存在）
pm2 stop english-analysis 2>/dev/null || true
pm2 delete english-analysis 2>/dev/null || true

# 启动应用
pm2 start ecosystem.config.cjs

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 按照输出提示执行命令

# 查看状态
pm2 status
pm2 logs english-analysis --lines 50
```

### 步骤 7: 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/bankware.fun

# 创建符号链接
sudo ln -sf /etc/nginx/sites-available/bankware.fun /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 步骤 8: 配置 SSL（推荐）

```bash
# 安装 certbot
sudo apt-get install -y certbot python3-certbot-nginx
# 或
sudo yum install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d bankware.fun -d www.bankware.fun

# 设置自动续期（通常已自动配置）
sudo certbot renew --dry-run
```

### 步骤 9: 验证部署

```bash
# 检查应用状态
pm2 status
curl http://localhost:3001/api/questions/size

# 检查 API 是否正常
curl https://bankware.fun/api/questions/size

# 检查前端是否正常
curl -I https://bankware.fun

# 运行并发测试（验证修复）
./test_concurrency.sh http://localhost:3001 10
```

---

## 🔧 使用一键部署脚本

### 自动化部署

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

脚本会自动完成：
- ✅ 检查 Node.js 和 npm
- ✅ 安装依赖
- ✅ 构建前端
- ✅ 配置环境变量
- ✅ 启动 PM2 进程

---

## 📊 部署后验证

### 功能验证清单

1. **API 端点测试**
   ```bash
   # 获取问题库大小
   curl https://bankware.fun/api/questions/size
   
   # 测试并发保存（验证修复）
   ./test_concurrency.sh https://bankware.fun 10
   ```

2. **前端访问测试**
   - 访问 https://bankware.fun
   - 测试问题生成功能
   - 测试问题保存功能

3. **并发安全性验证**
   ```bash
   # 运行并发测试
   ./test_concurrency.sh https://bankware.fun 10
   # 应该显示: ✅ 测试通过！所有问题都成功保存。
   ```

4. **性能监控**
   ```bash
   # 查看 PM2 状态
   pm2 status
   
   # 查看实时日志
   pm2 logs english-analysis
   
   # 查看系统资源
   pm2 monit
   ```

---

## 🔒 生产环境安全建议

### 1. 环境变量安全
- ✅ `.env` 文件不要提交到 Git
- ✅ 使用强密码和 API Key
- ✅ 定期轮换 API Key

### 2. 文件权限
```bash
# 设置正确的文件权限
chmod 600 .env
chmod 644 questions/bank.json
chmod 755 logs/
```

### 3. 防火墙配置
```bash
# 只开放必要端口
# 80, 443 (HTTP/HTTPS)
# 3001 应该只允许本地访问（通过 Nginx 反向代理）
```

### 4. 日志管理
- ✅ 定期清理日志文件
- ✅ 设置日志轮转
- ✅ 监控错误日志

### 5. 备份策略
```bash
# 定期备份重要文件
# questions/bank.json - 问题库数据
# .env - 环境配置（安全存储）

# 示例备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
cp questions/bank.json backups/bank_${DATE}.json
```

---

## 📈 监控和维护

### 日常监控

1. **应用状态**
   ```bash
   pm2 status
   pm2 logs english-analysis --lines 100
   ```

2. **系统资源**
   ```bash
   pm2 monit
   # 或
   top
   htop
   ```

3. **Nginx 日志**
   ```bash
   sudo tail -f /var/log/nginx/bankware.fun.access.log
   sudo tail -f /var/log/nginx/bankware.fun.error.log
   ```

### 定期维护

1. **更新依赖**
   ```bash
   npm audit
   npm update
   npm run build
   pm2 restart english-analysis
   ```

2. **更新系统**
   ```bash
   sudo apt update && sudo apt upgrade
   # 或
   sudo yum update
   ```

3. **SSL 证书续期**
   ```bash
   sudo certbot renew
   ```

---

## 🐛 故障排查

### 常见问题

#### 1. 应用无法启动
```bash
# 检查日志
pm2 logs english-analysis

# 检查端口
netstat -tulpn | grep 3001

# 检查环境变量
cat .env
```

#### 2. Nginx 502 错误
```bash
# 确认应用运行
pm2 status

# 测试本地 API
curl http://localhost:3001/api/questions/size

# 检查 Nginx 配置
sudo nginx -t
```

#### 3. 并发问题（数据丢失）
```bash
# 运行并发测试
./test_concurrency.sh http://localhost:3001 10

# 检查文件锁
ls -la questions/bank.json.lock

# 查看服务器日志
pm2 logs english-analysis | grep -i "lock\|concurrent\|error"
```

#### 4. API 限流问题
```bash
# 检查限流配置
grep -A 10 "generateLimiter" server.js

# 查看限流日志
pm2 logs english-analysis | grep -i "rate limit\|429"
```

---

## 📝 回滚计划

如果需要回滚到之前的版本：

```bash
# 1. 停止应用
pm2 stop english-analysis

# 2. 恢复代码（如果使用 Git）
git checkout <previous-commit>

# 3. 重新安装依赖
npm install --production=false

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart english-analysis
```

---

## ✅ 部署完成检查清单

部署完成后，请确认：

- [ ] 应用正常运行 (`pm2 status`)
- [ ] API 可访问 (`curl https://bankware.fun/api/questions/size`)
- [ ] 前端可访问 (浏览器访问 https://bankware.fun)
- [ ] SSL 证书有效
- [ ] 并发测试通过 (`./test_concurrency.sh`)
- [ ] 日志正常 (`pm2 logs`)
- [ ] 备份策略已配置
- [ ] 监控已设置

---

## 📞 支持

如果遇到问题：
1. 查看日志文件: `pm2 logs english-analysis`
2. 查看并发分析文档: `CONCURRENCY_ANALYSIS.md`
3. 查看修复文档: `FIX_APPLIED.md`
4. 查看测试结果: `测试结果总结.md`

---

**🎉 恭喜！部署完成！**
