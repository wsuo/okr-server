import { ValueTransformer } from 'typeorm';

/**
 * 时区转换器
 * 确保时间数据在存储和读取时保持东八区时区
 */
export class TimezoneTransformer implements ValueTransformer {
  /**
   * 存储到数据库时的转换（应用时间 -> 数据库时间）
   */
  to(value: Date): Date {
    if (!value) return value;
    return value;
  }

  /**
   * 从数据库读取时的转换（数据库时间 -> 应用时间）
   * 数据库存储的是东八区时间，需要构造正确的时区时间
   */
  from(value: Date): Date {
    if (!value) return value;
    
    // 数据库中的时间已经是东八区时间，但被当作UTC处理了
    // 需要添加8小时的偏移来得到正确的东八区时间
    const date = new Date(value);
    const offsetHours = 8;
    const correctedDate = new Date(date.getTime() + (offsetHours * 60 * 60 * 1000));
    
    return correctedDate;
  }
}

// 导出单例实例
export const timezoneTransformer = new TimezoneTransformer();