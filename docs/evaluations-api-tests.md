# 评估模块 API 接口测试文档

## 概述

本文档包含评估模块的所有API接口测试用例，包括基础CRUD操作、详细评分功能、任务管理和进度追踪等。

## 认证信息

所有接口都需要JWT Bearer Token认证。

```
Authorization: Bearer <your-jwt-token>
```

## 基础接口

### 1. 获取评估列表

```http
GET /evaluations
```

**查询参数：**
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认10
- `assessment_id` (可选): 考核ID
- `evaluatee_id` (可选): 被评估人ID
- `evaluator_id` (可选): 评估人ID
- `type` (可选): 评估类型 (self|leader)
- `status` (可选): 状态 (draft|submitted|completed)

**测试用例：**

```bash
# 获取所有评估
curl -X GET "http://localhost:3000/evaluations" \
  -H "Authorization: Bearer <token>"

# 按考核ID筛选
curl -X GET "http://localhost:3000/evaluations?assessment_id=1&page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# 按评估类型筛选
curl -X GET "http://localhost:3000/evaluations?type=self&status=submitted" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
{
  "items": [
    {
      "id": 1,
      "assessment_id": 1,
      "evaluator_id": 2,
      "evaluatee_id": 3,
      "type": "self",
      "status": "submitted",
      "score": 85,
      "self_review": "自我评价内容",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "hasNext": true,
  "hasPrev": false
}
```

### 2. 获取我的评估记录

```http
GET /evaluations/my
```

**查询参数：**
- `assessment_id` (可选): 考核ID

**测试用例：**

```bash
# 获取我的所有评估
curl -X GET "http://localhost:3000/evaluations/my" \
  -H "Authorization: Bearer <token>"

# 获取特定考核的评估
curl -X GET "http://localhost:3000/evaluations/my?assessment_id=1" \
  -H "Authorization: Bearer <token>"
```

### 3. 获取需要我评分的评估

```http
GET /evaluations/to-give
```

**测试用例：**

```bash
# 获取需要我评分的评估
curl -X GET "http://localhost:3000/evaluations/to-give" \
  -H "Authorization: Bearer <token>"
```

### 4. 获取评估详情

```http
GET /evaluations/:id
```

**测试用例：**

```bash
# 获取特定评估详情
curl -X GET "http://localhost:3000/evaluations/1" \
  -H "Authorization: Bearer <token>"
```

## 评分模板接口

### 5. 获取评分模板结构

```http
GET /evaluations/template/:assessmentId
```

**测试用例：**

```bash
# 获取考核的评分模板
curl -X GET "http://localhost:3000/evaluations/template/1" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
{
  "assessment_id": 1,
  "assessment_title": "2024年度绩效考核",
  "version": "1.0",
  "scoring_method": "weighted_average",
  "total_score": 100,
  "scoring_rules": {
    "self_evaluation": {
      "enabled": true,
      "weight_in_final": 30
    },
    "leader_evaluation": {
      "enabled": true,
      "weight_in_final": 70
    },
    "calculation_method": "weighted_average"
  },
  "categories": [
    {
      "id": "work_performance",
      "name": "工作绩效",
      "description": "工作完成质量和效率",
      "weight": 60,
      "evaluator_types": ["self", "leader"],
      "items": [
        {
          "id": "task_completion",
          "name": "任务完成度",
          "description": "按时按质完成工作任务",
          "weight": 40,
          "max_score": 100,
          "scoring_criteria": {
            "excellent": { "min": 90, "description": "优秀：超额完成任务" },
            "good": { "min": 80, "description": "良好：完成任务目标" },
            "average": { "min": 70, "description": "一般：基本完成任务" },
            "poor": { "min": 0, "description": "较差：未完成任务" }
          }
        }
      ]
    }
  ]
}
```

### 6. 获取用户专用评分模板

```http
GET /evaluations/template/:assessmentId/user/:userId
```

**测试用例：**

```bash
# 获取特定用户的评分模板
curl -X GET "http://localhost:3000/evaluations/template/1/user/3" \
  -H "Authorization: Bearer <token>"
```

## 详细评分接口

### 7. 提交详细自评

```http
POST /evaluations/detailed-self
```

