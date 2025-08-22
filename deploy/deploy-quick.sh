#!/bin/bash

# OKR 系统快速部署脚本（无需确认）
# 使用方法: ./deploy-quick.sh

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
NC='\033[0m'

echo -e "${YELLOW}开始快速部署...${NC}"

# 1. 构建
echo "构建项目..."
cd "$LOCAL_DIR"
npm run build

# 2. 上传
echo "上传代码..."
rsync -az --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude 'logs' \
    --exclude '*.log' \
    --exclude 'backup_*.tar.gz' \
    --exclude 'temp_deploy' \
    "$LOCAL_DIR/dist/" "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/dist/"

# 3. 重启
echo "重启应用..."
ssh $SERVER_USER@$SERVER_HOST "pm2 restart $PM2_APP_NAME && pm2 save"

echo -e "${GREEN}部署完成！${NC}"