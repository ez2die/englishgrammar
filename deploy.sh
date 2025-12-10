#!/bin/bash

# 部署脚本 - English Analysis 项目
# 域名: bankware.fun

set -e

echo "🚀 开始部署 English Analysis 项目..."

# 获取项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "⚠️  未找到 Node.js 或 npm"
    echo "📦 正在自动安装 Node.js..."
    
    if [ -f "$PROJECT_DIR/install-nodejs.sh" ]; then
        chmod +x "$PROJECT_DIR/install-nodejs.sh"
        "$PROJECT_DIR/install-nodejs.sh"
    else
        echo "❌ 无法找到安装脚本 install-nodejs.sh"
        echo "💡 请手动运行: ./install-nodejs.sh"
        exit 1
    fi
    
    # 验证安装
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "❌ Node.js 安装失败，请手动安装"
        exit 1
    fi
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

cd "$PROJECT_DIR"

echo "📦 安装依赖..."
npm install --production=false

# 验证关键依赖（并发修复必需）
echo "🔍 验证关键依赖..."
if ! npm list proper-lockfile express-rate-limit &> /dev/null; then
    echo "⚠️  警告: 关键依赖可能未正确安装"
    echo "   正在重新安装..."
    npm install proper-lockfile express-rate-limit
fi

# 确保 node_modules/.bin 中的可执行文件有执行权限
echo "🔧 设置执行权限..."
chmod +x node_modules/.bin/* 2>/dev/null || true

echo "🔨 构建前端项目..."
npm run build

# 验证构建结果
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ 前端构建失败，请检查错误信息"
    exit 1
fi
echo "✅ 前端构建成功"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  警告: 未找到 .env 文件"
    echo "📝 正在从 .env.example 创建 .env 文件..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请编辑并设置 GEMINI_API_KEY"
    else
        echo "GEMINI_API_KEY=your_api_key_here" > .env
        echo "NODE_ENV=production" >> .env
        echo "PORT=3001" >> .env
        echo "✅ 已创建 .env 文件，请编辑并设置 GEMINI_API_KEY"
    fi
fi

# 创建必要的目录
mkdir -p logs questions

# 验证 server.js 语法
echo "🔍 验证代码语法..."
if ! node --check server.js 2>/dev/null; then
    echo "❌ server.js 语法错误，请修复后再部署"
    exit 1
fi
echo "✅ 代码语法检查通过"

# 检查并发修复
echo "🔍 检查并发修复..."
if ! grep -q "proper-lockfile" server.js || ! grep -q "express-rate-limit" server.js; then
    echo "⚠️  警告: 未检测到并发修复代码"
    echo "   请确保 server.js 包含文件锁和限流机制"
fi

# 检查 PM2
if command -v pm2 &> /dev/null; then
    echo "🔄 使用 PM2 管理进程..."
    
    # 停止现有进程
    pm2 stop english-analysis 2>/dev/null || true
    pm2 delete english-analysis 2>/dev/null || true
    
    # 启动应用
    if [ -f ecosystem.config.cjs ]; then
        pm2 start ecosystem.config.cjs
    else
        pm2 start ecosystem.config.js
    fi
    pm2 save
    
    echo "✅ 应用已通过 PM2 启动"
    echo "📊 查看状态: pm2 status"
    echo "📋 查看日志: pm2 logs english-analysis"
else
    echo "⚠️  未找到 PM2，将直接启动 Node.js 进程"
    echo "💡 建议安装 PM2: npm install -g pm2"
    echo ""
    echo "🔧 手动启动命令:"
    echo "   NODE_ENV=production node server.js"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 下一步:"
echo "   1. 确保已设置 .env 文件中的 GEMINI_API_KEY"
echo "   2. 配置 Nginx (参考 nginx.conf)"
echo "   3. 配置 SSL 证书 (使用 certbot)"
echo "   4. 重启 Nginx: sudo systemctl restart nginx"
echo ""
echo "🧪 部署后验证:"
echo "   1. 检查应用状态: pm2 status"
echo "   2. 测试 API: curl http://localhost:3001/api/questions/size"
echo "   3. 运行并发测试: ./test_concurrency.sh http://localhost:3001 10"
echo ""
echo "📚 更多信息请查看 PRODUCTION_DEPLOYMENT.md"

