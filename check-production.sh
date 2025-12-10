#!/bin/bash
# 生产环境部署前检查脚本

set -e

echo "🔍 生产环境部署前检查..."
echo ""

ERRORS=0
WARNINGS=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_pass() {
    echo -e "${GREEN}✅${NC} $1"
}

check_fail() {
    echo -e "${RED}❌${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# 1. 检查 Node.js 版本
echo "1. 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        check_pass "Node.js 版本: $(node -v) (>= 18)"
    else
        check_fail "Node.js 版本过低: $(node -v) (需要 >= 18)"
    fi
else
    check_fail "Node.js 未安装"
fi

# 2. 检查 npm
echo "2. 检查 npm..."
if command -v npm &> /dev/null; then
    check_pass "npm 版本: $(npm -v)"
else
    check_fail "npm 未安装"
fi

# 3. 检查关键依赖
echo "3. 检查关键依赖..."
if [ -f "package.json" ]; then
    if grep -q "proper-lockfile" package.json; then
        check_pass "proper-lockfile 已在依赖中"
    else
        check_fail "proper-lockfile 未在依赖中（并发修复必需）"
    fi
    
    if grep -q "express-rate-limit" package.json; then
        check_pass "express-rate-limit 已在依赖中"
    else
        check_fail "express-rate-limit 未在依赖中（API 限流必需）"
    fi
else
    check_fail "package.json 不存在"
fi

# 4. 检查 node_modules
echo "4. 检查依赖安装..."
if [ -d "node_modules" ]; then
    if [ -d "node_modules/proper-lockfile" ]; then
        check_pass "proper-lockfile 已安装"
    else
        check_fail "proper-lockfile 未安装，运行: npm install"
    fi
    
    if [ -d "node_modules/express-rate-limit" ]; then
        check_pass "express-rate-limit 已安装"
    else
        check_fail "express-rate-limit 未安装，运行: npm install"
    fi
else
    check_warn "node_modules 目录不存在，运行: npm install"
fi

# 5. 检查 server.js 语法
echo "5. 检查 server.js 语法..."
if [ -f "server.js" ]; then
    if node --check server.js 2>/dev/null; then
        check_pass "server.js 语法正确"
    else
        check_fail "server.js 语法错误"
    fi
else
    check_fail "server.js 不存在"
fi

# 6. 检查并发修复
echo "6. 检查并发修复..."
if [ -f "server.js" ]; then
    if grep -q "proper-lockfile" server.js; then
        check_pass "文件锁机制已实现"
    else
        check_fail "文件锁机制未实现"
    fi
    
    if grep -q "express-rate-limit" server.js; then
        check_pass "API 限流已实现"
    else
        check_fail "API 限流未实现"
    fi
    
    if grep -q "lockfile.lock" server.js; then
        check_pass "文件锁调用已添加"
    else
        check_fail "文件锁调用未添加"
    fi
else
    check_fail "server.js 不存在"
fi

# 7. 检查构建文件
echo "7. 检查前端构建..."
if [ -d "dist" ]; then
    if [ -f "dist/index.html" ]; then
        check_pass "前端构建文件存在"
    else
        check_warn "dist/index.html 不存在，运行: npm run build"
    fi
else
    check_warn "dist 目录不存在，运行: npm run build"
fi

# 8. 检查环境变量
echo "8. 检查环境变量..."
if [ -f ".env" ]; then
    check_pass ".env 文件存在"
    
    if grep -q "GEMINI_API_KEY" .env && ! grep -q "GEMINI_API_KEY=your_api_key" .env; then
        check_pass "GEMINI_API_KEY 已配置"
    else
        check_warn "GEMINI_API_KEY 未正确配置"
    fi
    
    if grep -q "NODE_ENV=production" .env; then
        check_pass "NODE_ENV=production 已设置"
    else
        check_warn "NODE_ENV 未设置为 production"
    fi
else
    if [ -f ".env.example" ]; then
        check_warn ".env 文件不存在，从 .env.example 创建"
    else
        check_fail ".env 文件不存在且没有 .env.example"
    fi
fi

# 9. 检查必要目录
echo "9. 检查必要目录..."
for dir in "logs" "questions"; do
    if [ -d "$dir" ]; then
        check_pass "$dir 目录存在"
    else
        check_warn "$dir 目录不存在，将自动创建"
        mkdir -p "$dir"
    fi
done

# 10. 检查 PM2（可选）
echo "10. 检查 PM2..."
if command -v pm2 &> /dev/null; then
    check_pass "PM2 已安装"
else
    check_warn "PM2 未安装（推荐安装用于进程管理）"
fi

# 11. 检查端口占用
echo "11. 检查端口占用..."
PORT=3001
if command -v lsof &> /dev/null; then
    if lsof -ti:$PORT &> /dev/null; then
        check_warn "端口 $PORT 已被占用，部署时可能需要先停止现有进程"
    else
        check_pass "端口 $PORT 可用"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":$PORT "; then
        check_warn "端口 $PORT 已被占用"
    else
        check_pass "端口 $PORT 可用"
    fi
else
    check_warn "无法检查端口占用（需要 lsof 或 netstat）"
fi

# 总结
echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo -e "${GREEN}✅ 通过: $((10 - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}⚠️  警告: $WARNINGS${NC}"
echo -e "${RED}❌ 错误: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有关键检查通过！可以部署到生产环境。${NC}"
    exit 0
else
    echo -e "${RED}❌ 发现 $ERRORS 个错误，请修复后再部署。${NC}"
    exit 1
fi
