import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from "@nestjs/swagger";
import { StatisticsService } from "./statistics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { StatisticsQueryDto } from "./dto/statistics-query.dto";

@ApiTags("统计分析")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "获取仪表板统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getDashboard(@CurrentUser() user: any) {
    return this.statisticsService.getDashboard();
  }

  @Get("assessments")
  @ApiOperation({ summary: "获取考核统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getAssessmentStatistics(@Query() query: StatisticsQueryDto, @CurrentUser() user: any) {
    return this.statisticsService.getAssessmentStatistics(query);
  }

  @Get("users")
  @ApiOperation({ summary: "获取用户统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getUserStatistics(@Query() query: StatisticsQueryDto, @CurrentUser() user: any) {
    return this.statisticsService.getUserStatistics(query);
  }

  @Get("departments")
  @ApiOperation({ summary: "获取部门统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getDepartmentStatistics(@CurrentUser() user: any) {
    return this.statisticsService.getDepartmentStatistics();
  }

  @Get("okrs")
  @ApiOperation({ summary: "获取OKR统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getOkrStatistics(@Query() query: StatisticsQueryDto, @CurrentUser() user: any) {
    return this.statisticsService.getOkrStatistics(query);
  }

  @Get("evaluations")
  @ApiOperation({ summary: "获取评估统计数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getEvaluationStatistics(@Query() query: StatisticsQueryDto, @CurrentUser() user: any) {
    return this.statisticsService.getEvaluationStatistics(query);
  }

  @Get("trends")
  @ApiOperation({ summary: "获取绩效趋势数据" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Roles("boss", "admin")
  getPerformanceTrends(@Query() query: StatisticsQueryDto, @CurrentUser() user: any) {
    return this.statisticsService.getPerformanceTrends(query);
  }
}
