# OKR绩效考核系统 - 后端服务

OKR绩效考核系统是一个企业级目标与关键结果管理平台，支持多角色管理，包括系统管理员、公司老板、部门领导和员工。

## 技术栈

- **框架**: NestJS (Node.js)
- **语言**: TypeScript
- **数据库**: MySQL
- **ORM**: TypeORM
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI
- **测试**: Jest
- **验证**: class-validator
- **日志**: Winston

## 功能特性

- 🔐 JWT认证授权系统
- 👥 多角色用户管理
- 🏢 部门组织架构管理
- 📊 OKR目标与关键结果管理
- ⭐ 绩效考核评估系统
- 📈 统计分析报表
- 📝 评估模板管理
- 🔒 基于角色的权限控制

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量配置文件：

```bash
cp .env.example .env
```

修改 `.env` 文件中的数据库配置和其他环境变量。

### 3. 数据库初始化

创建数据库：

```sql
CREATE DATABASE okr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

运行数据库初始化脚本：

```bash
# 按顺序执行以下SQL文件
mysql -u root -p okr_system < database/sql/01_init_database.sql
mysql -u root -p okr_system < database/sql/02_add_foreign_keys.sql
mysql -u root -p okr_system < database/sql/03_add_indexes.sql
mysql -u root -p okr_system < database/sql/04_init_data.sql
```

### 4. 启动应用

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

应用将在 http://localhost:3000 启动

API文档地址：http://localhost:3000/api-docs

## 默认账户

系统初始化后提供以下默认账户（密码均为 `123456`）：

- **系统管理员**: `admin`
- **公司老板**: `boss`  
- **技术经理**: `lisi`
- **市场经理**: `zhaoliu`
- **前端工程师**: `zhangsan`
- **后端工程师**: `wangwu`

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── config/                 # 配置文件
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── cache.config.ts
│   └── logger.config.ts
├── common/                 # 公共模块
│   ├── decorators/         # 装饰器
│   ├── filters/            # 异常过滤器
│   ├── guards/             # 守卫
│   ├── interceptors/       # 拦截器
│   ├── pipes/              # 管道
│   └── utils/              # 工具函数
├── entities/               # 数据库实体
├── modules/                # 业务模块
│   ├── auth/               # 认证授权
│   ├── users/              # 用户管理
│   ├── departments/        # 部门管理
│   ├── roles/              # 角色管理
│   ├── assessments/        # 考核管理
│   ├── okrs/               # OKR管理
│   ├── evaluations/        # 评估管理
│   ├── templates/          # 模板管理
│   └── statistics/         # 统计分析
└── database/               # 数据库相关
    ├── migrations/         # 数据库迁移
    └── sql/                # SQL脚本
```

## API文档

启动应用后访问 [http://localhost:3000/api-docs](http://localhost:3000/api-docs) 查看完整的API文档。

## 开发命令

```bash
# 启动开发服务器
npm run start:dev

# 构建项目
npm run build

# 运行测试
npm run test

# 运行E2E测试
npm run test:e2e

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 许可证

[MIT License](LICENSE)