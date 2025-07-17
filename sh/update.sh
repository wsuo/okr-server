#!/bin/bash

# OKR服务器更新脚本
# 用于自动拉取最新代码并重启服务

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查是否为root用户或在正确目录
check_environment() {
    log_info "检查运行环境..."
    
    # 检查当前目录是否包含package.json
    if [ ! -f "package.json" ]; then
        log_error "当前目录不是OKR项目根目录，请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查是否有git仓库
    if [ ! -d ".git" ]; then
        log_error "当前目录不是git仓库"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 备份当前状态
backup_current() {
    log_info "备份当前版本..."
    
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份关键文件
    cp -r dist "$BACKUP_DIR/" 2>/dev/null || log_warning "dist目录不存在，跳过备份"
    cp .env "$BACKUP_DIR/" 2>/dev/null || log_warning ".env文件不存在，跳过备份"
    cp package.json "$BACKUP_DIR/"
    
    log_success "备份完成: $BACKUP_DIR"
}

# 停止服务
stop_service() {
    log_info "停止OKR服务..."
    
    # 检查PM2进程是否存在
    if pm2 list | grep -q "okr-server"; then
        pm2 stop okr-server
        log_success "服务已停止"
    else
        log_warning "未找到运行中的okr-server进程"
    fi
}

# 拉取最新代码
pull_latest_code() {
    log_info "拉取最新代码..."
    
    # 保存当前分支
    CURRENT_BRANCH=$(git branch --show-current)
    log_info "当前分支: $CURRENT_BRANCH"
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "检测到未提交的更改，将暂存..."
        git stash push -m "auto-stash before update $(date)"
    fi
    
    # 拉取最新代码
    git fetch origin
    git pull origin "$CURRENT_BRANCH"
    
    log_success "代码更新完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装/更新依赖..."
    
    # 检查package-lock.json是否有变化
    if git diff HEAD~1 HEAD --name-only | grep -q "package"; then
        log_info "检测到依赖变化，重新安装..."
        npm ci
    else
        log_info "依赖无变化，跳过安装"
    fi
    
    log_success "依赖处理完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 清理旧的构建文件
    rm -rf dist
    
    # 构建项目
    npm run build
    
    # 检查构建结果
    if [ ! -d "dist" ]; then
        log_error "构建失败，dist目录不存在"
        exit 1
    fi
    
    log_success "项目构建完成"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    # 检查是否有新的迁移文件
    if [ -d "src/database/migrations" ] && [ "$(ls -A src/database/migrations)" ]; then
        npm run migration:run || log_warning "迁移执行失败，请手动检查"
    else
        log_info "无迁移文件，跳过迁移"
    fi
    
    log_success "数据库迁移完成"
}

# 启动服务
start_service() {
    log_info "启动OKR服务..."
    
    # 使用PM2启动服务
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        log_warning "未找到ecosystem.config.js，使用默认配置启动"
        pm2 start dist/src/main.js --name okr-server
    fi
    
    # 保存PM2配置
    pm2 save
    
    log_success "服务已启动"
}

# 验证服务状态
verify_service() {
    log_info "验证服务状态..."
    
    sleep 5  # 等待服务启动
    
    # 检查PM2状态
    if pm2 list | grep -q "okr-server.*online"; then
        log_success "服务运行正常"
        
        # 检查服务响应
        if command -v curl >/dev/null 2>&1; then
            PORT=$(grep "PORT=" .env | cut -d'=' -f2 | tr -d ' ')
            if curl -f "http://localhost:${PORT:-3010}/api/v1/health" >/dev/null 2>&1; then
                log_success "服务健康检查通过"
            else
                log_warning "服务健康检查失败，请检查服务状态"
            fi
        fi
    else
        log_error "服务启动失败"
        pm2 logs okr-server --lines 20
        exit 1
    fi
}

# 清理备份
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    if [ -d "backups" ]; then
        # 保留最近7天的备份
        find backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
        log_success "旧备份清理完成"
    fi
}

# 主函数
main() {
    echo "=================================="
    echo "    OKR服务器更新脚本 v1.0"
    echo "=================================="
    echo ""
    
    check_environment
    backup_current
    stop_service
    pull_latest_code
    install_dependencies
    build_project
    run_migrations
    start_service
    verify_service
    cleanup_old_backups
    
    echo ""
    echo "=================================="
    log_success "更新完成！"
    echo "=================================="
    echo ""
    
    # 显示服务状态
    pm2 status okr-server
    
    # 显示最新的几条日志
    echo ""
    log_info "最新日志:"
    pm2 logs okr-server --lines 10 --nostream
}

# 错误处理
trap 'log_error "脚本执行失败，正在回滚..."; pm2 restart okr-server 2>/dev/null || true; exit 1' ERR

# 执行主函数
main "$@"