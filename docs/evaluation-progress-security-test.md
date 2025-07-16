# 评估进度接口安全测试文档

## 概述

本文档专门测试 `/api/v1/evaluations/progress/{assessmentId}` 接口的安全修复，验证：
1. 角色访问控制：只有 "leader" 角色可以访问
2. 部门数据过滤：领导只能看到自己部门的参与者数据

## 测试环境设置

### 测试用户数据
```
用户ID | 用户名 | 角色 | 部门 | 部门ID
------|--------|------|------|-------
1     | admin  | admin| 管理部| 1
2     | boss   | boss | 管理部| 1  
3     | lisi   | leader| 技术部| 2
4     | zhaoliu| leader| 销售部| 3
5     | zhangsan| employee| 技术部| 2
6     | wangwu | employee| 销售部| 3
7     | wyx    | employee| 技术部| 2
```

### 考核参与者数据
```
考核ID: 15
参与者:
- user_id=5 (zhangsan, 技术部)
- user_id=6 (wangwu, 销售部) 
- user_id=7 (wyx, 技术部)
```

## 安全测试用例

### 1. 角色访问控制测试

#### 1.1 测试 admin 角色被拒绝访问
```bash
# 使用 admin 用户的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json"

# 预期结果: 403 Forbidden
# 预期响应: {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
```

#### 1.2 测试 boss 角色被拒绝访问
```bash
# 使用 boss 用户的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <boss-token>" \
  -H "Content-Type: application/json"

# 预期结果: 403 Forbidden
# 预期响应: {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
```

#### 1.3 测试 employee 角色被拒绝访问
```bash
# 使用 employee 用户的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <employee-token>" \
  -H "Content-Type: application/json"

# 预期结果: 403 Forbidden
# 预期响应: {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
```

#### 1.4 测试 leader 角色可以访问
```bash
# 使用 leader 用户的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <leader-token>" \
  -H "Content-Type: application/json"

# 预期结果: 200 OK
# 预期响应: 包含评估进度数据
```

### 2. 部门数据过滤测试

#### 2.1 技术部领导只能看到技术部员工
```bash
# 使用技术部领导 lisi (user_id=3) 的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <lisi-leader-token>" \
  -H "Content-Type: application/json"

# 预期结果: 200 OK
# 预期响应中的 participants 数组应该只包含:
# - user_id=5 (zhangsan, 技术部)
# - user_id=7 (wyx, 技术部)
# 不应该包含:
# - user_id=6 (wangwu, 销售部)
```

#### 2.2 销售部领导只能看到销售部员工
```bash
# 使用销售部领导 zhaoliu (user_id=4) 的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <zhaoliu-leader-token>" \
  -H "Content-Type: application/json"

# 预期结果: 200 OK
# 预期响应中的 participants 数组应该只包含:
# - user_id=6 (wangwu, 销售部)
# 不应该包含:
# - user_id=5 (zhangsan, 技术部)
# - user_id=7 (wyx, 技术部)
```

### 3. 统计数据一致性测试

#### 3.1 验证技术部领导看到的统计数据
```bash
# 使用技术部领导的 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <lisi-leader-token>" \
  -H "Content-Type: application/json"

# 预期响应结构验证:
{
  "assessment_id": 15,
  "assessment_title": "...",
  "total_participants": 2,  // 只有技术部的2个员工
  "self_completed_count": X,  // 基于过滤后的参与者计算
  "leader_completed_count": Y,  // 基于过滤后的参与者计算
  "fully_completed_count": Z,  // 基于过滤后的参与者计算
  "self_completion_rate": X/2*100,  // 基于过滤后的总数计算
  "leader_completion_rate": Y/2*100,  // 基于过滤后的总数计算
  "overall_completion_rate": Z/2*100,  // 基于过滤后的总数计算
  "participants": [
    {
      "user_id": 5,
      "user_name": "zhangsan",
      "department": "技术部",
      // ...
    },
    {
      "user_id": 7,
      "user_name": "wyx", 
      "department": "技术部",
      // ...
    }
  ]
}
```

