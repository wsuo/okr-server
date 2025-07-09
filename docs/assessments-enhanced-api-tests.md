# 考核管理模块完整功能 API 测试文档

本文档包含考核管理模块的完整测试命令，包括考核生命周期管理（创建、编辑、发布、结束）、预检查接口、模板驱动的得分计算等功能。

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

## 考核生命周期管理测试

### 1. 创建考核（草稿状态）

```bash
echo "=== 1. 创建考核 ==="
ASSESSMENT_ID=$(curl -s http://localhost:3000/api/v1/assessments \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2025年第三季度绩效考核",
    "period": "2025-09",
    "description": "测试完整生命周期管理功能",
    "start_date": "2025-09-01",
    "end_date": "2025-09-30",
    "deadline": "2025-10-05",
    "template_id": 4,
    "participant_ids": [1, 2]
  }' | jq -r '.data.id')

echo "✅ 创建的考核ID: $ASSESSMENT_ID"
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 10,
    "title": "2025年第三季度绩效考核",
    "period": "2025-09",
    "status": "draft",
    "participants": [...],
    "creator": {...}
  }
}
```

### 2. 获取考核详情（增强版，包含编辑表单所需数据）

```bash
echo "=== 2. 获取考核详情 ===" 
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID} \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 10,
    "title": "2025年第三季度绩效考核",
    "period": "2025-09",
    "description": "测试完整生命周期管理功能",
    "status": "draft",
    "created_at": "2025-07-09T05:30:00.000Z",
    "updated_at": "2025-07-09T05:30:00.000Z",
    
    // 格式化的日期字段（用于表单）
    "start_date": "2025-09-01",
    "end_date": "2025-09-30",
    "deadline": "2025-10-05",
    
    // 原始日期字段（用于显示和比较）
    "start_date_raw": "2025-09-01T00:00:00.000Z",
    "end_date_raw": "2025-09-30T00:00:00.000Z",
    "deadline_raw": "2025-10-05T00:00:00.000Z",
    
    // 模板信息
    "template_id": 4,
    "template": {
      "id": 4,
      "name": "默认绩效考核模板",
      "description": "系统默认的绩效考核模板"
    },
    
    // 创建者信息
    "creator": {
      "id": 1,
      "name": "管理员",
      "username": "admin",
      "email": "admin@example.com"
    },
    
    // 参与者ID列表（用于表单）
    "participant_ids": [1, 2],
    
    // 详细的参与者信息
    "participants": [
      {
        "id": 15,
        "self_completed": 0,
        "leader_completed": 0,
        "self_score": null,
        "leader_score": null,
        "final_score": null,
        "user": {
          "id": 1,
          "name": "张三",
          "username": "zhangsan",
          "email": "zhangsan@example.com",
          "department": {
            "id": 1,
            "name": "技术部"
          }
        }
      },
      {
        "id": 16,
        "self_completed": 0,
        "leader_completed": 0,
        "self_score": null,
        "leader_score": null,
        "final_score": null,
        "user": {
          "id": 2,
          "name": "李四",
          "username": "lisi",
          "email": "lisi@example.com",
          "department": {
            "id": 2,
            "name": "产品部"
          }
        }
      }
    ],
    
    // 统计信息
    "statistics": {
      "total_participants": 2,
      "self_completed_count": 0,
      "leader_completed_count": 0,
      "fully_completed_count": 0,
      "average_score": 0,
      "highest_score": 0,
      "lowest_score": 0
    },
    
    // 权限信息
    "canEdit": true,
    "canDelete": true,
    "canPublish": true,
    "canEnd": false
  }
}
```

### 3. 编辑考核（仅草稿状态）

```bash
echo "=== 3. 编辑考核 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2025年第三季度绩效考核（已修订）",
    "description": "增加新的参与者和更新截止时间",
    "deadline": "2025-10-10",
    "participant_ids": [1, 2, 3]
  }' | jq .
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 10,
    "title": "2025年第三季度绩效考核（已修订）",
    "status": "draft",
    "deadline": "2025-10-10T00:00:00.000Z",
    "participants": [
      {"user": {"id": 1, "name": "张三"}},
      {"user": {"id": 2, "name": "李四"}},
      {"user": {"id": 3, "name": "王五"}}
    ]
  }
}
```

### 4. 发布前校验

```bash
echo "=== 4. 发布前校验 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/publish-validation \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "canPublish": true,
    "errors": [],
    "warnings": ["考核开始时间已过或即将开始"]
  }
}
```

### 5. 发布考核（草稿→进行中）

```bash
echo "=== 5. 发布考核 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/publish \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 10,
    "title": "2025年第三季度绩效考核（已修订）",
    "status": "active",
    "participants": [...]
  }
}
```

## 预检查接口测试

