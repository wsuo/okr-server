# Boss评估系统 - 前端集成文档

## 系统概述

本文档描述了OKR系统中新增Boss评估功能的完整实现，包括数据库变更、API更新和业务逻辑变更。Boss评估系统将原有的二维度评估（员工自评 + 领导评分）扩展为三维度评估系统。

## 核心变更摘要

### 评估维度扩展
- **原系统**: 员工自评(40%) + 直属领导评分(60%)
- **新系统**: 员工自评(36%) + 直属领导评分(54%) + 上级评分(10%)
- **权重配置**: 支持管理员自定义权重分配
- **向后兼容**: 如果没有boss评分，系统按原有公式计算

### 评分公式变更
```javascript
// 原公式
final_score = self_score * 0.4 + leader_score * 0.6

// 新公式（默认权重）
final_score = self_score * 0.36 + leader_score * 0.54 + boss_score * 0.10

// 通用公式
final_score = (self_score * self_weight + leader_score * leader_weight) * primary_weight + boss_score * boss_weight
```

## 数据库架构变更

### 1. assessment_participants 表扩展

**新增字段**：
```sql
-- 上级评分完成状态
boss_completed TINYINT(1) DEFAULT 0 COMMENT '上级评分完成状态：0-未完成，1-已完成'

-- 上级评分
boss_score DECIMAL(5,2) NULL COMMENT '上级评分（0-100分）'

-- 上级评分提交时间
boss_submitted_at TIMESTAMP NULL COMMENT '上级评分提交时间'
```

**字段说明**：
- `boss_completed`: 追踪上级评分完成状态，0表示未完成，1表示已完成
- `boss_score`: 存储上级评分，范围0-100分，可为NULL
- `boss_submitted_at`: 记录上级评分提交的时间戳

### 2. evaluations 表扩展

**评估类型扩展**：
```sql
-- 更新评估类型枚举，新增 'boss' 类型
ALTER TABLE evaluations 
MODIFY COLUMN type VARCHAR(20) CHECK (type IN ('self', 'leader', 'boss'));
```

### 3. 模板配置JSON结构扩展

**新的权重配置结构**：
```json
{
  "scoring_rules": {
    "self_evaluation": {
      "enabled": true,
      "description": "员工自我评估",
      "weight_in_final": 0.36
    },
    "leader_evaluation": {
      "enabled": true,
      "description": "直属领导评估", 
      "weight_in_final": 0.54
    },
    "boss_evaluation": {
      "enabled": true,
      "description": "上级(Boss)评估",
      "weight_in_final": 0.10,
      "is_optional": true
    }
  }
}
```

## API 变更详情

### 新增API端点

#### 1. 提交简单上级评分
```http
POST /evaluations/boss
Content-Type: application/json
Authorization: Bearer <token>

{
  "assessment_id": 1,
  "evaluatee_id": 2,
  "score": 85.5,
  "feedback": "整体表现良好",
  "strengths": "战略思维清晰",
  "improvements": "需要加强跨部门协作"
}
```

**响应**：
```json
{
  "id": 123,
  "type": "boss",
  "score": 85.5,
  "status": "submitted",
  "submitted_at": "2025-07-23T03:14:05.000Z",
  "feedback": "整体表现良好",
  "strengths": "战略思维清晰", 
  "improvements": "需要加强跨部门协作"
}
```

#### 2. 提交详细上级评分
```http
POST /evaluations/detailed-boss
Content-Type: application/json
Authorization: Bearer <token>

{
  "assessment_id": 1,
  "evaluatee_id": 2,
  "boss_review": "从上级视角的整体评价",
  "detailed_scores": [
    {
      "categoryId": "work_performance",
      "categoryScore": 88.0,
      "items": [
        {
          "itemId": "work_execution",
          "score": 90,
          "comment": "执行力强"
        }
      ],
      "comment": "工作绩效表现优秀"
    }
  ],
  "overall_feedback": "整体表现优秀",
  "strengths": "领导力和战略规划能力强",
  "improvements": "建议加强团队协作"
}
```

### 修改的API端点

#### 1. 获取用户评估模板
```http
GET /evaluations/template/{assessmentId}?userId={userId}
```

