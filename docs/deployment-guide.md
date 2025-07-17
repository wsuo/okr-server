# OKR 绩效考核系统 - 宝塔服务器部署指南

## 🚀 部署概述

本文档描述如何将 OKR 绩效考核系统部署到宝塔面板服务器上。

### 系统要求

- **服务器**: CentOS 7+ / Ubuntu 18.04+
- **内存**: 最少 2GB，推荐 4GB+
- **硬盘**: 最少 20GB 可用空间
- **宝塔面板**: 7.0+
- **Node.js**: 18.x+
- **MySQL**: 5.7+ / 8.0+
- **Redis**: 6.0+ (可选，用于缓存)

---

## 📦 预备工作

### 1. 安装宝塔面板

```bash
# CentOS 安装命令
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu 安装命令
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

### 2. 在宝塔面板中安装环境

登录宝塔面板，安装以下软件：

- **Node.js**: 18.x 版本
- **MySQL**: 8.0 版本
- **PM2**: 进程管理器
- **Nginx**: Web 服务器
- **Redis**: 缓存服务 (可选)

---

## 🗄️ 数据库准备

### 1. 创建数据库

在宝塔面板 → 数据库 → 添加数据库：

```sql
数据库名: okr_system
用户名: okr_user
密码: 强密码(建议16位以上)
权限: 所有权限
```

### 2. 初始化数据库

将以下 SQL 文件按顺序执行：

```bash
# 进入项目目录
cd /www/wwwroot/okr-server

# 执行初始化脚本（按顺序）
mysql -u okr_user -p okr_system < database/sql/001_init_schema.sql
mysql -u okr_user -p okr_system < database/sql/002_default_data.sql
mysql -u okr_user -p okr_system < database/sql/003_performance_template.sql
```

### 3. 验证数据库

```sql
-- 登录数据库验证
mysql -u okr_user -p okr_system

-- 检查表结构
SHOW TABLES;

-- 检查默认用户
SELECT id, username, name, email FROM users;

-- 检查默认角色
SELECT id, name, code, description FROM roles;
```

---

## 🔧 项目部署

### 1. 上传项目代码

```bash
# 创建项目目录
mkdir -p /www/wwwroot/okr-server
cd /www/wwwroot/okr-server

# 上传代码（通过 Git 或 FTP）
git clone https://github.com/wsuo/okr-server.git .
# 或者通过宝塔面板文件管理器上传 zip 包并解压
```

### 2. 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 如果网络慢，可以使用淘宝镜像
npm install --registry=https://registry.npm.taobao.org
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
```

`.env` 配置内容：

```env
# 应用配置
NODE_ENV=production
PORT=3000
APP_NAME=OKR绩效考核系统

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=okr_user
DB_PASSWORD=your_strong_password
DB_DATABASE=okr_system

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Redis 配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14

# 时区配置
TZ=Asia/Shanghai
```

### 4. 构建项目

```bash
# 构建生产版本
npm run build

# 验证构建结果
ls -la dist/
```

### 5. 运行数据库迁移

```bash
# 运行数据库迁移
npm run migration:run

# 初始化模板数据
npm run seed:template
```

---

## 🔄 进程管理

### 1. 使用 PM2 管理进程

创建 PM2 配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'okr-server',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
```

### 2. 启动应用

```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js --env production

# 查看应用状态
pm2 status

# 查看日志
pm2 logs okr-server

# 设置开机自启
pm2 startup
pm2 save
```

---

## 🌐 Nginx 配置

### 1. 创建 Nginx 配置

在宝塔面板 → 网站 → 添加站点：

```
域名: your-domain.com
根目录: /www/wwwroot/okr-server/dist (静态文件目录)
PHP版本: 纯静态
```

### 2. 配置反向代理

编辑站点配置文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 静态文件目录
    root /www/wwwroot/okr-server/dist;
    index index.html;
    
    # 日志文件
    access_log /www/wwwroot/okr-server/logs/nginx_access.log;
    error_log /www/wwwroot/okr-server/logs/nginx_error.log;
    
    # 限制上传大小
    client_max_body_size 10M;
    
    # API 请求代理到 Node.js 服务
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
    
    # Swagger 文档
    location /api-docs {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件处理
    location /uploads {
        alias /www/wwwroot/okr-server/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 前端路由支持 (如果是 SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全配置
    location ~ /\.ht {
        deny all;
    }
    
    location ~ /\.env {
        deny all;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

### 3. SSL 证书配置

在宝塔面板中申请免费 SSL 证书：

1. 进入站点设置
2. 点击 SSL 标签
3. 选择 Let's Encrypt 免费证书
4. 申请并部署证书
5. 开启强制 HTTPS

---

## 📊 监控与日志

### 1. 系统监控

安装宝塔监控插件：

```bash
# 在宝塔面板 → 软件商店 → 系统工具 → 安装监控插件
# 推荐安装：
# - 宝塔监控
# - 负载状态
# - 系统信息
```

### 2. 应用日志

```bash
# 查看应用日志
pm2 logs okr-server

# 查看 Nginx 访问日志
tail -f /www/wwwroot/okr-server/logs/nginx_access.log

# 查看 Nginx 错误日志
tail -f /www/wwwroot/okr-server/logs/nginx_error.log

# 查看应用错误日志
tail -f /www/wwwroot/okr-server/logs/err.log
```

### 3. 日志轮转

创建日志轮转配置：

```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/okr-server

# 配置内容
/www/wwwroot/okr-server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reload okr-server
    endscript
}
```

---

## 🔒 安全配置

### 1. 防火墙配置

```bash
# 开放必要端口
# 在宝塔面板 → 安全 → 防火墙 → 添加规则
# 80 (HTTP)
# 443 (HTTPS)
# 3000 (Node.js - 仅内网)
# 3306 (MySQL - 仅内网)
# 6379 (Redis - 仅内网)
```

### 2. 数据库安全

```sql
-- 创建只读用户 (用于备份)
CREATE USER 'okr_readonly'@'localhost' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON okr_system.* TO 'okr_readonly'@'localhost';

