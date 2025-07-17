#!/bin/bash

# OKR服务回滚脚本
# 用于回滚到指定的备份版本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示可用备份
show_backups() {
    echo "可用备份列表:"
    echo "=================================="
    
    if [ ! -d "backups" ]; then
        log_warning "未找到备份目录"
        return 1
    fi
    
    local count=0
    for backup in backups/*/; do
        if [ -d "$backup" ]; then
            count=$((count + 1))
            backup_name=$(basename "$backup")
            backup_date=$(echo "$backup_name" | sed 's/_/ /')
            echo "$count. $backup_name ($backup_date)"
        fi
    done
    
    if [ $count -eq 0 ]; then
        log_warning "未找到任何备份"
        return 1
    fi
    
    echo "=================================="
    return 0
}

# 回滚到指定备份
rollback_to_backup() {
    local backup_dir=$1
    
    if [ ! -d "$backup_dir" ]; then
        log_error "备份目录不存在: $backup_dir"
        exit 1
    fi
    
    log_info "开始回滚到备份: $(basename "$backup_dir")"
    
    # 停止服务
    log_info "停止服务..."
    pm2 stop okr-server 2>/dev/null || log_warning "服务未运行"
    
    # 备份当前状态
    log_info "备份当前状态..."
    current_backup="backups/rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$current_backup"
    cp -r dist "$current_backup/" 2>/dev/null || true
    cp .env "$current_backup/" 2>/dev/null || true
    
    # 恢复文件
    log_info "恢复文件..."
    if [ -d "$backup_dir/dist" ]; then
        rm -rf dist
        cp -r "$backup_dir/dist" .
        log_success "dist目录已恢复"
    fi
    
    if [ -f "$backup_dir/.env" ]; then
        cp "$backup_dir/.env" .
        log_success ".env文件已恢复"
    fi
    
    # 重启服务
    log_info "启动服务..."
    pm2 start okr-server
    
    # 验证
    sleep 3
    if pm2 list | grep -q "okr-server.*online"; then
        log_success "回滚完成，服务运行正常"
    else
        log_error "回滚后服务启动失败"
        pm2 logs okr-server --lines 10
    fi
}

# 主函数
main() {
    echo "=================================="
    echo "    OKR服务回滚脚本 v1.0"
    echo "=================================="
    echo ""
    
    if ! show_backups; then
        exit 1
    fi
    
    echo ""
    read -p "请输入要回滚的备份编号 (或输入备份目录名): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
        # 数字选择
        backup_array=(backups/*/)
        if [ $choice -gt 0 ] && [ $choice -le ${#backup_array[@]} ]; then
            selected_backup=${backup_array[$((choice-1))]}
        else
            log_error "无效的备份编号"
            exit 1
        fi
    else
        # 直接输入目录名
        selected_backup="backups/$choice"
    fi
    
    echo ""
    read -p "确认要回滚到 $(basename "$selected_backup") 吗? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        rollback_to_backup "$selected_backup"
    else
        log_info "回滚已取消"
    fi
}

# 错误处理
trap 'log_error "回滚脚本执行失败"; exit 1' ERR

# 执行主函数
main "$@"