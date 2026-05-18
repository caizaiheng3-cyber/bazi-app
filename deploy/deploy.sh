#!/bin/bash
set -e

echo "=== 八字命理 - 一键部署脚本 ==="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 安装完成"
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 检查 .env 文件
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从模板创建..."
    cp .env.example .env
    echo "❗ 请编辑 deploy/.env 填入你的 DEEPSEEK_API_KEY 和密码"
    echo "   vim .env"
    exit 1
fi

# 检查 DEEPSEEK_API_KEY 是否已配置
source .env
if [ "$DEEPSEEK_API_KEY" = "sk-your-key-here" ] || [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "❌ 请先在 .env 中配置 DEEPSEEK_API_KEY"
    exit 1
fi

echo "📦 开始构建 Docker 镜像..."
docker compose build --no-cache

echo "🚀 启动服务..."
docker compose up -d

echo ""
echo "✅ 部署完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose logs -f"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
echo "  更新部署: git pull && docker compose build && docker compose up -d"