### 6. 考核结束前的预检查

```bash
echo "=== 6. 考核结束预检查 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/end-validation \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "canEnd": false,
  "errors": ["以下参与者尚未完成评估：张三(自评、领导评分)"],
  "warnings": ["考核已超过截止时间"],
  "participantStatus": [
    {
      "userId": 1,
      "userName": "张三",
      "selfCompleted": false,
      "leaderCompleted": false,
      "missingEvaluations": ["自评", "领导评分"]
    }
  ],
  "templateConfig": {
    "weightConfig": {
      "scoring_rules": {
        "self_evaluation": {"weight_in_final": 0.3},
        "leader_evaluation": {"weight_in_final": 0.7}
      }
    },
    "requiredEvaluations": ["self", "leader"]
  }
}
```

### 7. 考核删除前的预检查

```bash
echo "=== 7. 考核删除预检查 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/delete-validation \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "canDelete": false,
  "errors": ["无法删除进行中的考核"],
  "warnings": ["该考核有 3 条评估记录", "该考核包含已完成的评估，删除将影响历史记录"],
  "relatedData": {
    "evaluationsCount": 3,
    "okrsCount": 2,
    "hasCompletedEvaluations": true
  },
  "permissions": {
    "canDelete": true
  }
}
```

### 8. 得分计算预览

```bash
echo "=== 8. 得分计算预览 ==="
curl -s http://localhost:3000/api/v1/assessments/${ASSESSMENT_ID}/score-preview \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**预期响应**:
```json
{
  "participants": [
    {
      "userId": 1,
      "userName": "张三",
      "selfScore": 85.5,
      "leaderScore": 78.2,
      "calculatedFinalScore": 80.65,
      "scoreBreakdown": [
        {
          "category": "work_performance",
          "categoryName": "工作绩效",
          "categoryWeight": 60,
          "selfWeight": 0.3,
          "leaderWeight": 0.7,
          "selfScore": 88.0,
          "leaderScore": 82.0,
          "categoryScore": 84.2
        }
      ]
    }
  ],
  "templateConfig": {
    "evaluatorWeights": {
      "self": 0.3,
      "leader": 0.7
    },
    "categoryWeights": [
      {"id": "work_performance", "weight": 60},
      {"id": "daily_management", "weight": 30},
      {"id": "leader_evaluation", "weight": 10}
    ]
  }
}
```

## 完整业务流程测试

### 完整测试脚本

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

# 1. 创建新考核（草稿状态）
echo -e "\n=== 1. 创建新考核（草稿状态） ==="
ASSESSMENT_ID=$(curl -s ${BASE_URL}/assessments \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完整生命周期测试考核",
    "period": "2025-11",
    "description": "测试考核的完整生命周期管理功能",
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "deadline": "2025-12-05",
    "template_id": 4,
    "participant_ids": [1]
  }' | jq -r '.data.id')

echo "✅ 创建的考核ID: $ASSESSMENT_ID，状态: draft"

# 2. 编辑考核基本信息
echo -e "\n=== 2. 编辑考核基本信息 ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完整生命周期测试考核（已修订）",
    "description": "添加更多参与者，测试编辑功能",
    "participant_ids": [1, 2, 3]
  }' | jq '.data | {id, title, status, participants: [.participants[].user.name]}'

# 3. 发布前校验
echo -e "\n=== 3. 发布前校验 ==="
VALIDATION_RESULT=$(curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/publish-validation \
  -H "Authorization: Bearer $TOKEN")
echo $VALIDATION_RESULT | jq .

CAN_PUBLISH=$(echo $VALIDATION_RESULT | jq -r '.data.canPublish')
if [ "$CAN_PUBLISH" == "true" ]; then
  echo "✅ 校验通过，可以发布"
else
  echo "❌ 校验失败，无法发布"
  echo $VALIDATION_RESULT | jq -r '.data.errors[]'
fi

# 4. 发布考核（草稿→进行中）
echo -e "\n=== 4. 发布考核 ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/publish \
  -X POST \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {id, title, status}'

# 5. 尝试编辑已发布的考核（应该失败）
echo -e "\n=== 5. 尝试编辑已发布的考核（应该失败） ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "尝试修改已发布的考核"}' | jq .

# 6. 测试考核结束预检查（应该失败，因为没有评估数据）
echo -e "\n=== 6. 考核结束预检查（无评估数据） ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/end-validation \
  -H "Authorization: Bearer $TOKEN" | jq .

# 7. 测试删除预检查（应该失败，因为考核进行中）
echo -e "\n=== 7. 删除预检查（考核进行中） ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/delete-validation \
  -H "Authorization: Bearer $TOKEN" | jq .

# 8. 测试得分计算预览（无评估数据）
echo -e "\n=== 8. 得分计算预览（无评估数据） ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/score-preview \
  -H "Authorization: Bearer $TOKEN" | jq .

# 9. 尝试结束考核（应该失败，因为没有评估数据）
echo -e "\n=== 9. 尝试结束考核（无评估数据） ==="
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID}/end \
  -X POST \
  -H "Authorization: Bearer $TOKEN" | jq .

# 10. 清理：删除测试考核（需要先改为非active状态）
echo -e "\n=== 10. 清理测试数据 ==="
# 注意：这里用通用的PUT接口强制改状态，仅用于测试清理
curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID} \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "draft"}' | jq '.data | {id, title, status}'

curl -s ${BASE_URL}/assessments/${ASSESSMENT_ID} \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ 完整生命周期测试完成"
```