**请求体：**
```json
{
  "assessment_id": 1,
  "self_review": "本期工作表现良好，完成了所有既定目标",
  "strengths": "工作积极主动，团队协作能力强",
  "improvements": "需要提高技术创新能力",
  "detailed_scores": [
    {
      "categoryId": "work_performance",
      "categoryScore": 88,
      "items": [
        {
          "itemId": "task_completion",
          "score": 90,
          "comment": "按时完成所有任务，质量较高"
        },
        {
          "itemId": "work_quality",
          "score": 85,
          "comment": "工作质量稳定，偶有小错误"
        }
      ]
    }
  ]
}
```

**测试用例：**

```bash
curl -X POST "http://localhost:3000/evaluations/detailed-self" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "self_review": "本期工作表现良好",
    "strengths": "工作积极主动",
    "improvements": "需要提高创新能力",
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 88,
        "items": [
          {
            "itemId": "task_completion",
            "score": 90,
            "comment": "按时完成所有任务"
          }
        ]
      }
    ]
  }'
```

### 8. 提交详细领导评分

```http
POST /evaluations/detailed-leader
```

**请求体：**
```json
{
  "assessment_id": 1,
  "evaluatee_id": 3,
  "leader_review": "该员工工作认真负责，表现出色",
  "strengths": "技术能力强，责任心强",
  "improvements": "需要加强沟通协调能力",
  "detailed_scores": [
    {
      "categoryId": "work_performance",
      "categoryScore": 92,
      "items": [
        {
          "itemId": "task_completion",
          "score": 95,
          "comment": "任务完成质量很高，超出预期"
        }
      ]
    }
  ]
}
```

**测试用例：**

```bash
curl -X POST "http://localhost:3000/evaluations/detailed-leader" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "evaluatee_id": 3,
    "leader_review": "该员工工作认真负责",
    "strengths": "技术能力强",
    "improvements": "需要加强沟通能力",
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 92,
        "items": [
          {
            "itemId": "task_completion",
            "score": 95,
            "comment": "任务完成质量很高"
          }
        ]
      }
    ]
  }'
```

## 草稿功能接口

### 9. 创建评估草稿

```http
POST /evaluations/draft
```

**请求体：**
```json
{
  "assessment_id": 1,
  "type": "self",
  "evaluatee_id": 3,
  "self_review": "草稿内容...",
  "detailed_scores": [
    {
      "categoryId": "work_performance",
      "categoryScore": 85,
      "items": [
        {
          "itemId": "task_completion",
          "score": 88,
          "comment": "临时评论"
        }
      ]
    }
  ]
}
```

**测试用例：**

```bash
curl -X POST "http://localhost:3000/evaluations/draft" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "type": "self",
    "self_review": "草稿内容...",
    "detailed_scores": []
  }'
```

### 10. 保存评估草稿

```http
PUT /evaluations/draft/:id
```

**测试用例：**

```bash
curl -X PUT "http://localhost:3000/evaluations/draft/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "self_review": "更新的草稿内容",
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 90,
        "items": [
          {
            "itemId": "task_completion",
            "score": 92,
            "comment": "更新的评论"
          }
        ]
      }
    ]
  }'
```

## 任务管理接口

### 11. 获取我的评估任务列表

```http
GET /evaluations/my-tasks
```

**查询参数：**
- `assessment_id` (可选): 考核ID

**测试用例：**

```bash
# 获取所有评估任务
curl -X GET "http://localhost:3000/evaluations/my-tasks" \
  -H "Authorization: Bearer <token>"

# 获取特定考核的任务
curl -X GET "http://localhost:3000/evaluations/my-tasks?assessment_id=1" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
[
  {
    "id": "self_1_3",
    "assessment_id": 1,
    "assessment_title": "2024年度绩效考核",
    "assessment_period": "2024年度",
    "type": "self",
    "evaluatee_id": 3,
    "evaluatee_name": "张三",
    "evaluatee_department": "技术部",
    "status": "pending",
    "deadline": "2024-12-31T23:59:59Z",
    "is_overdue": false,
    "evaluation_id": null,
    "last_updated": null
  }
]
```

### 12. 获取考核评分进度

```http
GET /evaluations/progress/:assessmentId
```

**测试用例：**

```bash
# 获取考核整体进度
curl -X GET "http://localhost:3000/evaluations/progress/1" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
{
  "assessment_id": 1,
  "assessment_title": "2024年度绩效考核",
  "total_participants": 10,
  "self_completed_count": 8,
  "leader_completed_count": 6,
  "fully_completed_count": 6,
  "self_completion_rate": 80,
  "leader_completion_rate": 60,
  "overall_completion_rate": 60,
  "participants": [
    {
      "user_id": 3,
      "user_name": "张三",
      "department": "技术部",
      "self_status": "completed",
      "leader_status": "completed",
      "self_completed_at": "2024-01-15T10:30:00Z",
      "leader_completed_at": "2024-01-20T14:20:00Z"
    }
  ],
  "deadline": "2024-12-31T23:59:59Z",
  "days_remaining": 30,
  "is_overdue": false
}
```