-- 限制 root 用户访问
UPDATE mysql.user SET Host='localhost' WHERE User='root';
FLUSH PRIVILEGES;
```

### 3. 文件权限

```bash
# 设置合适的文件权限
chown -R www:www /www/wwwroot/okr-server
chmod -R 755 /www/wwwroot/okr-server
chmod -R 644 /www/wwwroot/okr-server/.env
chmod -R 755 /www/wwwroot/okr-server/uploads
```

---

## 💾 备份策略

### 1. 数据库备份

```bash
# 创建备份脚本
nano /www/backup/backup_okr_db.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/okr_db"
DB_NAME="okr_system"
DB_USER="okr_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# 数据库备份
mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/okr_db_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/okr_db_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# 设置执行权限
chmod +x /www/backup/backup_okr_db.sh

# 添加定时任务
crontab -e
# 每天凌晨2点备份
0 2 * * * /www/backup/backup_okr_db.sh
```

### 2. 文件备份

```bash
# 创建文件备份脚本
nano /www/backup/backup_okr_files.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/okr_files"
SOURCE_DIR="/www/wwwroot/okr-server"

mkdir -p $BACKUP_DIR

# 备份上传文件和配置
tar -czf $BACKUP_DIR/okr_files_$DATE.tar.gz \
    $SOURCE_DIR/uploads \
    $SOURCE_DIR/.env \
    $SOURCE_DIR/package.json \
    $SOURCE_DIR/ecosystem.config.js

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

chmod +x /www/backup/backup_okr_files.sh

# 添加定时任务 (每天凌晨3点)
0 3 * * * /www/backup/backup_okr_files.sh
```

---

## 🚀 性能优化

### 1. Node.js 优化

```javascript
// 在 ecosystem.config.js 中添加
module.exports = {
  apps: [
    {
      name: 'okr-server',
      script: './dist/main.js',
      instances: 'max', // 使用所有 CPU 核心
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      // 启用 V8 优化
      env: {
        NODE_ENV: 'production',
        UV_THREADPOOL_SIZE: 16,
      },
    },
  ],
};
```

### 2. 数据库优化

```sql
-- 添加索引优化查询
-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);

-- 考核表索引
CREATE INDEX idx_assessments_period ON assessments(period);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_creator ON assessments(created_by);

-- 参与者表索引
CREATE INDEX idx_participants_user_assessment ON assessment_participants(user_id, assessment_id);
CREATE INDEX idx_participants_status ON assessment_participants(self_completed, leader_completed);

-- 评估表索引
CREATE INDEX idx_evaluations_type ON evaluations(type);
CREATE INDEX idx_evaluations_status ON evaluations(status);
```

### 3. Nginx 优化

```nginx
# 在 nginx.conf 中添加性能优化配置
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # 启用高效的文件传输
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # 连接超时设置
    keepalive_timeout 65;
    
    # 缓存配置
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

---

## 🔧 故障排除

### 1. 常见问题

**问题1: 应用启动失败**
```bash
# 检查错误日志
pm2 logs okr-server --lines 50

# 检查端口占用
netstat -tlnp | grep :3000

# 检查环境变量
cat .env

# 手动测试启动
npm run start:prod
```

**问题2: 数据库连接失败**
```bash
# 测试数据库连接
mysql -u okr_user -p -h localhost okr_system

# 检查 MySQL 服务状态
systemctl status mysql

# 检查 MySQL 配置
cat /etc/mysql/mysql.conf.d/mysqld.cnf
```

**问题3: 文件上传失败**
```bash
# 检查上传目录权限
ls -la /www/wwwroot/okr-server/uploads

# 检查磁盘空间
df -h

# 检查 Nginx 上传限制
grep client_max_body_size /www/server/nginx/conf/nginx.conf
```

### 2. 性能问题诊断

```bash
# 查看系统资源使用情况
top
htop
iotop

# 查看 Node.js 进程状态
pm2 monit

# 查看数据库性能
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW ENGINE INNODB STATUS;"

# 查看 Nginx 连接状态
nginx -t
nginx -s reload
```

---

## 📋 运维检查清单

### 日常检查
- [ ] 检查应用状态: `pm2 status`
- [ ] 检查系统资源: `htop`, `df -h`
- [ ] 检查日志文件大小: `du -sh logs/`
- [ ] 检查数据库连接: 登录测试
- [ ] 检查网站访问: 浏览器测试

### 周期性维护
- [ ] 更新系统补丁: `yum update` / `apt update`
- [ ] 检查备份文件: 验证备份完整性
- [ ] 清理临时文件: `rm -rf /tmp/*`
- [ ] 检查 SSL 证书到期时间
- [ ] 查看宝塔面板告警信息

### 月度维护
- [ ] 数据库优化: `OPTIMIZE TABLE`
- [ ] 日志归档: 清理旧日志文件
- [ ] 性能分析: 查看慢查询日志
- [ ] 安全审计: 检查访问日志异常
- [ ] 备份策略验证: 测试数据恢复

---

## 📞 技术支持

如部署过程中遇到问题，请联系：

- **技术支持**: your-email@example.com
- **文档仓库**: https://github.com/your-username/okr-server
- **问题反馈**: https://github.com/your-username/okr-server/issues

---

## 📄 版本说明

- **当前版本**: v1.0.0
- **部署日期**: 2025-07-14
- **更新日期**: 2025-07-14
- **适用环境**: 生产环境

---

*本文档会持续更新，请关注最新版本。*