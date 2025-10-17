#!/bin/bash

# OKR 系统快速部署脚本（仅更新业务代码）
# 适用场景：纯业务逻辑修改，无新依赖、无新文件
# 使用方法: ./quick-deploy.sh

set -e

# 配置
SERVER_HOST="47.239.124.157"
SERVER_USER="root"
SERVER_DIR="/www/wwwroot/okr-server"
LOCAL_DIR="$(dirname $(dirname $(realpath $0)))"
PM2_APP_NAME="okr-server"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}        快速部署模式${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${YELLOW}注意：此模式仅更新业务代码 (dist目录)${NC}"
echo -e "${YELLOW}如果有以下情况，请使用完整部署 deploy.sh：${NC}"
echo -e "  • 新增了 npm 依赖包"
echo -e "  • 新增了模板文件"
echo -e "  • 新增了配置文件"
echo -e "  • 修改了数据库结构"
echo ""

# 检测是否有新依赖
echo "检测项目变更..."

# 检查 package.json 是否有变更
if git diff --name-only HEAD~1 HEAD | grep -q "package.json"; then
    echo -e "${RED}警告：检测到 package.json 有变更！${NC}"
    echo -e "${RED}建议使用完整部署：./deploy/deploy.sh${NC}"
    read -p "确认继续快速部署？(y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 1
    fi
fi

# 检查是否有新增的非 TypeScript 文件
NEW_FILES=$(git diff --name-only --diff-filter=A HEAD~1 HEAD | grep -v '\.ts$' | grep -v '\.js$' || echo "")
if [ ! -z "$NEW_FILES" ]; then
    echo -e "${RED}警告：检测到新增的非代码文件：${NC}"
    echo "$NEW_FILES" | sed 's/^/  • /'
    echo -e "${RED}建议使用完整部署：./deploy/deploy.sh${NC}"
    read -p "确认继续快速部署？(y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 1
    fi
fi

echo -e "${GREEN}开始快速部署...${NC}"

# 1. 构建
echo "构建项目..."
cd "$LOCAL_DIR"
npm run build

# 2. 上传（仅 dist 目录）
echo "上传代码..."
rsync -az --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '.git' \
    "$LOCAL_DIR/dist/" "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/dist/"

# 3. 重启
echo "重启应用..."
ssh $SERVER_USER@$SERVER_HOST "pm2 restart $PM2_APP_NAME && pm2 save"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}        快速部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "如果应用启动失败，可能是因为："
echo "  • 缺少新的依赖包"
echo "  • 缺少新的模板文件"
echo "  • 缺少新的配置文件"
echo ""
echo "请使用完整部署解决：./deploy/deploy.sh"