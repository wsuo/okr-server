#!/bin/bash

# OKR快速更新脚本
# 适用于仅代码更改，不涉及依赖和数据库迁移的快速更新

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=================================="
echo "    OKR快速更新脚本 v1.0"
echo "=================================="
echo ""

# 检查环境
log_info "检查环境..."
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 拉取代码
log_info "拉取最新代码..."
git pull

# 构建项目
log_info "构建项目..."
npm run build

# 重启服务
log_info "重启服务..."
pm2 restart okr-server

# 验证
log_info "验证服务状态..."
sleep 3
pm2 status okr-server

echo ""
log_success "快速更新完成！"
echo "=================================="