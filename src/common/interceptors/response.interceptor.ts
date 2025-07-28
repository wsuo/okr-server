import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";

export interface Response<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  
  /**
   * 将Date对象转换为东八区时间字符串
   * 由于数据库已配置为东八区，返回的Date对象实际上是东八区时间
   * 但JavaScript会将其视为UTC时间，所以需要减去8小时偏移
   * @param date 时间对象
   * @returns 东八区时间字符串
   */
  private toLocalTimeString(date: Date): string {
    if (!date || !(date instanceof Date)) return null;
    
    // 数据库返回的时间已经是东八区时间，但JavaScript当作UTC处理了
    // 所以这里减去8小时偏移，让显示的时间正确
    const localTime = new Date(date.getTime() - (8 * 60 * 60 * 1000));
    return localTime.toISOString();
  }

  /**
   * 递归处理对象中的所有Date类型字段
   * @param obj 要处理的对象
   * @returns 处理后的对象
   */
  private convertDatesToLocalTime(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return this.toLocalTimeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToLocalTime(item));
    }

    if (typeof obj === 'object') {
      const converted = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          converted[key] = this.convertDatesToLocalTime(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: "success",
        data: this.convertDatesToLocalTime(data),
        timestamp: this.toLocalTimeString(new Date()),
        path: request.url,
      }))
    );
  }
}