### 13. 获取下属评分任务

```http
GET /evaluations/subordinates/:assessmentId
```

**测试用例：**

```bash
# 获取需要我评分的下属列表
curl -X GET "http://localhost:3000/evaluations/subordinates/1" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
[
  {
    "subordinate_id": 3,
    "subordinate_name": "张三",
    "subordinate_department": "技术部",
    "status": "in_progress",
    "self_evaluation_completed": true,
    "self_evaluation_completed_at": "2024-01-15T10:30:00Z",
    "leader_evaluation_id": 5,
    "leader_evaluation_completed_at": null,
    "last_updated": "2024-01-15T10:30:00Z"
  }
]
```

## 查看和对比接口

### 14. 获取详细评分记录

```http
GET /evaluations/detailed/:id
```

**测试用例：**

```bash
# 获取详细评分记录
curl -X GET "http://localhost:3000/evaluations/detailed/1" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
{
  "id": 1,
  "assessment_id": 1,
  "evaluator_id": 2,
  "evaluatee_id": 3,
  "type": "self",
  "status": "submitted",
  "score": 88,
  "self_review": "本期工作表现良好",
  "strengths": "工作积极主动",
  "improvements": "需要提高创新能力",
  "detailed_scores": [
    {
      "categoryId": "work_performance",
      "categoryScore": 88,
      "items": [
        {
          "itemId": "task_completion",
          "score": 90,
          "comment": "按时完成所有任务"
        }
      ]
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 15. 获取自评与领导评分对比

```http
GET /evaluations/comparison/:assessmentId/:userId
```

**测试用例：**

```bash
# 获取用户的自评与领导评分对比
curl -X GET "http://localhost:3000/evaluations/comparison/1/3" \
  -H "Authorization: Bearer <token>"
```

**预期响应：**
```json
{
  "assessment_id": 1,
  "user_id": 3,
  "user_name": "张三",
  "self_evaluation": {
    "id": 1,
    "score": 88,
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 88,
        "items": [
          {
            "itemId": "task_completion",
            "score": 90,
            "comment": "按时完成所有任务"
          }
        ]
      }
    ],
    "submitted_at": "2024-01-15T10:30:00Z"
  },
  "leader_evaluation": {
    "id": 2,
    "score": 92,
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 92,
        "items": [
          {
            "itemId": "task_completion",
            "score": 95,
            "comment": "任务完成质量很高"
          }
        ]
      }
    ],
    "submitted_at": "2024-01-20T14:20:00Z"
  },
  "comparison": {
    "overall_difference": 4,
    "category_differences": [
      {
        "categoryId": "work_performance",
        "category_name": "工作绩效",
        "self_score": 88,
        "leader_score": 92,
        "difference": 4,
        "item_differences": [
          {
            "itemId": "task_completion",
            "item_name": "任务完成度",
            "self_score": 90,
            "leader_score": 95,
            "difference": 5
          }
        ]
      }
    ]
  }
}
```

## 传统评分接口（兼容性）

### 16. 提交自评

```http
POST /evaluations/self
```

**请求体：**
```json
{
  "assessment_id": 1,
  "score": 85,
  "self_review": "本期工作表现良好",
  "strengths": "工作积极主动",
  "improvements": "需要提高创新能力"
}
```

**测试用例：**

```bash
curl -X POST "http://localhost:3000/evaluations/self" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "score": 85,
    "self_review": "本期工作表现良好",
    "strengths": "工作积极主动",
    "improvements": "需要提高创新能力"
  }'
```

### 17. 提交领导评分

```http
POST /evaluations/leader
```

**请求体：**
```json
{
  "assessment_id": 1,
  "evaluatee_id": 3,
  "score": 90,
  "leader_review": "该员工工作认真负责",
  "strengths": "技术能力强",
  "improvements": "需要加强沟通能力"
}
```

**测试用例：**

```bash
curl -X POST "http://localhost:3000/evaluations/leader" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "evaluatee_id": 3,
    "score": 90,
    "leader_review": "该员工工作认真负责",
    "strengths": "技术能力强",
    "improvements": "需要加强沟通能力"
  }'