**响应变更**：
```json
{
  "assessment_id": 1,
  "evaluation_type": "boss",  // 新增 "boss" 类型
  "scoring_rules": {
    "self_evaluation": {
      "enabled": true,
      "weight_in_final": 0.36
    },
    "leader_evaluation": {
      "enabled": true, 
      "weight_in_final": 0.54
    },
    "boss_evaluation": {     // 新增boss评估规则
      "enabled": true,
      "weight_in_final": 0.10
    }
  }
}
```

#### 2. 查询评估列表
```http
GET /evaluations?type=boss&status=submitted
```

**查询参数变更**：
- `type`: 新增支持 `"boss"` 值
- 其他参数保持不变

### 权限控制变更

#### Boss评分权限验证
- **权限要求**: 评估者必须是被评估人的上级（即被评估人直属领导的领导）
- **层级关系**: `评估者 <- 直属领导 <- 被评估人`
- **验证逻辑**: `evaluatee.leader.leader.id === evaluatorId`

#### 权限错误响应
```json
{
  "statusCode": 403,
  "message": "您没有权限对该用户进行上级评分",
  "error": "Forbidden"
}
```

## 业务逻辑变更

### 1. 评估流程扩展

**原流程**：
1. 员工提交自评
2. 直属领导提交评分
3. 系统计算最终分数
4. 考核结束

**新流程**：
1. 员工提交自评
2. 直属领导提交评分  
3. 上级提交评分（可选）
4. 系统计算最终分数（支持三维度）
5. 考核结束

### 2. 分数计算逻辑

**计算时机**：
- 必需评分完成时触发计算
- Boss评分为可选项，不阻塞整体流程
- 支持Boss评分缺失的情况下正常计算

**权重获取优先级**：
1. 考核模板配置快照 (`assessment.template_config`)
2. 关联模板配置 (`template.config`)
3. 默认权重 (自评30%, 领导70%, Boss0%)

### 3. 状态管理扩展

**完成状态判断**：
```javascript
// 检查必需评分是否完成
const selfCompleted = participant.self_completed === 1;
const leaderCompleted = participant.leader_completed === 1;
const bossCompleted = participant.boss_completed === 1;

// Boss评分要求检查
const bossRequired = weightConfig.boss_enabled && weightConfig.boss_weight > 0;
const allRequiredComplete = selfCompleted && leaderCompleted && (!bossRequired || bossCompleted);
```

## 前端适配指南

### 1. 页面结构调整

#### 评估任务列表页面
- 新增"上级评分"任务类型显示
- 支持Boss评分状态展示
- 更新任务过滤器（新增boss类型）

#### 评分表单页面
- 复用现有评分表单组件
- 根据`evaluation_type`字段判断显示内容
- Boss评分表单与领导评分表单结构相同

#### 权重配置页面（管理员）
- 新增Boss评分权重配置
- 实时验证权重总和为100%
- 支持启用/禁用Boss评分功能

### 2. 权限控制前端实现

#### 路由守卫扩展
```javascript
// 检查Boss评分权限
function canAccessBossEvaluation(user, targetUser) {
  return user.id === targetUser?.leader?.leader?.id;
}

// 在路由守卫中使用
if (evaluationType === 'boss' && !canAccessBossEvaluation(currentUser, targetUser)) {
  // 重定向到无权限页面
  return redirect('/unauthorized');
}
```

#### 按钮显示逻辑
```vue
<template>
  <!-- 只有上级才能看到Boss评分按钮 -->
  <button 
    v-if="canDoBossEvaluation" 
    @click="startBossEvaluation"
  >
    上级评分
  </button>
</template>

<script>
computed: {
  canDoBossEvaluation() {
    return this.currentUser.id === this.targetUser?.leader?.leader?.id;
  }
}
</script>
```

### 3. 数据处理适配

#### API调用示例
```javascript
// 提交Boss评分
async function submitBossEvaluation(assessmentId, evaluateeId, evaluationData) {
  try {
    const response = await api.post('/evaluations/boss', {
      assessment_id: assessmentId,
      evaluatee_id: evaluateeId,
      ...evaluationData
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('您没有权限进行上级评分');
    }
    throw error;
  }
}

// 获取三维度评分结果
async function getEvaluationResult(assessmentId, userId) {
  const response = await api.get(`/evaluations/result/${assessmentId}/${userId}`);
  const { self_score, leader_score, boss_score, final_score } = response.data;
  
  return {
    selfScore: self_score,
    leaderScore: leader_score, 
    bossScore: boss_score,      // 可能为null
    finalScore: final_score,
    hasBossScore: boss_score !== null
  };
}
```

