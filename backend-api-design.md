# OKR绩效考核系统 - 后端开发文档

## 项目概述

本文档描述了OKR绩效考核系统后端API的设计和实现规范。

**技术栈：**
- **框架：** NestJS (Node.js)
- **语言：** TypeScript
- **数据库：** MySQL
- **ORM：** TypeORM
- **认证：** JWT + Passport
- **文档：** Swagger/OpenAPI
- **测试：** Jest
- **验证：** class-validator
- **日志：** Winston

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── config/                 # 配置文件
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── app.config.ts
├── common/                 # 公共模块
│   ├── decorators/         # 装饰器
│   ├── filters/            # 异常过滤器
│   ├── guards/             # 守卫
│   ├── interceptors/       # 拦截器
│   ├── middleware/         # 中间件
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
    └── seeds/              # 初始数据
```

## API 设计规范

### 1. 统一响应格式

```typescript
interface ApiResponse<T = any> {
  code: number;        // 状态码
  message: string;     // 响应消息
  data?: T;           // 响应数据
  timestamp: string;   // 时间戳
  path: string;       // 请求路径
}

// 成功响应
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2025-01-07T10:00:00.000Z",
  "path": "/api/v1/users"
}

// 错误响应
{
  "code": 400,
  "message": "参数验证失败",
  "errors": [ ... ],
  "timestamp": "2025-01-07T10:00:00.000Z",
  "path": "/api/v1/users"
}
```

### 2. 分页响应格式

```typescript
interface PaginatedResponse<T> {
  items: T[];          // 数据列表
  total: number;       // 总数量
  page: number;        // 当前页码
  limit: number;       // 每页数量
  totalPages: number;  // 总页数
  hasNext: boolean;    // 是否有下一页
  hasPrev: boolean;    // 是否有上一页
}
```

### 3. HTTP 状态码规范

- `200` - 请求成功
- `201` - 创建成功
- `204` - 删除成功（无内容返回）
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 无权限
- `404` - 资源不存在
- `409` - 资源冲突
- `422` - 参数验证失败
- `500` - 服务器内部错误

## 核心模块API设计

### 1. 认证授权模块 (Auth)

#### 1.1 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 7200,
    "user": {
      "id": 1,
      "username": "admin",
      "name": "系统管理员",
      "roles": ["admin"],
      "permissions": ["*"]
    }
  }
}
```

#### 1.2 刷新令牌

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.3 用户登出

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

#### 1.4 获取当前用户信息

```http
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

#### 1.5 修改密码

```http
PUT /api/v1/auth/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "123456",
  "newPassword": "newpassword"
}
```

### 2. 用户管理模块 (Users)

#### 2.1 获取用户列表

```http
GET /api/v1/users?page=1&limit=10&department_id=1&role=employee&search=张三
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "zhangsan",
        "name": "张三",
        "email": "zhangsan@example.com",
        "phone": "13800138000",
        "position": "前端工程师",
        "department": {
          "id": 1,
          "name": "技术部"
        },
        "leader": {
          "id": 3,
          "name": "李四"
        },
        "roles": ["employee"],
        "status": 1,
        "join_date": "2023-03-15",
        "created_at": "2023-03-15T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 2.2 创建用户

```http
POST /api/v1/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "123456",
  "name": "新用户",
  "email": "newuser@example.com",
  "phone": "13800138001",
  "position": "软件工程师",
  "department_id": 1,
  "leader_id": 3,
  "role_ids": [4],
  "join_date": "2025-01-07"
}
```

#### 2.3 获取用户详情

```http
GET /api/v1/users/{id}
Authorization: Bearer <access_token>
```

#### 2.4 更新用户信息

```http
PUT /api/v1/users/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "更新姓名",
  "email": "updated@example.com",
  "phone": "13800138002",
  "position": "高级工程师",
  "department_id": 1,
  "leader_id": 3
}
```

#### 2.5 删除用户

```http
DELETE /api/v1/users/{id}
Authorization: Bearer <access_token>
```

#### 2.6 重置用户密码

```http
POST /api/v1/users/{id}/reset-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "password": "newpassword"
}
```

#### 2.7 批量导入用户

```http
POST /api/v1/users/import
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: users.xlsx
```

### 3. 部门管理模块 (Departments)

#### 3.1 获取部门列表

```http
GET /api/v1/departments?include_employees=true
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "技术部",
      "description": "负责产品研发和技术支持",
      "parent_id": null,
      "sort_order": 1,
      "employee_count": 5,
      "employees": [
        {
          "id": 3,
          "name": "李四",
          "position": "技术经理"
        }
      ],
      "children": []
    }
  ]
}
```

