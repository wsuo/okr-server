# 考核管理模块 API 测试命令

本文档包含考核管理模块的完整测试命令，可用于API功能验证和开发调试。

## 前置条件

### 1. 启动服务
```bash
npm run start:dev
```

### 2. 获取认证Token
```bash
# 使用管理员账户登录获取Token
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678"}' \
  | jq -r '.data.access_token')

echo "Token: $TOKEN"
```

## API 测试命令

### 1. 获取考核列表
```bash
echo "=== 1. 获取考核列表 ==="
curl -s http://localhost:3000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 2. 获取用户列表（用于选择参与者）
```bash
echo "=== 2. 获取用户列表 ==="
curl -s http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.items[0:3]'
```

### 3. 获取模板列表（用于选择考核模板）
```bash
echo "=== 3. 获取模板列表 ==="
curl -s http://localhost:3000/api/v1/templates \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.items[0:1]'
```

### 4. 创建考核
```bash
echo "=== 4. 创建考核 ==="
curl -s http://localhost:3000/api/v1/assessments \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2025年7月绩效考核",
    "period": "2025-07",
    "description": "第三季度员工绩效考核",
    "start_date": "2025-07-01",
    "end_date": "2025-07-31",
    "deadline": "2025-08-05",
    "template_id": 4,
    "participant_ids": [1, 7, 8]
  }' | jq .
```

**请求参数说明**:
- `title`: 考核标题
- `period`: 考核周期（YYYY-MM格式）
- `description`: 考核说明（可选）
- `start_date`: 开始日期
- `end_date`: 结束日期  
- `deadline`: 提交截止日期
- `template_id`: 模板ID（可选）
- `participant_ids`: 参与者用户ID数组

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "2025年7月绩效考核",
    "status": "draft",
    "participants": [...],
    "statistics": {
      "total_participants": 3,
      "self_completed_count": 0,
      "leader_completed_count": 0,
      "fully_completed_count": 0
    }
  }
}
```

### 5. 获取考核详情
```bash
echo "=== 5. 获取考核详情 ==="
curl -s http://localhost:3000/api/v1/assessments/1 \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | {id, title, period, status, statistics}'
```

### 6. 更新考核状态为进行中
```bash
echo "=== 6. 更新考核状态为进行中 ==="
curl -s http://localhost:3000/api/v1/assessments/1 \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}' \
  | jq '.data | {id, title, status}'
```

**状态转换规则**:
- `draft` → `active` ✅
- `active` → `completed` ✅  
- `active` → `ended` ✅
- `completed` → `ended` ✅

### 7. 结束考核并计算最终得分
```bash
echo "=== 7. 结束考核 ==="
curl -s http://localhost:3000/api/v1/assessments/1/end \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | {id, title, status}'
```

**业务逻辑**:
- 只能结束状态为 `active` 的考核
- 自动计算参与者最终得分：`final_score = self_score * 0.3 + leader_score * 0.7`
- 状态变更为 `completed`

### 8. 删除考核（软删除）
```bash
echo "=== 8. 删除考核 ==="
curl -s http://localhost:3000/api/v1/assessments/1 \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**删除规则**:
- 不能删除状态为 `active` 的考核
- 使用软删除机制（设置 `deleted_at` 字段）

### 9. 验证考核列表查询
```bash
echo "=== 9. 再次获取考核列表 ==="
curl -s http://localhost:3000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | {items: .items | map({id, title, period, status}), total}'
```

## 完整测试脚本

```bash
#!/bin/bash

# 设置变量
BASE_URL="http://localhost:3000/api/v1"

# 获取Token
echo "=== 获取认证Token ==="
TOKEN=$(curl -s ${BASE_URL}/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678"}' \
  | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，请检查用户名和密码"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:20}..."

# 测试所有接口
echo -e "\n=== 1. 获取考核列表 ==="
curl -s ${BASE_URL}/assessments -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n=== 2. 创建考核 ==="
ASSESSMENT_ID=$(curl -s ${BASE_URL}/assessments \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API测试考核",
    "period": "2025-07",
    "description": "自动化测试创建的考核",
    "start_date": "2025-07-01",
    "end_date": "2025-07-31", 
    "deadline": "2025-08-05",
    "participant_ids": [1]
  }' | jq -r '.data.id')

echo "✅ 创建的考核ID: $ASSESSMENT_ID"

echo -e "\n=== 3. 获取考核详情 ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID} -H "Authorization: Bearer $TOKEN" | jq '.data | {id, title, status}'

echo -e "\n=== 4. 更新考核状态 ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID} \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}' | jq '.data | {id, title, status}'

echo -e "\n=== 5. 结束考核 ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/end \
  -X POST \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {id, title, status}'

echo -e "\n✅ 考核管理模块测试完成"
```

## 常见错误处理

### 1. 认证错误
```json
{
  "code": 401,
  "message": "Unauthorized"
}
```
**解决方案**: 检查Token是否正确，重新登录获取新Token

### 2. 权限错误
```json
{
  "code": 403,
  "message": "Forbidden"
}
```
**解决方案**: 确保使用具有相应权限的用户账户

### 3. 参数验证错误
```json
{
  "code": 400,
  "message": "参数错误"
}
```
**解决方案**: 检查请求参数格式和必填字段

### 4. 业务逻辑错误
```json
{
  "code": 400,
  "message": "无法从状态 \"completed\" 转换到 \"active\""
}
```
**解决方案**: 检查业务规则和状态转换逻辑

## 注意事项

1. **考核周期唯一性**: 同一周期只能创建一个考核
2. **状态转换**: 遵循严格的状态机规则
3. **软删除**: 删除的记录不会真正删除，只是标记为已删除
4. **权限控制**: 不同角色有不同的操作权限
5. **数据完整性**: 创建考核时会自动创建参与者记录