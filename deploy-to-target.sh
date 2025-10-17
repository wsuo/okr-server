#!/bin/bash

# 部署脚本 - 直接部署到 47.243.127.167
# 配置
TARGET_HOST="47.243.127.167"
TARGET_USER="root"
TARGET_DIR="/www/wwwroot/okr-server"
LOCAL_DIR="$(dirname $(realpath $0))"

set -e

echo "=========================================="
echo "开始部署到 $TARGET_HOST"
echo "=========================================="

# 1. 创建目录
echo "创建远程目录..."
ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST "mkdir -p $TARGET_DIR && mkdir -p $TARGET_DIR/logs $TARGET_DIR/uploads"

# 2. 上传代码
echo "上传代码文件..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude 'logs' \
  --exclude 'uploads' \
  "$LOCAL_DIR/dist/" "$TARGET_USER@$TARGET_HOST:$TARGET_DIR/dist/"

rsync -avz \
  "$LOCAL_DIR/src/" "$TARGET_USER@$TARGET_HOST:$TARGET_DIR/src/"

rsync -avz \
  "$LOCAL_DIR/package.json" \
  "$LOCAL_DIR/package-lock.json" \
  "$LOCAL_DIR/tsconfig.json" \
  "$LOCAL_DIR/nest-cli.json" \
  "$TARGET_USER@$TARGET_HOST:$TARGET_DIR/"

# 3. 创建 .env 文件
echo "创建环境变量文件..."
ssh $TARGET_USER@$TARGET_HOST "cat > $TARGET_DIR/.env << 'ENVEOF'
NODE_ENV=production
PORT=3010

DB_HOST=47.239.124.157
DB_PORT=13306
DB_USERNAME=root
DB_PASSWORD=N8653jnRwnEpk5Hd
DB_DATABASE=okr_system_share1

JWT_SECRET=gerenuk-jwt-token-secret
JWT_EXPIRES_IN=7200s

REDIS_HOST=47.239.124.157
REDIS_PORT=6379
REDIS_PASSWORD=

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USERNAME=wangsuoo@qq.com
MAIL_PASSWORD=bvfzzmxobkdniiic

LOG_LEVEL=info
LOG_RESPONSE_BODY=false
ENVEOF
"

# 4. 安装依赖
echo "安装依赖..."
ssh $TARGET_USER@$TARGET_HOST "cd $TARGET_DIR && npm install --production"

# 5. 停止旧应用（如果存在）
echo "停止旧应用..."
ssh $TARGET_USER@$TARGET_HOST "pm2 delete okr-server 2>/dev/null || true"

# 6. 启动应用
echo "启动应用..."
ssh $TARGET_USER@$TARGET_HOST "cd $TARGET_DIR && pm2 start dist/src/main.js --name okr-server && pm2 save"

# 7. 验证
echo "验证应用状态..."
sleep 3
ssh $TARGET_USER@$TARGET_HOST "pm2 status okr-server"

echo ""
echo "✓ 部署完成！"
echo "应用地址: http://$TARGET_HOST:3010"
echo ""