## 业务规则验证

### 1. 考核编辑业务规则

**必须满足的条件**:
- 考核状态必须为 `draft`（草稿）
- 用户必须为考核创建者
- 不允许直接修改状态字段

**编辑功能特性**:
- 支持修改基本信息（标题、描述、时间等）
- 支持重新配置参与者（自动处理关联关系）
- 支持修改评估模板
- 使用事务确保数据一致性

### 2. 考核发布业务规则

**发布前校验条件**:
- 考核状态必须为 `draft`
- 考核标题不能为空
- 时间配置完整（开始时间 < 结束时间 ≤ 截止时间）
- 必须选择评估模板
- 至少需要一个有效参与者

**发布流程**:
- 自动校验配置完整性
- 状态从 `draft` 变更为 `active`
- 发布后不可再编辑

### 3. 考核结束业务规则

**必须满足的条件**:
- 考核状态必须为 `active`
- 所有参与者必须完成自评和领导评分
- 用户必须有结束考核的权限

**增强的检查**:
- 评估完成度验证
- 模板配置驱动的得分计算
- OKR状态自动同步

### 4. 考核删除业务规则

**必须满足的条件**:
- 考核状态不能为 `active`
- 用户必须为考核创建者
- 不能删除包含已完成评估的考核

**增强的处理**:
- 关联数据的级联处理
- 权限精确控制
- 数据完整性保护

### 5. 得分计算规则

**模板驱动计算**:
- 从模板配置中获取评估者权重
- 支持多级权重计算（类别→项目→评估者）
- 动态配置而非硬编码

**计算公式**:
```
最终得分 = Σ(类别得分 × 类别权重)
类别得分 = Σ(项目得分 × 项目权重)
项目得分 = 自评得分 × 自评权重 + 领导得分 × 领导权重
```

## 错误处理测试

### 1. 编辑权限错误
```bash
# 使用普通用户尝试编辑其他人创建的考核
curl -s ${BASE_URL}/assessments/1/edit \
  -X PUT \
  -H "Authorization: Bearer $OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "尝试修改"}' 
# 预期: 400 Bad Request - "只有考核创建者可以编辑考核"
```

### 2. 编辑状态错误
```bash
# 尝试编辑已发布的考核
curl -s ${BASE_URL}/assessments/1/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "尝试修改已发布的考核"}'
# 预期: 400 Bad Request - "只能编辑草稿状态的考核"
```

### 3. 发布权限错误
```bash
# 使用普通用户尝试发布其他人创建的考核
curl -s ${BASE_URL}/assessments/1/publish \
  -X POST \
  -H "Authorization: Bearer $OTHER_USER_TOKEN"
# 预期: 400 Bad Request - "只有考核创建者可以发布考核"
```

### 4. 发布状态错误
```bash
# 尝试发布已发布的考核
curl -s ${BASE_URL}/assessments/1/publish \
  -X POST \
  -H "Authorization: Bearer $TOKEN"
# 预期: 400 Bad Request - "只能发布草稿状态的考核"
```

### 5. 发布配置不完整错误
```bash
# 创建一个配置不完整的考核并尝试发布
INCOMPLETE_ASSESSMENT_ID=$(curl -s ${BASE_URL}/assessments \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "",
    "period": "2025-12",
    "start_date": "2025-12-31",
    "end_date": "2025-12-01",
    "deadline": "2025-11-30",
    "participant_ids": []
  }' | jq -r '.data.id')

curl -s ${BASE_URL}/assessments/${INCOMPLETE_ASSESSMENT_ID}/publish \
  -X POST \
  -H "Authorization: Bearer $TOKEN"
# 预期: 400 Bad Request - 详细的配置错误信息
```

### 6. 删除权限错误
```bash
# 使用普通用户尝试删除其他人创建的考核
curl -s ${BASE_URL}/assessments/1 \
  -X DELETE \
  -H "Authorization: Bearer $OTHER_USER_TOKEN"
# 预期: 400 Bad Request - "只有考核创建者可以删除考核"
```

