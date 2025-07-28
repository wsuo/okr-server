# 时区配置说明

本系统已配置为中国东八区（Asia/Shanghai），以下是相关配置说明：

## 已实施的时区解决方案

### 1. 数据库连接时区配置
- **文件**: `src/config/database.config.ts`
- **配置**: `timezone: "+08:00"`
- **作用**: 告诉MySQL连接使用东八区

### 2. Node.js应用时区配置  
- **文件**: `src/main.ts`
- **配置**: `process.env.TZ = "Asia/Shanghai"`
- **作用**: 设置Node.js进程的默认时区

### 3. 数据库转换器（推荐方案）
- **文件**: `src/common/transformers/timezone.transformer.ts`
- **作用**: 自动处理数据库与应用之间的时区转换
- **已应用实体**: 
  - Evaluation（评估）
  - Assessment（考核）  
  - AssessmentParticipant（考核参与者）
  - User（用户）

### 4. 时区工具类
- **文件**: `src/common/utils/timezone.util.ts`
- **功能**: 
  - UTC时间与东八区时间互转
  - 格式化时间显示
  - 创建数据库时间戳

## 工作原理

### 数据存储流程
1. 应用接收东八区时间
2. 转换器透传时间（无需转换）
3. 数据库连接自动处理时区，存储正确的东八区时间

### 数据读取流程  
1. 数据库返回东八区时间
2. 转换器透传时间（无需转换）
3. 应用直接使用正确的东八区时间

## 使用方法

### 自动转换（推荐）
已配置转换器的实体字段会自动处理时区转换，无需额外代码。

### 手动转换（特殊情况）
```typescript
import { TimezoneUtil } from './common/utils/timezone.util';

// 获取当前东八区时间
const now = TimezoneUtil.now();

// UTC转东八区
const localTime = TimezoneUtil.utcToLocal(utcDate);

// 东八区转UTC（用于数据库存储）
const utcTime = TimezoneUtil.localToUtc(localDate);

// 创建数据库时间戳
const dbTimestamp = TimezoneUtil.createDbTimestamp();

// 格式化显示
const formatted = TimezoneUtil.format(date, 'YYYY-MM-DD HH:mm:ss');
```

## 注意事项

1. **新增实体**: 新增包含时间字段的实体时，记得添加时区转换器
2. **API响应**: 所有API返回的时间都是东八区时间
3. **前端处理**: 前端收到的时间已经是本地时区，直接使用即可
4. **数据库查询**: 直接使用Date对象进行查询，转换器会自动处理

## 验证时区配置

可以通过以下方式验证时区配置是否正确：

1. **创建测试记录**，查看数据库中的时间戳
2. **查看API响应**，确认返回的时间是否为东八区时间
3. **检查日志时间**，确认应用日志时间正确

## 故障排除

如果发现时间不对：

1. **检查服务器时区**: `date` 命令查看系统时间
2. **检查数据库时区**: `SELECT NOW()` 查看数据库时间
3. **检查应用时区**: 在代码中打印 `new Date()` 查看Node.js时间
4. **重启应用**: 时区配置修改后需要重启应用

## 实体转换器配置示例

```typescript
import { timezoneTransformer } from "../common/transformers/timezone.transformer";

@CreateDateColumn({
  transformer: timezoneTransformer
})
created_at: Date;

@UpdateDateColumn({
  transformer: timezoneTransformer  
})
updated_at: Date;

@Column({ 
  type: "timestamp", 
  nullable: true,
  transformer: timezoneTransformer
})
submitted_at: Date;
```

通过以上配置，系统会自动处理所有时区转换，确保时间数据的正确性。