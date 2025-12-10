#!/bin/bash

# SSL 证书配置脚本 (Let's Encrypt)

set -e

echo "🔒 配置 SSL 证书..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 检查 certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 Certbot..."
    if command -v yum &> /dev/null; then
        yum install -y certbot python3-certbot-nginx
    elif command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    else
        echo "❌ 无法自动安装 Certbot，请手动安装"
        exit 1
    fi
fi

# 确保 Nginx 已配置
if [ ! -f /etc/nginx/sites-available/bankware.fun ]; then
    echo "❌ 请先运行 ./setup-nginx.sh 配置 Nginx"
    exit 1
fi

# 获取 SSL 证书
echo "🔐 获取 SSL 证书..."
certbot --nginx -d bankware.fun -d www.bankware.fun --non-interactive --agree-tos --email admin@bankware.fun

if [ $? -eq 0 ]; then
    echo "✅ SSL 证书配置成功！"
    
    # 设置自动续期
    echo "🔄 设置自动续期..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo ""
    echo "✅ SSL 配置完成！"
    echo "🌐 现在可以通过 https://bankware.fun 访问您的应用"
else
    echo "❌ SSL 证书配置失败"
    exit 1
fi

