#!/bin/bash

# OKR 后端自动部署脚本
# 支持多服务器配置和灵活的部署管理
# 作者: Claude Code

set -e  # 遇到错误立即退出

# 确保在项目根目录执行
cd "$(dirname "$0")/.."

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
DEFAULT_CONFIG="server1.conf"

# 颜色输出
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

# 显示帮助信息
show_help() {
    echo
    echo "====================== OKR 后端部署脚本 使用帮助 ======================"
    echo
    echo "用法:"
    echo "  $0 [OPTIONS] [COMMAND]"
    echo
    echo "命令:"
    echo "  deploy      执行部署操作（默认）"
    echo "  rollback    回滚到上一个版本"
    echo
    echo "选项:"
    echo "  -c, --config <config>   指定配置文件（相对于 config/ 目录）"
    echo "  -l, --list              列出所有可用的配置文件"
    echo "  -h, --help              显示此帮助信息"
    echo
    echo "示例:"
    echo "  部署到服务器1 (默认): $0 deploy"
    echo "  部署到服务器2:        $0 -c server2.conf deploy"
    echo "  列出所有配置:          $0 -l"
    echo "  回滚服务器2:          $0 -c server2.conf rollback"
    echo
    echo "可用的配置文件:"
    list_configs
    echo "======================================================================"
    echo
}

# 列出所有配置文件
list_configs() {
    if [ ! -d "$CONFIG_DIR" ]; then
        echo "  [未找到配置目录]"
        return
    fi

    for config in "$CONFIG_DIR"/*.conf; do
        if [ -f "$config" ]; then
            config_name=$(basename "$config")
            config_desc=$(grep "^# 服务器:" "$config" | head -1 | sed 's/^# //')
            printf "  %-20s %s\n" "$config_name" "$config_desc"
        fi
    done
}

# 加载配置文件的函数
load_config() {
    local config_file="$1"

    if [ ! -f "$config_file" ]; then
        log_error "配置文件不存在: $config_file"
        show_help
        exit 1
    fi

    source "$config_file"
}

# 检查本地环境
check_local_environment() {
    log_info "检查本地环境..."

    # 检查是否在正确的目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录执行此脚本"
        exit 1
    fi

    # 检查git状态
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "工作目录有未提交的更改，建议先提交或储藏"
        read -p "是否继续部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    log_success "本地环境检查完成"
}

# 构建项目
build_project() {
    log_info "构建后端项目..."

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        npm install
    fi

    # 构建项目
    log_info "构建生产版本..."
    eval "$BUILD_COMMAND"

    if [ $? -eq 0 ]; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi
}

# 备份服务器当前版本
backup_server() {
    log_info "备份服务器当前版本..."

    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        # 创建备份目录
        mkdir -p $BACKUP_DIR/\$(date +%Y%m%d_%H%M%S)

        # 备份后端
        if [ -d '$BACKEND_DIR' ]; then
            cp -r $BACKEND_DIR/* $BACKUP_DIR/\$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
            echo '后端备份完成'
        fi

        # 保留最近N个备份
        cd $BACKUP_DIR && ls -t -d */ | tail -n +\$((BACKUP_KEEP_COUNT+1)) | xargs -r rm -rf
    "

    log_success "服务器备份完成"
}

# 上传文件到服务器
upload_files() {
    log_info "上传文件到服务器..."

    # 构建 rsync 排除列表
    local exclude_args=""
    for exclude in "${RSYNC_EXCLUDES[@]}"; do
        exclude_args="$exclude_args --exclude '$exclude'"
    done

    # 使用rsync上传文件
    eval "rsync -avz --delete -e 'ssh -p $SERVER_PORT' $exclude_args ./dist $SERVER_USER@$SERVER_IP:$BACKEND_DIR/"
    eval "rsync -avz -e 'ssh -p $SERVER_PORT' $exclude_args package.json package-lock.json $SERVER_USER@$SERVER_IP:$BACKEND_DIR/"

    log_success "文件上传完成"
}