#### 状态显示逻辑
```javascript
// 评估进度计算
function calculateProgress(participant) {
  const { self_completed, leader_completed, boss_completed } = participant;
  const { boss_enabled, boss_weight } = templateConfig;
  
  let completed = 0;
  let total = 2; // 自评 + 领导评分
  
  if (self_completed) completed++;
  if (leader_completed) completed++;
  
  // 如果启用且权重大于0，Boss评分为必需
  if (boss_enabled && boss_weight > 0) {
    total++;
    if (boss_completed) completed++;
  }
  
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100)
  };
}
```

### 4. UI组件适配

#### 评分卡片组件扩展
```vue
<template>
  <div class="evaluation-card">
    <!-- 自评卡片 -->
    <ScoreCard 
      type="self"
      :score="evaluation.selfScore"
      :completed="evaluation.selfCompleted"
      title="员工自评"
    />
    
    <!-- 领导评分卡片 -->
    <ScoreCard 
      type="leader"
      :score="evaluation.leaderScore" 
      :completed="evaluation.leaderCompleted"
      title="领导评分"
    />
    
    <!-- Boss评分卡片（新增） -->
    <ScoreCard 
      v-if="showBossEvaluation"
      type="boss"
      :score="evaluation.bossScore"
      :completed="evaluation.bossCompleted" 
      title="上级评分"
      :optional="true"
    />
  </div>
</template>

<script>
computed: {
  showBossEvaluation() {
    return this.templateConfig?.scoring_rules?.boss_evaluation?.enabled;
  }
}
</script>
```

#### 权重显示组件
```vue
<template>
  <div class="weight-display">
    <div class="weight-item">
      <span>员工自评</span>
      <span>{{ (selfWeight * 100).toFixed(0) }}%</span>
    </div>
    <div class="weight-item">
      <span>领导评分</span>
      <span>{{ (leaderWeight * 100).toFixed(0) }}%</span>
    </div>
    <div v-if="bossWeight > 0" class="weight-item">
      <span>上级评分</span>
      <span>{{ (bossWeight * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>
```

## 兼容性说明

### 向后兼容性
1. **现有数据**: 所有现有评估记录继续有效
2. **API兼容**: 现有API端点保持向后兼容
3. **计算逻辑**: 没有Boss评分时按原有公式计算
4. **权重配置**: 自动转换现有模板配置

### 迁移策略
1. **数据库迁移**: 自动添加新字段，默认值确保兼容性
2. **模板更新**: 现有模板自动扩展支持Boss评分配置
3. **分阶段部署**: 可以先部署后端，前端逐步适配

## 测试场景

### 1. 功能测试场景
- ✅ Boss评分权限验证
- ✅ 三维度分数计算准确性
- ✅ 可选Boss评分流程
- ✅ 权重配置有效性
- ✅ 向后兼容性验证

### 2. 权限测试场景
- ✅ 非上级用户无法进行Boss评分
- ✅ 上级用户可以正常评分
- ✅ 跨部门权限验证

### 3. 边界情况测试
- ✅ Boss评分缺失情况下的分数计算
- ✅ 权重为0时的处理逻辑
- ✅ 异常权重配置的处理

## 部署注意事项

### 1. 数据库迁移
```bash
# 运行数据库迁移
npm run migration:run

# 更新默认模板（可选）
npm run seed:template
```

### 2. 环境变量配置
无需新增环境变量，使用现有配置即可。

### 3. 缓存清理
如果使用Redis缓存模板配置，建议清理缓存以确保新配置生效。

## 性能影响评估

### 数据库影响
- **表结构**: 新增3个字段，对现有查询性能影响微小
- **查询复杂度**: 权限验证查询增加一层关联，性能影响可接受
- **存储空间**: 每个参与者记录增加约16字节

### API性能影响
- **响应时间**: 新增API端点不影响现有端点性能
- **并发处理**: Boss评分并发量相对较小，不会造成性能瓶颈

## 总结

Boss评估系统的实现为OKR绩效管理系统增加了更全面的评估维度，同时保持了良好的向后兼容性。通过灵活的权重配置和可选的Boss评分机制，系统能够适应不同组织的评估需求。

前端开发团队可以基于本文档进行UI适配和功能开发，所有必要的后端API和数据结构都已准备就绪。

---

**文档版本**: v1.0  
**最后更新**: 2025-07-23  
**作者**: Claude Code Assistant