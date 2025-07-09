import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const contentType = headers['content-type'] || '';
    
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 获取请求体（非文件上传）
    let requestBody = {};
    if (req.body && contentType.includes('application/json')) {
      requestBody = this.sanitizeRequestBody(req.body);
    }

    // 构建请求日志信息
    const requestInfo = {
      method,
      url: originalUrl,
      ip,
      userAgent: userAgent.substring(0, 100),
      contentType,
      timestamp: new Date().toISOString(),
      ...(Object.keys(requestBody).length > 0 && { requestBody })
    };

    // 使用 http 级别记录请求信息
    this.logger.log(
      JSON.stringify({
        type: 'request',
        ...requestInfo
      }),
      'HTTP'
    );

    // 拦截响应
    const originalJson = res.json;
    res.json = function (body) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      // 构建响应日志信息
      const responseInfo = {
        method,
        url: originalUrl,
        ip,
        statusCode,
        duration,
        timestamp: new Date().toISOString(),
        type: 'response'
      };

      // 记录响应体（仅在错误时或者开发环境下）
      if (statusCode >= 400 || (process.env.NODE_ENV === 'development' && process.env.LOG_RESPONSE_BODY === 'true')) {
        const sanitizedBody = RequestLoggerMiddleware.sanitizeResponseBody(body);
        responseInfo['responseBody'] = sanitizedBody;
      }
      
      // 根据状态码选择日志级别
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      
      const logger = new Logger('HTTP');
      logger[logLevel](
        JSON.stringify(responseInfo),
        'HTTP'
      );

      return originalJson.call(this, body);
    };

    next();
  }

  /**
   * 清理敏感的请求数据
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }

  /**
   * 清理敏感的响应数据
   */
  private static sanitizeResponseBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token'];
    const sanitized = JSON.parse(JSON.stringify(body));

    function removeSensitiveFields(obj: any) {
      if (obj && typeof obj === 'object') {
        for (const field of sensitiveFields) {
          if (obj[field]) {
            obj[field] = '***';
          }
        }
        
        // 递归处理嵌套对象
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeSensitiveFields(obj[key]);
          }
        });
      }
    }

    removeSensitiveFields(sanitized);
    return sanitized;
  }
}