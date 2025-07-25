import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import {
  UserResponseDto,
  UserListResponseDto,
  MessageResponseDto,
} from "../../common/dto/responses.dto";

import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { TeamMembersResponseDto } from "./dto/team-member.dto";
import { EvaluationStatsQueryDto, EvaluationStatsResponseDto } from "./dto/evaluation-stats.dto";
import { AssessmentsHistoryQueryDto, AssessmentsHistoryResponseDto } from "./dto/assessments-history.dto";

@ApiTags("用户管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "创建用户" })
  @ApiResponse({ status: 201, description: "创建成功", type: UserResponseDto })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @Roles("admin")
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: "获取用户列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserListResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({ summary: "获取领导用户列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserListResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @Get("leaders/list")
  getLeaders() {
    return this.usersService.getLeaders();
  }

  @ApiOperation({ summary: "获取团队成员列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: TeamMembersResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @Roles("leader", "boss")
  @UseGuards(RolesGuard)
  @Get("team-members")
  getTeamMembers(@Request() req) {
    return this.usersService.getTeamMembers(req.user.id);
  }

  @ApiOperation({ summary: "获取员工评估统计" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: EvaluationStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("leader", "boss", "admin")
  @UseGuards(RolesGuard)
  @Get(":userId/evaluation-stats")
  getEvaluationStats(
    @Param("userId") userId: string,
    @Query() query: EvaluationStatsQueryDto
  ) {
    return this.usersService.getEvaluationStats(+userId, query);
  }

  @ApiOperation({ summary: "获取员工考核历史" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: AssessmentsHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("leader", "boss", "admin")
  @UseGuards(RolesGuard)
  @Get(":userId/assessments-history")
  getAssessmentsHistory(
    @Param("userId") userId: string,
    @Query() query: AssessmentsHistoryQueryDto
  ) {
    return this.usersService.getAssessmentsHistory(+userId, query);
  }

  @ApiOperation({ summary: "获取用户详情" })
  @ApiResponse({ status: 200, description: "获取成功", type: UserResponseDto })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(+id);
  }

  @ApiOperation({ summary: "更新用户信息" })
  @ApiResponse({ status: 200, description: "更新成功", type: UserResponseDto })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("admin")
  @UseGuards(RolesGuard)
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @ApiOperation({ summary: "删除用户" })
  @ApiResponse({
    status: 200,
    description: "删除成功",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("admin")
  @UseGuards(RolesGuard)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
  }

  @ApiOperation({ summary: "重置用户密码" })
  @ApiResponse({
    status: 200,
    description: "重置成功",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("admin")
  @UseGuards(RolesGuard)
  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body() resetPasswordDto: ResetPasswordDto
  ) {
    return this.usersService.resetPassword(+id, resetPasswordDto.password);
  }

  @ApiOperation({ summary: "切换用户状态" })
  @ApiResponse({
    status: 200,
    description: "切换成功",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @Roles("admin")
  @UseGuards(RolesGuard)
  @Post(":id/toggle-status")
  toggleStatus(@Param("id") id: string) {
    return this.usersService.toggleStatus(+id);
  }
}
