#!/bin/bash

# OKR 系统自动化部署脚本
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

# 配置
SERVER_HOST="47.239.124.157"
SERVER_USER="root"
SERVER_DIR="/www/wwwroot/okr-server"
LOCAL_DIR="$(dirname $(dirname $(realpath $0)))"
PM2_APP_NAME="okr-server"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 确认部署
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}        OKR 系统部署脚本${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "部署目标服务器: $SERVER_HOST"
echo "部署目录: $SERVER_DIR"
echo ""
read -p "确认开始部署? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "部署已取消"
    exit 1
fi

log_info "开始部署流程..."

# 步骤1: 构建本地项目
log_info "步骤 1/6: 构建本地项目..."
cd "$LOCAL_DIR"
npm run build
if [ $? -ne 0 ]; then
    log_error "构建失败"
    exit 1
fi
log_info "构建成功"

# 步骤2: 备份线上代码
log_info "步骤 2/6: 备份线上代码..."
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_DIR && tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz dist src package.json package-lock.json 2>/dev/null || echo '备份可能部分失败，但继续部署'"
log_info "备份完成"

# 步骤3: 上传新代码
log_info "步骤 3/6: 上传新代码到服务器..."
# 创建临时目录
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_DIR/temp_deploy"

# 上传必要文件
# 临时关闭错误退出，允许 rsync 的部分传输警告
set +e

# 上传 dist 目录
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude 'logs' \
    --exclude '*.log' \
    --exclude 'backup_*.tar.gz' \
    "$LOCAL_DIR/dist/" "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/temp_deploy/dist/"
RSYNC_EXIT_CODE=$?
if [ $RSYNC_EXIT_CODE -ne 0 ] && [ $RSYNC_EXIT_CODE -ne 23 ]; then
    log_error "dist 目录上传失败 (exit code: $RSYNC_EXIT_CODE)"
    exit 1
fi

# 上传 src 目录
rsync -avz --progress \
    "$LOCAL_DIR/src/" "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/temp_deploy/src/"
RSYNC_EXIT_CODE=$?
if [ $RSYNC_EXIT_CODE -ne 0 ] && [ $RSYNC_EXIT_CODE -ne 23 ]; then
    log_error "src 目录上传失败 (exit code: $RSYNC_EXIT_CODE)"
    exit 1
fi

# 上传配置文件
rsync -avz --progress \
    "$LOCAL_DIR/package.json" \
    "$LOCAL_DIR/package-lock.json" \
    "$LOCAL_DIR/tsconfig.json" \
    "$LOCAL_DIR/nest-cli.json" \
    "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/temp_deploy/"
RSYNC_EXIT_CODE=$?
if [ $RSYNC_EXIT_CODE -ne 0 ] && [ $RSYNC_EXIT_CODE -ne 23 ]; then
    log_error "配置文件上传失败 (exit code: $RSYNC_EXIT_CODE)"
    exit 1
fi

# 重新启用错误退出
set -e

log_info "文件上传完成"

# 步骤4: 替换线上代码
log_info "步骤 4/6: 替换线上代码..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd /www/wwwroot/okr-server
# 删除旧的 dist 和 src 目录
rm -rf dist src
# 移动新文件
mv temp_deploy/dist ./
mv temp_deploy/src ./
cp -f temp_deploy/*.json ./
# 清理临时目录
rm -rf temp_deploy
ENDSSH
log_info "代码替换完成"

# 步骤5: 安装依赖（如果 package.json 有变化）
log_info "步骤 5/6: 检查并安装依赖..."
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_DIR && npm install --production"
log_info "依赖安装完成"

# 步骤6: 重启应用
log_info "步骤 6/6: 重启 PM2 应用..."
ssh $SERVER_USER@$SERVER_HOST "pm2 restart $PM2_APP_NAME"
ssh $SERVER_USER@$SERVER_HOST "pm2 save"
log_info "应用重启成功"

# 验证部署
log_info "验证部署状态..."
sleep 3
ssh $SERVER_USER@$SERVER_HOST "pm2 status $PM2_APP_NAME"

# 检查应用健康状态
log_info "检查应用健康状态..."
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_HOST:3010/api/health || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    log_info "健康检查通过 (HTTP $HTTP_STATUS)"
else
    log_warn "健康检查失败 (HTTP $HTTP_STATUS)，请手动检查"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}        部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "应用访问地址: http://$SERVER_HOST:3010"
echo "API 文档地址: http://$SERVER_HOST:3010/api-docs"
echo ""
echo "如需回滚，请执行："
echo "ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_DIR && tar -xzf backup_*.tar.gz && pm2 restart $PM2_APP_NAME'"