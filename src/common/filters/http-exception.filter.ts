import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP-Error");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === "string") {
        message = errorResponse;
      } else if (typeof errorResponse === "object" && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        errors = (errorResponse as any).errors || null;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      // 处理数据库约束错误
      const error = exception as any;
      if (error.code === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        if (error.sqlMessage?.includes("'users.uk_email'")) {
          message = "邮箱已被使用，请联系管理员处理或使用其他邮箱地址";
        } else if (error.sqlMessage?.includes("'users.uk_username'")) {
          message = "用户名已被使用，请联系管理员处理或使用其他用户名";
        } else {
          message = "数据重复，请检查输入信息或联系管理员";
        }
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "数据库操作失败";
      }

      // 记录数据库错误详情
      this.logger.error(
        `🚨 Database Error: ${error.message}`,
        error.stack
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";

      // 记录未处理的异常
      this.logger.error(
        `🚨 Unhandled Exception: ${(exception as Error).message}`,
        (exception as Error).stack
      );
    }

    // 记录错误信息
    const errorLog = {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get("User-Agent"),
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `❌ ${request.method} ${request.url} - ${status} - ${message}`,
      JSON.stringify(errorLog, null, 2)
    );

    const responseBody = {
      code: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(responseBody);
  }
}
