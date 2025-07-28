import { ValueTransformer } from 'typeorm';

/**
 * 时区转换器
 * 由于数据库连接已配置 timezone: "+08:00"，MySQL会自动处理时区转换
 * 此转换器现在只需要透传数据，避免双重转换
 */
export class TimezoneTransformer implements ValueTransformer {
  /**
   * 存储到数据库时的转换（应用时间 -> 数据库时间）
   * @param value 应用中的时间值
   * @returns 存储到数据库的时间值
   */
  to(value: Date): Date {
    // 数据库连接已配置时区，直接透传
    return value;
  }

  /**
   * 从数据库读取时的转换（数据库时间 -> 应用时间）
   * @param value 数据库中的时间值
   * @returns 应用中使用的时间值
   */
  from(value: Date): Date {
    // 数据库连接已配置时区，直接透传
    return value;
  }
}

// 导出单例实例
export const timezoneTransformer = new TimezoneTransformer();