#### 3.2 创建部门

```http
POST /api/v1/departments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "产品部",
  "description": "负责产品设计和管理",
  "parent_id": null,
  "sort_order": 3
}
```

#### 3.3 更新部门信息

```http
PUT /api/v1/departments/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "产品设计部",
  "description": "负责产品UI/UX设计"
}
```

#### 3.4 删除部门

```http
DELETE /api/v1/departments/{id}
Authorization: Bearer <access_token>
```

### 4. 考核管理模块 (Assessments)

#### 4.1 获取考核列表

```http
GET /api/v1/assessments?page=1&limit=10&status=active&period=2025-01
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "2025年1月绩效考核",
        "period": "2025-01",
        "description": "第一季度绩效考核",
        "start_date": "2025-01-01",
        "end_date": "2025-01-31",
        "deadline": "2025-02-05",
        "status": "active",
        "statistics": {
          "total_participants": 10,
          "self_completed_count": 8,
          "leader_completed_count": 3,
          "fully_completed_count": 3,
          "completion_rate": 30.0
        },
        "created_by": {
          "id": 1,
          "name": "系统管理员"
        },
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### 4.2 创建考核

```http
POST /api/v1/assessments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "2025年2月绩效考核",
  "period": "2025-02",
  "description": "2月份月度绩效考核",
  "start_date": "2025-02-01",
  "end_date": "2025-02-28",
  "deadline": "2025-03-05",
  "template_id": 1,
  "participant_ids": [3, 4, 5, 6]
}
```

#### 4.3 获取考核详情

```http
GET /api/v1/assessments/{id}
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "2025年1月绩效考核",
    "period": "2025-01",
    "description": "第一季度绩效考核",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "deadline": "2025-02-05",
    "status": "active",
    "participants": [
      {
        "id": 1,
        "user": {
          "id": 3,
          "name": "张三",
          "department": "技术部",
          "position": "前端工程师"
        },
        "self_completed": true,
        "leader_completed": false,
        "self_score": 85.5,
        "leader_score": null,
        "final_score": null,
        "self_submitted_at": "2025-01-15T10:00:00.000Z"
      }
    ],
    "statistics": {
      "total_participants": 10,
      "self_completed_count": 8,
      "leader_completed_count": 3,
      "fully_completed_count": 3,
      "average_score": 87.5,
      "highest_score": 95.0,
      "lowest_score": 78.0
    }
  }
}
```

#### 4.4 更新考核

```http
PUT /api/v1/assessments/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "2025年1月绩效考核（修订版）",
  "deadline": "2025-02-10"
}
```

#### 4.5 结束考核

```http
POST /api/v1/assessments/{id}/end
Authorization: Bearer <access_token>
```

#### 4.6 导出考核数据

```http
GET /api/v1/assessments/{id}/export?format=xlsx
Authorization: Bearer <access_token>
```

### 5. OKR管理模块 (OKRs)

#### 5.1 获取用户OKR列表

```http
GET /api/v1/okrs?user_id=3&assessment_id=1
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "objective": "提升前端开发效率",
      "description": "通过技术优化和工具改进，提升团队前端开发效率30%",
      "weight": 100.0,
      "progress": 65.0,
      "status": "active",
      "self_rating": 4,
      "leader_rating": null,
      "key_results": [
        {
          "id": 1,
          "title": "优化构建流程",
          "description": "将构建时间从5分钟减少到2分钟",
          "target_value": "2",
          "current_value": "3.2",
          "unit": "分钟",
          "progress": 60.0,
          "weight": 40.0,
          "status": "active"
        },
        {
          "id": 2,
          "title": "组件库建设",
          "description": "建设可复用组件库，包含20个常用组件",
          "target_value": "20",
          "current_value": "15",
          "unit": "个",
          "progress": 75.0,
          "weight": 60.0,
          "status": "active"
        }
      ],
      "user": {
        "id": 3,
        "name": "张三"
      },
      "assessment": {
        "id": 1,
        "title": "2025年1月绩效考核"
      }
    }
  ]
}
```

#### 5.2 创建OKR

```http
POST /api/v1/okrs
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_id": 3,
  "assessment_id": 1,
  "objective": "提升前端开发效率",
  "description": "通过技术优化和工具改进，提升团队前端开发效率30%",
  "weight": 100.0,
  "key_results": [
    {
      "title": "优化构建流程",
      "description": "将构建时间从5分钟减少到2分钟",
      "target_value": "2",
      "unit": "分钟",
      "weight": 40.0
    }
  ]
}
```

#### 5.3 更新OKR

```http
PUT /api/v1/okrs/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "objective": "大幅提升前端开发效率",
  "progress": 70.0,
  "self_rating": 4
}
```

#### 5.4 更新关键结果

```http
PUT /api/v1/okrs/{okr_id}/key-results/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_value": "2.5",
  "progress": 80.0
}
```

### 6. 评估管理模块 (Evaluations)

#### 6.1 获取评估列表

```http
GET /api/v1/evaluations?assessment_id=1&evaluatee_id=3&type=self
Authorization: Bearer <access_token>
```

#### 6.2 提交自评

```http
POST /api/v1/evaluations/self
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "assessment_id": 1,
  "score": 85.5,
  "feedback": "本月完成了所有预定目标...",
  "strengths": "技术能力强，学习能力好",
  "improvements": "需要加强团队协作"
}
```

#### 6.3 提交领导评分

```http
POST /api/v1/evaluations/leader
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "assessment_id": 1,
  "evaluatee_id": 3,
  "score": 88.0,
  "feedback": "工作表现优秀，超额完成目标",
  "strengths": "技术扎实，执行力强",
  "improvements": "可以多参与跨部门合作项目"
}
```

#### 6.4 获取评估详情

```http
GET /api/v1/evaluations/{id}
Authorization: Bearer <access_token>
```

### 7. 统计分析模块 (Statistics)

#### 7.1 获取仪表盘数据

```http
GET /api/v1/statistics/dashboard?period=2025-01
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "overview": {
      "total_users": 100,
      "active_assessments": 2,
      "completion_rate": 85.5,
      "average_score": 87.2
    },
    "department_stats": [
      {
        "department": "技术部",
        "employee_count": 15,
        "completion_rate": 90.0,
        "average_score": 88.5
      }
    ],
    "recent_assessments": [
      {
        "id": 1,
        "title": "2025年1月绩效考核",
        "status": "active",
        "completion_rate": 70.0
      }
    ],
    "score_distribution": {
      "excellent": 25,
      "good": 45,
      "average": 25,
      "poor": 5
    }
  }
}
```

#### 7.2 获取部门统计

```http
GET /api/v1/statistics/departments?period=2025-01
Authorization: Bearer <access_token>
```

#### 7.3 获取个人统计

```http
GET /api/v1/statistics/personal/{user_id}?period=2025-01
Authorization: Bearer <access_token>
```

#### 7.4 获取考核统计

```http
GET /api/v1/statistics/assessments/{assessment_id}
Authorization: Bearer <access_token>
```

### 8. 模板管理模块 (Templates)

#### 8.1 获取模板列表

```http
GET /api/v1/templates?type=assessment
Authorization: Bearer <access_token>
```

#### 8.2 创建模板

```http
POST /api/v1/templates
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "技术岗位考核模板",
  "description": "适用于技术部门的绩效考核模板",
  "type": "assessment",
  "config": {
    "sections": [
      {
        "name": "工作完成度",
        "weight": 40,
        "criteria": ["任务完成质量", "交付及时性"]
      },
      {
        "name": "技术能力",
        "weight": 30,
        "criteria": ["技术深度", "技术广度"]
      }
    ]
  }
}
```

## 权限控制

### 1. 角色权限矩阵

| 功能模块 | 管理员 | 老板 | 部门领导 | 员工 |
|---------|--------|------|----------|------|
| 用户管理 | CRUD | R | R(部门内) | R(自己) |
| 部门管理 | CRUD | R | R | R |
| 考核管理 | CRUD | R | R(参与的) | R(参与的) |
| OKR管理 | CRUD | R | CRU(下属) | CRU(自己) |
| 评估管理 | CRUD | R | CRU(下属) | CRU(自己) |
| 统计分析 | R | R | R(部门) | R(个人) |
| 模板管理 | CRUD | R | R | R |

### 2. 权限守卫实现

```typescript
// 权限装饰器
@Permissions('user:read', 'user:write')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get()
async findAll() {
  // ...
}

