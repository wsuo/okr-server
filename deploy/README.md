# OKR 系统部署指南

本目录包含 OKR 系统的自动化部署脚本和相关工具。

## 前置条件

1. **SSH 免密登录已配置** ✅
   - 服务器地址: 47.239.124.157
   - 用户: root
   - 测试连接: `ssh root@47.239.124.157`

2. **服务器环境**
   - 已安装 Node.js、npm、PM2
   - 已配置 MySQL 数据库（端口 13306）
   - 部署目录: `/www/wwwroot/okr-server`

3. **本地环境**
   - Node.js >= 14.x
   - npm >= 6.x
   - MySQL 客户端（用于数据库同步）

## 脚本说明

### 1. deploy.sh - 完整部署脚本

**功能**：执行完整的部署流程，包括构建、备份、上传、依赖安装和重启。

**使用场景**：
- 首次部署
- 更新了 package.json 依赖
- 需要完整更新（包括源码）

**执行方式**：
```bash
cd deploy
./deploy.sh
```

**执行步骤**：
1. 构建本地项目（npm run build）
2. 备份线上代码到 tar.gz 文件
3. 上传新代码到服务器（dist、src、配置文件）
4. 替换线上代码
5. 安装/更新依赖（npm install --production）
6. 重启 PM2 应用
7. 执行健康检查

### 2. deploy-quick.sh - 快速部署脚本

**功能**：仅更新构建后的代码（dist 目录）并重启应用。

**使用场景**：
- 日常代码更新
- 仅修改了业务逻辑，未改变依赖
- 需要快速部署

**执行方式**：
```bash
cd deploy
./deploy-quick.sh
```

**执行步骤**：
1. 构建本地项目
2. 同步 dist 目录到服务器
3. 重启 PM2 应用

### 3. sync-database.sh - 数据库同步脚本

**功能**：在本地和线上数据库之间进行数据同步。

**使用场景**：
- 初始化线上数据库
- 同步开发数据到测试环境
- 备份线上数据到本地

**执行方式**：
```bash
cd deploy

# 本地同步到线上（默认）
./sync-database.sh
# 或
./sync-database.sh local-to-remote

# 线上同步到本地
./sync-database.sh remote-to-local
```

**注意事项**：
- 执行前会要求确认，因为会覆盖目标数据库
- 自动创建备份文件
- 使用 UTF8MB4 字符集

## 数据库配置

### 本地数据库
- 主机: 100.72.60.117
- 端口: 3306
- 用户: root
- 密码: root
- 数据库: okr_system

### 线上数据库
- 主机: 127.0.0.1（服务器本地）
- 端口: 13306
- 用户: root
- 密码: N8653jnRwnEpk5Hd
- 数据库: okr_system

## 常用操作

### 查看应用状态
```bash
ssh root@47.239.124.157 'pm2 status okr-server'
```

### 查看应用日志
```bash
ssh root@47.239.124.157 'pm2 logs okr-server --lines 100'
```

### 重启应用
```bash
ssh root@47.239.124.157 'pm2 restart okr-server'
```

### 停止应用
```bash
ssh root@47.239.124.157 'pm2 stop okr-server'
```

### 启动应用
```bash
ssh root@47.239.124.157 'pm2 start okr-server'
```

### 查看实时日志
```bash
ssh root@47.239.124.157 'pm2 logs okr-server'
```

## 回滚操作

如果部署后出现问题，可以回滚到之前的版本：

1. 查看备份文件：
```bash
ssh root@47.239.124.157 'ls -lh /www/wwwroot/okr-server/backup_*.tar.gz'
```

2. 选择要回滚的版本并恢复：
```bash
ssh root@47.239.124.157 'cd /www/wwwroot/okr-server && tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz && pm2 restart okr-server'
```

## 故障排查

### 1. 健康检查失败
- 检查应用是否正常启动：`pm2 status okr-server`
- 查看错误日志：`pm2 logs okr-server --err`
- 确认端口 3010 是否被占用

### 2. 数据库连接失败
- 确认数据库服务正常运行
- 检查 .env 文件中的数据库配置
- 测试数据库连接：
  ```bash
  ssh root@47.239.124.157 'mysql -h127.0.0.1 -P13306 -uroot -pN8653jnRwnEpk5Hd -e "show databases;"'
  ```

### 3. 依赖安装失败
- 清理 node_modules 并重新安装：
  ```bash
  ssh root@47.239.124.157 'cd /www/wwwroot/okr-server && rm -rf node_modules package-lock.json && npm install'
  ```

## 安全提醒

1. **定期备份**：部署脚本会自动备份，但建议定期手动备份重要数据
2. **密码管理**：生产环境的数据库密码应妥善保管
3. **权限控制**：确保部署脚本仅授权人员可访问
4. **监控告警**：建议配置 PM2 监控和告警

## 访问地址

- **API 服务**: http://47.239.124.157:3010
- **API 文档**: http://47.239.124.157:3010/api-docs
- **健康检查**: http://47.239.124.157:3010/api/health

## 联系方式

如遇到问题，请联系系统管理员。