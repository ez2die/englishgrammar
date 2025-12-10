#!/bin/bash

# Node.js 安装脚本
# 适用于 Alibaba Cloud Linux / CentOS / RHEL

set -e

echo "📦 开始安装 Node.js..."

# 检查是否已安装
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js 已安装: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo "✅ npm 已安装: $NPM_VERSION"
    fi
    
    read -p "是否重新安装? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过安装"
        exit 0
    fi
fi

# 检测系统版本
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "❌ 无法检测系统版本"
    exit 1
fi

echo "🖥️  检测到系统: $OS $VERSION"

# 安装必要的工具
echo "🔧 安装必要的工具..."
if command -v yum &> /dev/null; then
    yum install -y curl
elif command -v dnf &> /dev/null; then
    dnf install -y curl
else
    echo "❌ 未找到包管理器 (yum/dnf)"
    exit 1
fi

# 使用 NodeSource 仓库安装 Node.js 20 LTS
echo "📥 添加 NodeSource 仓库..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# 安装 Node.js
echo "📦 安装 Node.js..."
if command -v yum &> /dev/null; then
    yum install -y nodejs
elif command -v dnf &> /dev/null; then
    dnf install -y nodejs
fi

# 验证安装
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    echo ""
    echo "✅ Node.js 安装成功!"
    echo "   Node.js 版本: $NODE_VERSION"
    echo "   npm 版本: $NPM_VERSION"
    echo ""
    echo "📝 下一步:"
    echo "   1. 运行 ./deploy.sh 部署项目"
    echo "   2. 或手动运行: cd /tmp/English-master_-english-analysis && npm install"
else
    echo "❌ Node.js 安装失败"
    exit 1
fi

