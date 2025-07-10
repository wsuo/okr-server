import { ValueTransformer } from 'typeorm';

/**
 * 时区转换器
 * 自动处理数据库与应用之间的时区转换
 */
export class TimezoneTransformer implements ValueTransformer {
  // 东八区偏移量（毫秒）
  private readonly TIMEZONE_OFFSET = 8 * 60 * 60 * 1000;

  /**
   * 存储到数据库时的转换（应用时间 -> 数据库时间）
   * @param value 应用中的时间值
   * @returns 存储到数据库的时间值
   */
  to(value: Date): Date {
    if (!value) return value;
    
    // 如果传入的是东八区时间，转换为UTC时间存储
    if (value instanceof Date) {
      // 检查是否已经是UTC时间，避免重复转换
      const timezoneOffset = value.getTimezoneOffset() * 60 * 1000;
      if (timezoneOffset === 0) {
        // 已经是UTC时间，直接存储
        return value;
      } else {
        // 转换为UTC时间
        return new Date(value.getTime() - this.TIMEZONE_OFFSET);
      }
    }
    
    return value;
  }

  /**
   * 从数据库读取时的转换（数据库时间 -> 应用时间）
   * @param value 数据库中的时间值
   * @returns 应用中使用的时间值
   */
  from(value: Date): Date {
    if (!value) return value;
    
    // 从数据库读取的UTC时间转换为东八区时间
    if (value instanceof Date) {
      return new Date(value.getTime() + this.TIMEZONE_OFFSET);
    }
    
    return value;
  }
}

// 导出单例实例
export const timezoneTransformer = new TimezoneTransformer();