### 7. 删除状态错误
```bash
# 尝试删除进行中的考核
curl -s ${BASE_URL}/assessments/1 \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN"
# 预期: 400 Bad Request - "无法删除进行中的考核"
```

### 8. 结束考核状态错误
```bash
# 尝试结束已完成的考核
curl -s ${BASE_URL}/assessments/1/end \
  -X POST \
  -H "Authorization: Bearer $TOKEN"
# 预期: 400 Bad Request - "只能结束进行中的考核"
```

### 9. 结束考核数据不完整错误
```bash
# 尝试结束未完成评估的考核
curl -s ${BASE_URL}/assessments/1/end \
  -X POST \
  -H "Authorization: Bearer $TOKEN"
# 预期: 400 Bad Request - "以下参与者尚未完成评估：..."
```

### 10. 获取考核详情权限测试
```bash
# 使用普通用户获取其他人创建的考核详情
curl -s ${BASE_URL}/assessments/1 \
  -H "Authorization: Bearer $OTHER_USER_TOKEN"
# 预期: 200 OK - 但 canEdit、canDelete、canPublish 为 false

# 获取不存在的考核详情
curl -s ${BASE_URL}/assessments/999999 \
  -H "Authorization: Bearer $TOKEN"
# 预期: 404 Not Found - "考核 ID 999999 不存在"
```

### 11. 参数验证错误
```bash
# 测试无效的参与者ID
curl -s ${BASE_URL}/assessments/1/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"participant_ids": [999999]}'
# 预期: 400 Bad Request - "部分参与者用户不存在"

# 测试无效的日期格式
curl -s ${BASE_URL}/assessments/1/edit \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "invalid-date"}'
# 预期: 400 Bad Request - 日期格式错误
```

## 性能和安全注意事项

### 1. 数据库事务
- 考核结束和删除操作使用数据库事务确保数据一致性
- 操作失败时自动回滚所有更改

### 2. 权限控制
- 所有操作都需要JWT认证
- 精细化的权限控制基于用户角色和资源所有权

### 3. 数据验证
- 前端预检查和后端实际操作使用相同的验证逻辑
- 避免前后端不一致导致的用户体验问题

### 4. 错误处理
- 详细的错误信息帮助前端进行适当的用户提示
- 结构化的响应格式便于前端处理

## API接口总览

### 核心CRUD接口
- `GET /assessments` - 获取考核列表
- `GET /assessments/:id` - 获取考核详情（增强版，包含编辑表单所需数据）
- `POST /assessments` - 创建考核（草稿状态）
- `PUT /assessments/:id` - 通用更新接口
- `DELETE /assessments/:id` - 删除考核

### 生命周期管理接口
- `PUT /assessments/:id/edit` - 编辑考核（仅草稿状态）
- `GET /assessments/:id/publish-validation` - 发布前校验
- `POST /assessments/:id/publish` - 发布考核（草稿→进行中）
- `POST /assessments/:id/end` - 结束考核（进行中→已完成）

### 预检查接口
- `GET /assessments/:id/end-validation` - 考核结束前校验
- `GET /assessments/:id/delete-validation` - 考核删除前校验
- `GET /assessments/:id/score-preview` - 得分计算预览

## 考核状态流转图

```
draft (草稿) → active (进行中) → completed (已完成) → ended (已结束)
    ↓              ↓                   ↓
  可编辑          可结束              可归档
  可发布          不可编辑            
  可删除          不可删除
```

## 总结

这次完整的考核管理系统包含了：

1. **完整的生命周期管理**：草稿→编辑→发布→结束的完整流程
2. **模板驱动的得分计算系统**：完全重构了得分计算逻辑，从模板配置中获取权重而非硬编码
3. **全面的预检查接口**：提供四个预检查接口，帮助前端进行用户友好的验证
4. **严格的权限控制**：基于用户角色和资源所有权的精细化权限管理
5. **增强的业务逻辑**：添加了评估完成度检查、OKR状态同步、配置完整性验证等
6. **事务处理**：使用数据库事务确保操作的原子性和数据一致性
7. **前后端一致性**：共享的验证逻辑确保前后端检查结果一致
8. **完善的错误处理**：详细的错误信息和结构化的响应格式

### 核心特性

- **草稿机制**：支持考核创建后的反复编辑和完善
- **发布校验**：确保考核配置完整后才能发布
- **状态控制**：严格的状态转换规则，防止非法操作
- **权限保护**：只有创建者可以编辑、发布、删除考核
- **数据完整性**：参与者关系的自动维护和一致性保证

所有功能都经过了严格的类型检查和编译验证，符合企业级应用的标准。系统现在支持完整的考核管理工作流，从创建草稿到最终归档的全过程管理。