```

## 更新和删除接口

### 18. 更新评估

```http
PUT /evaluations/:id
```

**测试用例：**

```bash
curl -X PUT "http://localhost:3000/evaluations/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 90,
    "self_review": "更新的自评内容"
  }'
```

### 19. 删除评估

```http
DELETE /evaluations/:id
```

**测试用例：**

```bash
curl -X DELETE "http://localhost:3000/evaluations/1" \
  -H "Authorization: Bearer <token>"
```

## 错误处理测试

### 常见错误情况

1. **未授权访问**
```bash
curl -X GET "http://localhost:3000/evaluations"
# 预期响应：401 Unauthorized
```

2. **评估不存在**
```bash
curl -X GET "http://localhost:3000/evaluations/999999" \
  -H "Authorization: Bearer <token>"
# 预期响应：404 Not Found
```

3. **重复提交评估**
```bash
curl -X POST "http://localhost:3000/evaluations/detailed-self" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "self_review": "重复提交测试"
  }'
# 预期响应：400 Bad Request - "您已经提交过自评"
```

4. **分数超出范围**
```bash
curl -X POST "http://localhost:3000/evaluations/detailed-self" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 150,
        "items": []
      }
    ]
  }'
# 预期响应：400 Bad Request - 分数验证失败
```

5. **权限不足**
```bash
curl -X POST "http://localhost:3000/evaluations/detailed-leader" \
  -H "Authorization: Bearer <employee-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "evaluatee_id": 3,
    "leader_review": "测试权限"
  }'
# 预期响应：403 Forbidden - "您没有权限评估此用户"
```

## 批量测试脚本

### 完整功能测试脚本

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token-here"

# 设置认证头
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo "开始评估模块API测试..."

# 1. 获取评分模板
echo "1. 获取评分模板"
curl -X GET "$BASE_URL/evaluations/template/1" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json"

# 2. 创建自评草稿
echo "2. 创建自评草稿"
DRAFT_RESPONSE=$(curl -X POST "$BASE_URL/evaluations/draft" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "type": "self",
    "self_review": "草稿内容"
  }')

DRAFT_ID=$(echo $DRAFT_RESPONSE | jq -r '.id')

# 3. 更新草稿
echo "3. 更新草稿"
curl -X PUT "$BASE_URL/evaluations/draft/$DRAFT_ID" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "self_review": "更新的草稿内容",
    "detailed_scores": []
  }'

# 4. 提交详细自评
echo "4. 提交详细自评"
curl -X POST "$BASE_URL/evaluations/detailed-self" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": 1,
    "self_review": "正式提交的自评",
    "detailed_scores": [
      {
        "categoryId": "work_performance",
        "categoryScore": 88,
        "items": [
          {
            "itemId": "task_completion",
            "score": 90,
            "comment": "按时完成所有任务"
          }
        ]
      }
    ]
  }'

# 5. 获取我的任务
echo "5. 获取我的任务"
curl -X GET "$BASE_URL/evaluations/my-tasks" \
  -H "$AUTH_HEADER"

# 6. 获取评分进度
echo "6. 获取评分进度"
curl -X GET "$BASE_URL/evaluations/progress/1" \
  -H "$AUTH_HEADER"

echo "评估模块API测试完成!"
```

## 性能测试建议

### 并发测试
使用工具如 `ab` (Apache Bench) 或 `wrk` 进行并发测试：

```bash
# 测试获取评估列表的并发性能
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:3000/evaluations

# 测试评分提交的并发性能
ab -n 100 -c 5 -p self_evaluation.json -T application/json \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/evaluations/detailed-self
```

### 大数据量测试
测试大量评估数据的处理能力：

```bash
# 测试大量评估记录的查询性能
curl -X GET "http://localhost:3000/evaluations?limit=1000" \
  -H "Authorization: Bearer <token>"

# 测试复杂详细评分的提交性能
curl -X POST "http://localhost:3000/evaluations/detailed-self" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @large_evaluation.json
```

---

**注意事项：**

1. 所有测试都需要有效的JWT Token
2. 测试数据应该与实际的考核模板配置匹配
3. 注意测试环境的数据隔离
4. 定期清理测试数据
5. 监控测试过程中的系统性能指标

此文档涵盖了评估模块的所有主要功能，可以作为开发测试和集成测试的完整指南。