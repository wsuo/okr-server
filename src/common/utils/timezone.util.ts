/**
 * 时区处理工具类
 * 处理数据库时间与本地时间的转换
 */
export class TimezoneUtil {
  // 东八区偏移量（8小时 = 8 * 60 * 60 * 1000 毫秒）
  private static readonly TIMEZONE_OFFSET = 8 * 60 * 60 * 1000;

  /**
   * 将UTC时间转换为东八区时间
   * @param utcDate UTC时间
   * @returns 东八区时间
   */
  static utcToLocal(utcDate: Date): Date {
    if (!utcDate) return null;
    return new Date(utcDate.getTime() + this.TIMEZONE_OFFSET);
  }

  /**
   * 将东八区时间转换为UTC时间
   * @param localDate 东八区时间
   * @returns UTC时间
   */
  static localToUtc(localDate: Date): Date {
    if (!localDate) return null;
    return new Date(localDate.getTime() - this.TIMEZONE_OFFSET);
  }

  /**
   * 获取当前东八区时间
   * @returns 当前东八区时间
   */
  static now(): Date {
    return this.utcToLocal(new Date());
  }

  /**
   * 格式化时间为东八区时间字符串
   * @param date 时间对象
   * @param format 格式化字符串，默认为 'YYYY-MM-DD HH:mm:ss'
   * @returns 格式化后的时间字符串
   */
  static format(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    if (!date) return '';
    
    const localDate = this.utcToLocal(date);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 创建当前时间的Date对象（用于数据库存储）
   * @returns 适合数据库存储的UTC时间
   */
  static createDbTimestamp(): Date {
    return new Date(); // 直接返回UTC时间给数据库
  }

  /**
   * 解析日期字符串为数据库时间
   * @param dateString 日期字符串（假设为东八区时间）
   * @returns 适合数据库存储的UTC时间
   */
  static parseToDbTimestamp(dateString: string): Date {
    if (!dateString) return null;
    const localDate = new Date(dateString);
    return this.localToUtc(localDate);
  }
}