# 服务器端部署操作
deploy_on_server() {
    log_info "在服务器上执行部署操作..."

    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        cd $BACKEND_DIR

        # 安装生产依赖
        echo '[INFO] 安装/更新生产依赖...'
        npm install --production

        # 停止旧应用（如果存在）
        echo '[INFO] 停止旧应用...'
        pm2 delete $BACKEND_PM2_NAME 2>/dev/null || true

        # 启动应用
        echo '[INFO] 启动应用...'
        pm2 start dist/src/main.js --name $BACKEND_PM2_NAME
        pm2 save

        # 等待应用启动
        sleep 3

        # 检查应用是否正常运行
        if pm2 list | grep -q '$BACKEND_PM2_NAME.*online'; then
            echo '[SUCCESS] 应用启动成功'
        else
            echo '[ERROR] 应用启动失败，请检查日志'
            pm2 logs $BACKEND_PM2_NAME --lines 30
            exit 1
        fi

        # 运行数据库迁移（如果启用）
        if [ \"$RUN_MIGRATION\" = \"true\" ]; then
            echo '[INFO] 运行数据库迁移...'
            eval \"$MIGRATION_COMMAND\"
            if [ \$? -eq 0 ]; then
                echo '[SUCCESS] 数据库迁移完成'
            else
                echo '[WARNING] 数据库迁移失败，但应用已启动'
                exit 1
            fi
        fi

        echo '[INFO] 部署完成，正在检查应用状态...'
        pm2 show $BACKEND_PM2_NAME
    "

    log_success "服务器部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 等待服务启动
    sleep 3

    # 检查后端服务
    log_info "检查后端服务..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")

    if [ "$response" = "200" ] || [ "$response" = "403" ]; then
        log_success "后端服务健康检查通过 (HTTP $response)"
    else
        log_warning "后端服务健康检查未能确认，HTTP状态码: $response"
        log_info "请检查服务器日志"
        ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "pm2 logs $BACKEND_PM2_NAME --lines 30"
    fi
}

# 回滚函数
rollback() {
    log_warning "开始回滚到上一个版本..."

    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        cd $BACKUP_DIR
        latest_backup=\$(ls -t -d */ | head -n 1 | sed 's|/$||')

        if [ -n \"\$latest_backup\" ] && [ -d \"\$latest_backup\" ]; then
            echo '[INFO] 找到备份: '\$latest_backup

            # 停止服务
            pm2 stop $BACKEND_PM2_NAME 2>/dev/null || true

            # 清理当前版本
            rm -rf $BACKEND_DIR/dist

            # 恢复备份的dist目录
            if [ -d \"\$latest_backup/dist\" ]; then
                cp -r \"\$latest_backup/dist\" $BACKEND_DIR/
                echo '[INFO] 恢复dist目录完成'
            fi

            # 重启服务
            cd $BACKEND_DIR
            pm2 start dist/src/main.js --name $BACKEND_PM2_NAME || pm2 restart $BACKEND_PM2_NAME

            # 等待应用启动
            sleep 3
            pm2 show $BACKEND_PM2_NAME

            echo '[SUCCESS] 回滚完成'
        else
            echo '[ERROR] 未找到备份文件，无法回滚'
            exit 1
        fi
    "

    log_success "回滚完成"
}

# 显示部署信息
show_deploy_info() {
    echo
    log_success "部署完成！"
    echo "=================== 部署信息 ==================="
    echo "配置文件: $(basename $CONFIG_FILE)"
    echo "服务器描述: $SERVER_DESC"
    echo "后端API: $HEALTH_CHECK_URL"
    echo "服务器地址: $SERVER_IP:$SERVER_PORT"
    echo "部署目录: $BACKEND_DIR"
    echo "PM2应用名: $BACKEND_PM2_NAME"
    echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Git提交: $(git rev-parse --short HEAD)"
    echo "=============================================="
    echo
    echo "常用命令："
    echo "查看日志: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP 'pm2 logs $BACKEND_PM2_NAME'"
    echo "查看状态: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP 'pm2 status'"
    echo "重启应用: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP 'pm2 restart $BACKEND_PM2_NAME'"
    echo "查看配置: cat deploy/config/$(basename $CONFIG_FILE)"
    echo
}

# 主函数
main() {
    echo "=================== OKR 后端自动部署脚本 ==================="
    echo "配置文件: $(basename $CONFIG_FILE)"
    echo "服务器描述: $SERVER_DESC"
    echo "目标服务器: $SERVER_IP:$SERVER_PORT"
    echo "后端目录: $BACKEND_DIR"
    echo "=========================================================="
    echo

    # 确认部署
    read -p "确认开始部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi

    # 执行部署步骤
    check_local_environment
    build_project
    backup_server
    upload_files
    deploy_on_server
    health_check
    show_deploy_info

    log_success "🎉 部署完成！"
}

# 解析命令行参数（在加载配置之前）
config_name="$DEFAULT_CONFIG"
command="deploy"

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--config)
            config_name="$2"
            shift 2
            ;;
        -l|--list)
            list_configs
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        deploy|rollback)
            command="$1"
            shift
            ;;
        *)
            log_error "未知的参数: $1"
            show_help
            exit 1
            ;;
    esac
done

CONFIG_FILE="$CONFIG_DIR/$config_name"

# 加载配置文件
load_config "$CONFIG_FILE"

# 错误处理
trap 'log_error "部署过程中发生错误，如需回滚请运行: $0 -c $(basename $CONFIG_FILE) rollback"' ERR

# 执行相应命令
case "$command" in
    "rollback")
        rollback
        ;;
    "deploy"|*)
        main
        ;;
esac