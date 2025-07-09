# OKR绩效考核系统 - 数据库初始化指南

## 目录结构

```
database/
├── sql/                    # SQL脚本文件
│   ├── 01_init_database.sql    # 数据库表结构初始化
│   ├── 02_add_foreign_keys.sql # 外键约束
│   ├── 03_add_indexes.sql      # 索引优化
│   ├── 04_init_data.sql        # 初始数据
│   └── 05_schema_updates.sql   # 数据库结构更新
└── README.md               # 本文件
```

## 新数据库初始化步骤

### 1. 创建数据库
```sql
CREATE DATABASE okr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 按顺序执行SQL脚本
```bash
# 进入项目目录
cd okr-server

# 执行数据库初始化脚本
mysql -h your_host -u your_user -p okr_system < database/sql/01_init_database.sql
mysql -h your_host -u your_user -p okr_system < database/sql/02_add_foreign_keys.sql
mysql -h your_host -u your_user -p okr_system < database/sql/03_add_indexes.sql
mysql -h your_host -u your_user -p okr_system < database/sql/04_init_data.sql
```

### 3. 初始化系统模板数据
```bash
npm run seed:template
```

## 现有数据库更新步骤

如果你已经有一个运行中的数据库，需要应用最新的结构更新：

### 1. 执行结构更新脚本
```bash
mysql -h your_host -u your_user -p okr_system < database/sql/05_schema_updates.sql
```

### 2. 运行未执行的迁移
```bash
npm run migration:run
```

## 重要更新说明

### 软删除支持
- **assessments表**: 唯一约束从 `uk_period` 更改为 `uk_period_not_deleted(period, deleted_at)`
- **assessment_participants表**: 添加了 `deleted_at` 字段支持软删除
- **templates表**: 添加了 `deleted_at` 字段支持软删除

### 约束变更
- 修复了考核周期重复创建的问题
- 支持软删除的考核可以重新创建相同周期的考核

## 数据库配置

确保你的 `.env` 文件包含正确的数据库连接信息：

```env
DB_HOST=your_database_host
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=okr_system
```

## 故障排除

### 1. 唯一约束错误
如果遇到 `Duplicate entry 'YYYY-MM' for key 'assessments.uk_period'` 错误：
- 执行 `05_schema_updates.sql` 脚本
- 这会修复约束以支持软删除

### 2. 迁移失败
如果迁移执行失败：
- 检查数据库连接配置
- 确保 `.env` 文件存在且配置正确
- 手动执行相应的SQL语句

### 3. 字段不存在错误
如果遇到 `deleted_at` 字段不存在的错误：
- 执行 `05_schema_updates.sql` 脚本
- 或手动添加对应的字段

## 验证安装

执行以下SQL验证数据库结构是否正确：

```sql
-- 检查assessments表的约束
SHOW INDEX FROM assessments WHERE Key_name LIKE '%period%';

-- 检查assessment_participants表是否有deleted_at字段
DESCRIBE assessment_participants;

-- 检查templates表是否有deleted_at字段
DESCRIBE templates;
```

## 开发环境设置

1. 确保MySQL服务正在运行
2. 创建数据库和用户
3. 配置环境变量
4. 运行初始化脚本
5. 启动应用服务

```bash
# 启动开发服务器
npm run serve:dev
```