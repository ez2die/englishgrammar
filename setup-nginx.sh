#!/bin/bash

# Nginx 配置脚本

set -e

echo "🔧 配置 Nginx..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="/etc/nginx/sites-available/bankware.fun"
NGINX_ENABLED="/etc/nginx/sites-enabled/bankware.fun"

# 检查 Nginx 是否安装
if ! command -v nginx &> /dev/null; then
    echo "📦 安装 Nginx..."
    if command -v yum &> /dev/null; then
        yum install -y nginx
    elif command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    else
        echo "❌ 无法自动安装 Nginx，请手动安装"
        exit 1
    fi
fi

# 复制配置文件
echo "📝 复制 Nginx 配置文件..."
cp "$PROJECT_DIR/nginx.conf" "$NGINX_CONF"

# 创建符号链接
if [ -L "$NGINX_ENABLED" ]; then
    rm "$NGINX_ENABLED"
fi
ln -s "$NGINX_CONF" "$NGINX_ENABLED"

# 测试配置
echo "🧪 测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx 配置测试通过"
    echo "🔄 重新加载 Nginx..."
    systemctl reload nginx
    echo "✅ Nginx 已重新加载"
else
    echo "❌ Nginx 配置测试失败，请检查配置文件"
    exit 1
fi

echo ""
echo "✅ Nginx 配置完成！"
echo ""
echo "📝 下一步:"
echo "   1. 配置 SSL 证书: sudo ./setup-ssl.sh"
echo "   2. 或手动运行: sudo certbot --nginx -d bankware.fun -d www.bankware.fun"