// 资源所有者守卫
@ResourceOwner('user')
@UseGuards(JwtAuthGuard, ResourceOwnerGuard)
@Get(':id')
async findOne(@Param('id') id: string) {
  // ...
}
```

## 数据验证

### 1. DTO类定义

```typescript
// 创建用户DTO
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsNumber()
  @IsOptional()
  department_id?: number;

  @IsNumber()
  @IsOptional()
  leader_id?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  role_ids: number[];

  @IsDateString()
  @IsOptional()
  join_date?: string;
}
```

### 2. 自定义验证器

```typescript
// 唯一性验证
@ValidatorConstraint({ async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    const [entity, field] = args.constraints;
    const repository = getRepository(entity);
    const existing = await repository.findOne({ [field]: value });
    return !existing;
  }
}

export function IsUnique(entity: any, field: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity, field],
      validator: IsUniqueConstraint,
    });
  };
}
```

## 错误处理

### 1. 全局异常过滤器

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse['message'] || message;
        errors = exceptionResponse['errors'] || null;
      } else {
        message = exceptionResponse;
      }
    }

    response.status(status).json({
      code: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 2. 业务异常定义

```typescript
export class BusinessException extends HttpException {
  constructor(message: string, code: number = HttpStatus.BAD_REQUEST) {
    super(message, code);
  }
}

