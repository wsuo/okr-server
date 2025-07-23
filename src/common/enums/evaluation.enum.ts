/**
 * 评估类型枚举
 * 定义系统支持的三种评估类型
 */
export enum EvaluationType {
  /** 员工自评 */
  SELF = 'self',
  
  /** 直属领导评分 */
  LEADER = 'leader',
  
  /** 上级（Boss）评分 */
  BOSS = 'boss'
}

/**
 * 评估状态枚举
 */
export enum EvaluationStatus {
  /** 草稿状态 */
  DRAFT = 'draft',
  
  /** 已提交状态 */
  SUBMITTED = 'submitted'
}

/**
 * 评估类型联合类型，用于类型检查
 */
export type EvaluationTypeString = 'self' | 'leader' | 'boss';

/**
 * 评估状态联合类型，用于类型检查
 */
export type EvaluationStatusString = 'draft' | 'submitted';