#!/bin/bash

# OKR 数据库同步脚本
# 使用方法: ./sync-database.sh [方向]
# 方向: local-to-remote (默认) 或 remote-to-local

set -e

# 数据库配置
LOCAL_DB_HOST="100.72.60.117"
LOCAL_DB_PORT="3306"
LOCAL_DB_USER="root"
LOCAL_DB_PASS="root"
LOCAL_DB_NAME="okr_system"

REMOTE_DB_HOST="127.0.0.1"
REMOTE_DB_PORT="13306"
REMOTE_DB_USER="root"
REMOTE_DB_PASS="N8653jnRwnEpk5Hd"
REMOTE_DB_NAME="okr_system"

SERVER_HOST="47.239.124.157"
SERVER_USER="root"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 默认方向
DIRECTION="${1:-local-to-remote}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}        OKR 数据库同步脚本${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

if [ "$DIRECTION" = "local-to-remote" ]; then
    echo "同步方向: 本地 → 线上"
    echo "警告: 这将覆盖线上数据库的所有数据！"
    echo ""
    read -p "确认继续? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "操作已取消"
        exit 1
    fi
    
    # 备份线上数据库
    echo -e "${GREEN}[1/4]${NC} 备份线上数据库..."
    BACKUP_FILE="/tmp/okr_system_backup_$(date +%Y%m%d_%H%M%S).sql"
    ssh $SERVER_USER@$SERVER_HOST "mysqldump -h$REMOTE_DB_HOST -P$REMOTE_DB_PORT -u$REMOTE_DB_USER -p$REMOTE_DB_PASS $REMOTE_DB_NAME > $BACKUP_FILE"
    echo "备份文件: $BACKUP_FILE"
    
    # 导出本地数据库
    echo -e "${GREEN}[2/4]${NC} 导出本地数据库..."
    TEMP_FILE="/tmp/okr_system_local_$(date +%Y%m%d_%H%M%S).sql"
    mysqldump -h$LOCAL_DB_HOST -P$LOCAL_DB_PORT -u$LOCAL_DB_USER -p$LOCAL_DB_PASS $LOCAL_DB_NAME > $TEMP_FILE
    
    # 上传到服务器
    echo -e "${GREEN}[3/4]${NC} 上传数据到服务器..."
    scp $TEMP_FILE $SERVER_USER@$SERVER_HOST:/tmp/
    
    # 导入到线上数据库
    echo -e "${GREEN}[4/4]${NC} 导入数据到线上数据库..."
    ssh $SERVER_USER@$SERVER_HOST << EOF
mysql -h$REMOTE_DB_HOST -P$REMOTE_DB_PORT -u$REMOTE_DB_USER -p$REMOTE_DB_PASS -e "DROP DATABASE IF EXISTS $REMOTE_DB_NAME; CREATE DATABASE $REMOTE_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h$REMOTE_DB_HOST -P$REMOTE_DB_PORT -u$REMOTE_DB_USER -p$REMOTE_DB_PASS $REMOTE_DB_NAME < $TEMP_FILE
EOF
    
    # 清理临时文件
    rm -f $TEMP_FILE
    ssh $SERVER_USER@$SERVER_HOST "rm -f $TEMP_FILE"
    
    echo -e "${GREEN}数据库同步完成！${NC}"
    echo "备份文件保存在服务器: $BACKUP_FILE"
    
elif [ "$DIRECTION" = "remote-to-local" ]; then
    echo "同步方向: 线上 → 本地"
    echo "警告: 这将覆盖本地数据库的所有数据！"
    echo ""
    read -p "确认继续? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "操作已取消"
        exit 1
    fi
    
    # 备份本地数据库
    echo -e "${GREEN}[1/4]${NC} 备份本地数据库..."
    BACKUP_FILE="/tmp/okr_system_local_backup_$(date +%Y%m%d_%H%M%S).sql"
    mysqldump -h$LOCAL_DB_HOST -P$LOCAL_DB_PORT -u$LOCAL_DB_USER -p$LOCAL_DB_PASS $LOCAL_DB_NAME > $BACKUP_FILE
    echo "备份文件: $BACKUP_FILE"
    
    # 导出线上数据库
    echo -e "${GREEN}[2/4]${NC} 导出线上数据库..."
    TEMP_FILE="/tmp/okr_system_remote_$(date +%Y%m%d_%H%M%S).sql"
    ssh $SERVER_USER@$SERVER_HOST "mysqldump -h$REMOTE_DB_HOST -P$REMOTE_DB_PORT -u$REMOTE_DB_USER -p$REMOTE_DB_PASS $REMOTE_DB_NAME > $TEMP_FILE"
    
    # 下载到本地
    echo -e "${GREEN}[3/4]${NC} 下载数据到本地..."
    scp $SERVER_USER@$SERVER_HOST:$TEMP_FILE $TEMP_FILE
    
    # 导入到本地数据库
    echo -e "${GREEN}[4/4]${NC} 导入数据到本地数据库..."
    mysql -h$LOCAL_DB_HOST -P$LOCAL_DB_PORT -u$LOCAL_DB_USER -p$LOCAL_DB_PASS -e "DROP DATABASE IF EXISTS $LOCAL_DB_NAME; CREATE DATABASE $LOCAL_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -h$LOCAL_DB_HOST -P$LOCAL_DB_PORT -u$LOCAL_DB_USER -p$LOCAL_DB_PASS $LOCAL_DB_NAME < $TEMP_FILE
    
    # 清理临时文件
    rm -f $TEMP_FILE
    ssh $SERVER_USER@$SERVER_HOST "rm -f $TEMP_FILE"
    
    echo -e "${GREEN}数据库同步完成！${NC}"
    echo "备份文件保存在本地: $BACKUP_FILE"
    
else
    echo -e "${RED}错误: 无效的同步方向${NC}"
    echo "使用方法: $0 [local-to-remote|remote-to-local]"
    exit 1
fi