### 4. 边界情况测试

#### 4.1 测试领导没有部门的情况
```bash
# 创建一个没有部门的领导用户进行测试
# 预期结果: 400 Bad Request
# 预期响应: {"statusCode": 400, "message": "您未分配到任何部门，无法查看评估进度"}
```

#### 4.2 测试领导部门没有参与者的情况
```bash
# 使用一个部门没有参与者的领导 token
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Authorization: Bearer <empty-department-leader-token>" \
  -H "Content-Type: application/json"

# 预期结果: 200 OK
# 预期响应:
{
  "total_participants": 0,
  "participants": [],
  "self_completed_count": 0,
  "leader_completed_count": 0,
  "fully_completed_count": 0,
  "self_completion_rate": 0,
  "leader_completion_rate": 0,
  "overall_completion_rate": 0
}
```

### 5. 无效请求测试

#### 5.1 测试无效的考核ID
```bash
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/99999" \
  -H "Authorization: Bearer <leader-token>" \
  -H "Content-Type: application/json"

# 预期结果: 404 Not Found
# 预期响应: {"statusCode": 404, "message": "考核 ID 99999 不存在"}
```

#### 5.2 测试未授权访问
```bash
curl -X GET "http://localhost:3000/api/v1/evaluations/progress/15" \
  -H "Content-Type: application/json"

# 预期结果: 401 Unauthorized
```

## 测试脚本

### 完整安全测试脚本
```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
ASSESSMENT_ID="15"

# 测试用例计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 测试函数
test_endpoint() {
    local test_name="$1"
    local token="$2"
    local expected_status="$3"
    local description="$4"
    
    echo "测试: $test_name"
    echo "描述: $description"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/evaluations/progress/$ASSESSMENT_ID")
    else
        response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/evaluations/progress/$ASSESSMENT_ID" \
            -H "Authorization: Bearer $token")
    fi
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ 通过 - 状态码: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ 失败 - 期望: $expected_status, 实际: $status_code"
        echo "响应: ${response%???}"
    fi
    
    echo "---"
}

echo "开始评估进度接口安全测试..."
echo "目标接口: $BASE_URL/evaluations/progress/$ASSESSMENT_ID"
echo "=========================================="

# 1. 角色访问控制测试
test_endpoint "admin角色访问" "$ADMIN_TOKEN" "403" "admin角色应该被拒绝访问"
test_endpoint "boss角色访问" "$BOSS_TOKEN" "403" "boss角色应该被拒绝访问"  
test_endpoint "employee角色访问" "$EMPLOYEE_TOKEN" "403" "employee角色应该被拒绝访问"
test_endpoint "leader角色访问" "$LEADER_TOKEN" "200" "leader角色应该可以访问"

# 2. 未授权访问测试
test_endpoint "无token访问" "" "401" "无认证token应该返回401"

# 3. 无效考核ID测试
ASSESSMENT_ID="99999"
test_endpoint "无效考核ID" "$LEADER_TOKEN" "404" "不存在的考核ID应该返回404"

echo "=========================================="
echo "测试完成!"
echo "总测试数: $TOTAL_TESTS"
echo "通过测试: $PASSED_TESTS"
echo "失败测试: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "🎉 所有测试通过!"
    exit 0
else
    echo "⚠️  有测试失败，请检查实现"
    exit 1
fi
```

## 测试结果验证

### 成功标准
1. ✅ 只有 leader 角色可以访问接口
2. ✅ admin、boss、employee 角色被拒绝访问
3. ✅ 领导只能看到自己部门的参与者
4. ✅ 统计数据基于过滤后的参与者计算
5. ✅ 无部门的领导收到适当错误信息
6. ✅ 无效请求返回正确的错误状态码

### 注意事项
1. 测试前确保数据库中有正确的测试数据
2. 确保各角色用户的JWT token有效
3. 测试完成后清理测试数据
4. 监控测试过程中的系统日志

---

**文档版本：** v1.0  
**创建日期：** 2025-07-16  
**测试目标：** 验证评估进度接口的安全修复
