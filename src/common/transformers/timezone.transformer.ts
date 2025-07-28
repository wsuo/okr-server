import { ValueTransformer } from 'typeorm';

/**
 * 时区转换器
 * 由于数据库已配置为东八区(timezone: "+08:00")，数据库存储的就是本地时间
 * 不需要进行时区转换，直接透传即可
 */
export class TimezoneTransformer implements ValueTransformer {
  /**
   * 存储到数据库时的转换（应用时间 -> 数据库时间）
   * @param value 应用中的时间值
   * @returns 存储到数据库的时间值
   */
  to(value: Date): Date {
    // 数据库已配置为东八区，直接存储
    return value;
  }

  /**
   * 从数据库读取时的转换（数据库时间 -> 应用时间）
   * @param value 数据库中的时间值
   * @returns 应用中使用的时间值
   */
  from(value: Date): Date {
    // 数据库存储的就是东八区时间，直接返回
    return value;
  }
}

// 导出单例实例
export const timezoneTransformer = new TimezoneTransformer();