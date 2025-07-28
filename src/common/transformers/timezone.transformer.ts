import { ValueTransformer } from 'typeorm';

/**
 * 时区转换器
 * 处理数据库与应用之间的时区转换
 * 数据库存储UTC时间，应用显示东八区时间
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
    
    // 将东八区时间转换为UTC时间存储
    if (value instanceof Date) {
      return new Date(value.getTime() - this.TIMEZONE_OFFSET);
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
    
    // 数据库已经存储了正确的东八区时间，直接返回
    // 不需要再加8小时，否则会导致时间多8小时
    return value;
  }
}

// 导出单例实例
export const timezoneTransformer = new TimezoneTransformer();