export class UserNotFoundException extends BusinessException {
  constructor(id: number) {
    super(`用户 ID ${id} 不存在`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateUsernameException extends BusinessException {
  constructor(username: string) {
    super(`用户名 ${username} 已存在`, HttpStatus.CONFLICT);
  }
}
```

## 日志记录

### 1. 日志配置

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});
```

### 2. 操作日志记录

```typescript
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    
    return next.handle().pipe(
      tap(() => {
        // 记录操作日志
        this.logger.log({
          action: `${method} ${url}`,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}
```

## 数据库配置

### 1. TypeORM配置

```typescript
// config/database.config.ts
export const databaseConfig = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'okr_system',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
};
```

### 2. 实体定义示例

```typescript
// entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'date', nullable: true })
  join_date: Date;

  @Column({ length: 100, nullable: true })
  position: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User;

  @ManyToMany(() => Role)
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

## 性能优化

### 1. 查询优化

```typescript
// 使用查询构建器优化复杂查询
async findUsersWithStatistics(query: FindUsersQuery) {
  return this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.department', 'department')
    .leftJoinAndSelect('user.roles', 'roles')
    .leftJoin('assessment_participants', 'ap', 'ap.user_id = user.id')
    .addSelect('COUNT(ap.id)', 'assessment_count')
    .addSelect('AVG(ap.final_score)', 'average_score')
    .where('user.status = :status', { status: 1 })
    .groupBy('user.id')
    .orderBy('user.created_at', 'DESC')
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)
    .getRawAndEntities();
}
```

### 2. 缓存策略

```typescript
// Redis缓存配置
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cacheable('user_profile', 300) // 5分钟缓存
  async getUserProfile(userId: number) {
    return this.userRepository.findOne(userId, {
      relations: ['department', 'roles'],
    });
  }

  @CacheEvict('user_profile')
  async updateUser(id: number, updateData: UpdateUserDto) {
    return this.userRepository.update(id, updateData);
  }
}
```

## 测试

### 1. 单元测试

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      password: 'password',
      name: '测试用户',
      role_ids: [4],
    };

    jest.spyOn(repository, 'save').mockResolvedValue(mockUser);
    
    const result = await service.create(createUserDto);
    
    expect(result).toEqual(mockUser);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      username: 'testuser',
      name: '测试用户',
    }));
  });
});
```

### 2. 集成测试

```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: '123456' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.access_token).toBeDefined();
        expect(res.body.data.user.username).toBe('admin');
      });
  });
});
```

## 部署配置

### 1. Docker配置

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_DATABASE=okr_system
      - DB_USERNAME=root
      - DB_PASSWORD=password
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=okr_system
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - '3306:3306'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  mysql_data:
```

### 3. 环境变量

```bash
# .env.production
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password
DB_DATABASE=okr_system

# JWT配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7200

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 文件上传配置
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# 邮件配置
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=noreply@example.com
MAIL_PASSWORD=your-mail-password
```

## API文档

使用Swagger自动生成API文档：

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('OKR绩效考核系统 API')
  .setDescription('OKR绩效考核系统后端接口文档')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

访问地址：`http://localhost:3000/api-docs`

## 监控和日志

### 1. 健康检查

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private typeOrmHealthIndicator: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () => this.typeOrmHealthIndicator.pingCheck('database'),
    ]);
  }
}
```

### 2. 性能监控

```typescript
// 使用Prometheus监控
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class AppModule {}
```

---

**文档版本：** v1.0  
**创建日期：** 2025-07-07  
**最后更新：** 2025-07-07